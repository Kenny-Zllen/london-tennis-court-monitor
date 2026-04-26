import React from "react";

function formatValue(value) {
  return value || "Not available";
}

function SystemStatus({
  backendConnected,
  dataSource,
  lastCheckedAt,
  recordCount,
  selectedDate,
}) {
  const rows = [
    ["Frontend", "Vercel"],
    ["Backend API", backendConnected ? "Connected" : "Fallback mode"],
    [
      "Data source",
      dataSource === "backend"
        ? "FastAPI cached backend"
        : "Static frontend fallback",
    ],
    ["Snapshot mode", "Static cached data"],
    ["Live scraping", "Disabled"],
    ["Auto-booking", "Disabled"],
    ["Selected date", formatValue(selectedDate)],
    ["Records loaded", String(recordCount ?? 0)],
    ["Last checked", formatValue(lastCheckedAt)],
  ];

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            System status
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">
            Data source and safety
          </h3>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            backendConnected
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-amber-100 text-amber-900 ring-amber-200"
          }`}
        >
          {backendConnected
            ? "FastAPI cached backend"
            : "Backend unavailable — using static frontend fallback."}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div className="rounded-md bg-slate-50 p-3" key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        The production app does not scrape ClubSpark in real time. It displays
        cached snapshot data only.
      </p>
    </aside>
  );
}

export default SystemStatus;
