"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, X } from "lucide-react";

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export default function PatientAutocomplete({
  patients = [],
  value = "",
  onChange,
  label = "Patient",
  placeholder = "Search name, ID or mobile...",
  required = false,
  disabled = false,
}) {
  const ref = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] =
    useState(-1);

  const selected = useMemo(
    () =>
      patients.find(
        (patient) => patient.id === value,
      ) || null,
    [patients, value],
  );

  useEffect(() => {
    if (selected) {
      setQuery(selected.fullName || "");
    } else if (!value) {
      setQuery("");
    }
  }, [selected, value]);

  const results = useMemo(() => {
    const search = normalize(query);

    if (!search) return [];

    return patients
      .filter((patient) =>
        normalize(
          [
            patient.fullName,
            patient.patientCode,
            patient.mobile,
            patient.whatsapp,
            patient.category,
            patient.city,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(search),
      )
      .sort((a, b) => {
        const aStarts = normalize(
          a.fullName,
        ).startsWith(search);

        const bStarts = normalize(
          b.fullName,
        ).startsWith(search);

        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1;
        }

        return String(
          a.fullName || "",
        ).localeCompare(
          String(b.fullName || ""),
        );
      })
      .slice(0, 8);
  }, [patients, query]);

  useEffect(() => {
    function close(event) {
      if (
        ref.current &&
        !ref.current.contains(event.target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", close);

    return () =>
      document.removeEventListener(
        "mousedown",
        close,
      );
  }, []);

  function choose(patient) {
    setQuery(patient.fullName || "");
    onChange?.(patient.id, patient);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clear() {
    setQuery("");
    onChange?.("", null);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!open || !results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(
          current + 1,
          results.length - 1,
        ),
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.max(current - 1, 0),
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();

      choose(
        results[
          activeIndex >= 0
            ? activeIndex
            : 0
        ],
      );
    }
  }

  return (
    <label
      ref={ref}
      className="relative block text-sm font-medium text-slate-700"
    >
      {label}

      <div className={`relative ${label ? "mt-2" : ""}`}>
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={query}
          required={required}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);

            if (value) {
              onChange?.("", null);
            }
          }}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
        />

        {(query || value) && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            aria-label="Clear patient"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {results.length ? (
            results.map(
              (patient, index) => (
                <button
                  key={patient.id}
                  type="button"
                  onMouseDown={(event) =>
                    event.preventDefault()
                  }
                  onClick={() =>
                    choose(patient)
                  }
                  className={`block w-full rounded-lg px-3.5 py-2.5 text-left ${
                    activeIndex === index
                      ? "bg-indigo-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-800">
                    {patient.fullName}
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    {[
                      patient.patientCode,
                      patient.mobile,
                      patient.category,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              ),
            )
          ) : (
            <p className="p-4 text-center text-sm text-slate-400">
              No patient found
            </p>
          )}
        </div>
      )}
    </label>
  );
}
