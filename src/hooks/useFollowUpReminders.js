"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { getFollowUps } from "../services/clinicService";

const DEFAULT_POLL_INTERVAL = 60_000;
const DEFAULT_CLOCK_INTERVAL = 15_000;
const MIN_POLL_INTERVAL = 15_000;
const MIN_CLOCK_INTERVAL = 1_000;
const SESSION_STORAGE_PREFIX = "caretrack-follow-up-reminder-status:";

function intervalOrDefault(value, fallback, minimum) {
  const interval = Number(value);
  return Number.isFinite(interval) ? Math.max(interval, minimum) : fallback;
}

function toDueDate(value) {
  if (!value) return null;

  const dateValue = String(value).trim();
  if (!dateValue) return null;

  // A date-only follow-up remains due for that local calendar day.
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(`${dateValue}T23:59:59.999`)
    : new Date(dateValue);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameCalendarDay(firstDate, secondDate) {
  return firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate();
}

function getLiveStatus(followUp, now) {
  const sourceStatus = String(followUp?.status || "").trim().toLowerCase();

  if (["completed", "complete"].includes(sourceStatus)) return "Completed";
  if (["cancelled", "canceled"].includes(sourceStatus)) return "Cancelled";
  if (["missed", "overdue"].includes(sourceStatus)) return "Overdue";

  const dueAt = toDueDate(followUp?.dueDate || followUp?.dueAt);
  if (!dueAt) return "Upcoming";
  if (dueAt.getTime() < now.getTime()) return "Overdue";
  if (isSameCalendarDay(dueAt, now)) return "Today";
  return "Upcoming";
}

function getFollowUpId(followUp) {
  return followUp?.id || followUp?._id || followUp?.patientId;
}

function followUpPriority(followUp) {
  if (followUp.status === "Overdue") return 0;
  if (followUp.status === "Today") return 1;
  if (followUp.status === "Upcoming") return 2;
  return 3;
}

function sortForAttention(firstFollowUp, secondFollowUp) {
  const priorityDifference = followUpPriority(firstFollowUp) - followUpPriority(secondFollowUp);
  if (priorityDifference) return priorityDifference;

  const firstTime = toDueDate(firstFollowUp.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  const secondTime = toDueDate(secondFollowUp.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  return firstTime - secondTime;
}

function formatClock(value) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function readPreviousStatus(id) {
  if (typeof window === "undefined" || !id) return null;

  try {
    return window.sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${id}`);
  } catch {
    return null;
  }
}

function saveStatus(id, status) {
  if (typeof window === "undefined" || !id) return;

  try {
    window.sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${id}`, status);
  } catch {
    // Notifications remain useful even if browser storage is unavailable.
  }
}

/**
 * Polls follow-ups and derives their status against the browser's live clock.
 *
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] Set false until the authenticated layout is ready.
 * @param {number} [options.pollInterval=60000] Minimum 15 seconds.
 * @param {number} [options.clockInterval=15000] Minimum 1 second.
 * @returns {{
 *   followUps: Array<object>,
 *   attentionFollowUps: Array<object>,
 *   latestFollowUp: object | null,
 *   latestFollowUps: Array<object>,
 *   counts: { total: number, completed: number, cancelled: number, upcoming: number, today: number, overdue: number, needsAttention: number },
 *   status: { currentTime: Date, isLoading: boolean, error: Error | null, lastUpdated: Date | null, hasAttention: boolean },
 *   refresh: () => Promise<Array<object>>
 * }}
 */
export default function useFollowUpReminders({
  enabled = true,
  pollInterval = DEFAULT_POLL_INTERVAL,
  clockInterval = DEFAULT_CLOCK_INTERVAL,
} = {}) {
  const [followUps, setFollowUps] = useState([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const isMounted = useRef(false);
  const requestNumber = useRef(0);
  const rememberedStatuses = useRef(new Map());

  const resolvedPollInterval = intervalOrDefault(pollInterval, DEFAULT_POLL_INTERVAL, MIN_POLL_INTERVAL);
  const resolvedClockInterval = intervalOrDefault(clockInterval, DEFAULT_CLOCK_INTERVAL, MIN_CLOCK_INTERVAL);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return [];

    const requestId = requestNumber.current + 1;
    requestNumber.current = requestId;

    if (isMounted.current) setIsLoading(true);

    try {
      const nextFollowUps = await getFollowUps();
      const normalizedFollowUps = Array.isArray(nextFollowUps) ? nextFollowUps : [];

      if (isMounted.current && requestNumber.current === requestId) {
        setFollowUps(normalizedFollowUps);
        setError(null);
        setLastUpdated(new Date());
      }

      return normalizedFollowUps;
    } catch (loadError) {
      if (isMounted.current && requestNumber.current === requestId) {
        setError(loadError instanceof Error ? loadError : new Error("Unable to load follow-up reminders."));
      }

      return [];
    } finally {
      if (isMounted.current && requestNumber.current === requestId) setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }

    void refresh();

    const poll = () => {
      if (document.visibilityState !== "hidden") void refresh();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    const intervalId = window.setInterval(poll, resolvedPollInterval);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [enabled, refresh, resolvedPollInterval]);

  useEffect(() => {
    if (!enabled) return undefined;

    const updateClock = () => setCurrentTime(new Date());
    updateClock();

    const intervalId = window.setInterval(updateClock, resolvedClockInterval);
    const updateClockWhenVisible = () => {
      if (document.visibilityState === "visible") updateClock();
    };

    document.addEventListener("visibilitychange", updateClockWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updateClockWhenVisible);
    };
  }, [enabled, resolvedClockInterval]);

  const liveFollowUps = useMemo(() => (
    followUps.map((followUp) => ({
      ...followUp,
      sourceStatus: followUp.status,
      dueDate: followUp.dueDate || followUp.dueAt || null,
      status: getLiveStatus(followUp, currentTime),
    }))
  ), [currentTime, followUps]);

  const attentionFollowUps = useMemo(() => (
    liveFollowUps
      .filter((followUp) => ["Today", "Overdue"].includes(followUp.status))
      .sort(sortForAttention)
  ), [liveFollowUps]);

  const counts = useMemo(() => {
    const nextCounts = {
      total: liveFollowUps.length,
      completed: 0,
      cancelled: 0,
      upcoming: 0,
      today: 0,
      overdue: 0,
      needsAttention: 0,
    };

    liveFollowUps.forEach((followUp) => {
      const countKey = followUp.status.toLowerCase();
      if (Object.hasOwn(nextCounts, countKey)) nextCounts[countKey] += 1;
    });

    nextCounts.needsAttention = nextCounts.today + nextCounts.overdue;
    return nextCounts;
  }, [liveFollowUps]);

  useEffect(() => {
    if (!enabled) return;

    liveFollowUps.forEach((followUp) => {
      const id = getFollowUpId(followUp);
      if (!id) return;

      const previousStatus = rememberedStatuses.current.has(id)
        ? rememberedStatuses.current.get(id)
        : readPreviousStatus(id);
      const hasStatusTransition = previousStatus !== followUp.status;

      if (hasStatusTransition && ["Today", "Overdue"].includes(followUp.status)) {
        const patientName = followUp.patientName || "A patient";
        const dueAt = toDueDate(followUp.dueDate);

        if (followUp.status === "Overdue") {
          toast.error(`${patientName}'s follow-up is overdue as of ${formatClock(currentTime)}.`, {
            id: `follow-up-reminder-${id}-overdue`,
            duration: 8_000,
          });
        } else {
          toast(`${patientName}'s follow-up is due today${dueAt ? ` at ${formatClock(dueAt)}` : ""}.`, {
            id: `follow-up-reminder-${id}-today`,
            duration: 6_000,
          });
        }
      }

      rememberedStatuses.current.set(id, followUp.status);
      saveStatus(id, followUp.status);
    });
  }, [currentTime, enabled, liveFollowUps]);

  const status = useMemo(() => ({
    currentTime,
    isLoading,
    error,
    lastUpdated,
    hasAttention: counts.needsAttention > 0,
  }), [counts.needsAttention, currentTime, error, isLoading, lastUpdated]);

  return {
    followUps: liveFollowUps,
    attentionFollowUps,
    latestFollowUp: attentionFollowUps[0] || liveFollowUps[0] || null,
    latestFollowUps: liveFollowUps.slice(0, 5),
    counts,
    status,
    refresh,
  };
}
