"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export default function SearchableSelect({
  label,
  value = "",
  options = [],
  onChange,
  placeholder = "Type to search...",
  disabled = false,
  required = false,
  strict = true,
  fallbackValue = "",
  minChars = 1,
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const normalizedOptions = useMemo(
    () =>
      options
        .map((option) =>
          typeof option === "string"
            ? {
                value: option,
                label: option,
                meta: "",
                keywords: option,
                raw: option,
              }
            : {
                value: String(
                  option?.value ??
                    option?.id ??
                    option?.label ??
                    "",
                ),
                label: String(
                  option?.label ??
                    option?.value ??
                    "",
                ),
                meta: String(option?.meta || ""),
                keywords: String(
                  option?.keywords || "",
                ),
                raw: option,
              },
        )
        .filter((option) => option.value),
    [options],
  );

  const suggestions = useMemo(() => {
    const query = normalize(value);

    if (query.length < minChars) return [];

    return normalizedOptions
      .filter((option) =>
        normalize(
          `${option.label} ${option.meta} ${option.keywords}`,
        ).includes(query),
      )
      .sort((a, b) => {
        const aStarts = normalize(
          a.label,
        ).startsWith(query);

        const bStarts = normalize(
          b.label,
        ).startsWith(query);

        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1;
        }

        return a.label.localeCompare(
          b.label,
        );
      })
      .slice(0, 8);
  }, [minChars, normalizedOptions, value]);

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

  function choose(option) {
    onChange?.(option.value, option.raw);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!open || !suggestions.length) return;

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

    if (event.key === "Enter") {
      event.preventDefault();
      choose(
        suggestions[
          activeIndex >= 0
            ? activeIndex
            : 0
        ],
      );
    }
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (strict) {
        const exact =
          normalizedOptions.find(
            (option) =>
              normalize(option.value) ===
              normalize(value),
          );

        if (!exact) {
          onChange?.(fallbackValue);
        }
      }

      setOpen(false);
      setActiveIndex(-1);
    }, 120);
  }

  return (
    <label
      ref={ref}
      className="relative block text-sm font-medium text-slate-700"
    >
      {label}

      <input
        value={value}
        required={required}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          onChange?.(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
      />

      {open &&
        value.trim().length >= minChars && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
            {suggestions.length ? (
              suggestions.map(
                (option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    onClick={() =>
                      choose(option)
                    }
                    className={`block w-full rounded-lg px-3.5 py-2.5 text-left transition ${
                      activeIndex === index
                        ? "bg-indigo-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-slate-700">
                      {option.label}
                    </span>

                    {option.meta && (
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {option.meta}
                      </span>
                    )}
                  </button>
                ),
              )
            ) : (
              <p className="px-4 py-3 text-sm text-slate-400">
                No matching option
              </p>
            )}
          </div>
        )}
    </label>
  );
}
