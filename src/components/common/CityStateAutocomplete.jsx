"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapPin } from "lucide-react";
import indiaLocations from "../../data/indiaLocations";

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export default function CityStateAutocomplete({
  city = "",
  state = "",
  onChange,
  disabled = false,
}) {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] =
    useState(-1);

  const suggestions = useMemo(() => {
    const query = normalize(city);

    if (query.length < 2) {
      return [];
    }

    return indiaLocations
      .filter((item) => {
        const cityValue = normalize(
          item.city,
        );
        const stateValue = normalize(
          item.state,
        );
        const combined =
          `${cityValue} ${stateValue}`;

        return (
          cityValue.includes(query) ||
          combined.includes(query)
        );
      })
      .sort((first, second) => {
        const firstStarts =
          normalize(first.city).startsWith(
            query,
          );
        const secondStarts =
          normalize(second.city).startsWith(
            query,
          );

        if (
          firstStarts !== secondStarts
        ) {
          return firstStarts ? -1 : 1;
        }

        return first.city.localeCompare(
          second.city,
        );
      })
      .slice(0, 8);
  }, [city]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target,
        )
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener(
      "mousedown",
      closeOnOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeOnOutsideClick,
      );
    };
  }, []);

  function selectLocation(location) {
    onChange?.({
      city: location.city,
      state: location.state,
    });

    setOpen(false);
    setActiveIndex(-1);
  }

  function handleCityChange(event) {
    const value = event.target.value;

    onChange?.({
      city: value,
      state,
    });

    setOpen(value.trim().length >= 2);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (
      !open ||
      !suggestions.length
    ) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveIndex((current) =>
        Math.min(
          current + 1,
          suggestions.length - 1,
        ),
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((current) =>
        Math.max(current - 1, 0),
      );
    }

    if (
      event.key === "Enter" &&
      activeIndex >= 0
    ) {
      event.preventDefault();

      selectLocation(
        suggestions[activeIndex],
      );
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <>
      <label
        ref={wrapperRef}
        className="relative block text-sm font-medium text-slate-700"
      >
        City

        <input
          name="city"
          value={city}
          disabled={disabled}
          autoComplete="address-level2"
          onChange={handleCityChange}
          onFocus={() => {
            if (
              city.trim().length >= 2
            ) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type city, e.g. Jaipur"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:opacity-60"
        />

        {open &&
          suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {suggestions.map(
                (location, index) => (
                  <button
                    key={`${location.city}-${location.state}`}
                    type="button"
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    onClick={() =>
                      selectLocation(
                        location,
                      )
                    }
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                      index === activeIndex
                        ? "bg-teal-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <MapPin
                      size={16}
                      className="shrink-0 text-teal-600"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {location.city}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {location.state},
                        India
                      </p>
                    </div>
                  </button>
                ),
              )}
            </div>
          )}
      </label>

      <label className="block text-sm font-medium text-slate-700">
        State

        <input
          name="state"
          value={state}
          disabled={disabled}
          autoComplete="address-level1"
          onChange={(event) =>
            onChange?.({
              city,
              state:
                event.target.value,
            })
          }
          placeholder="State auto-fills after city selection"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:opacity-60"
        />
      </label>
    </>
  );
}
