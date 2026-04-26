import React from "react";
import { useMemo, useState } from "react";
import {
  finsburySnapshot,
  finsburySnapshotMeta,
} from "../data/finsburySnapshot.js";

const statusOptions = ["All", "Booked", "Unavailable", "Closed"];

const statusStyles = {
  Booked: "bg-slate-100 text-slate-700 ring-slate-200",
  Unavailable: "bg-amber-100 text-amber-800 ring-amber-200",
  Closed: "bg-rose-100 text-rose-800 ring-rose-200",
};

function FinsburySnapshot() {
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedCourt, setSelectedCourt] = useState("All");

  const courtOptions = useMemo(
    () => [...new Set(finsburySnapshot.map((slot) => slot.court))],
    [],
  );

  const filteredSlots = finsburySnapshot.filter((slot) => {
    const matchesStatus =
      selectedStatus === "All" || slot.status === selectedStatus;
    const matchesCourt = selectedCourt === "All" || slot.court === selectedCourt;

    return matchesStatus && matchesCourt;
  });

  const summaryCounts = statusOptions.slice(1).reduce(
    (counts, status) => ({
      ...counts,
      [status]: filteredSlots.filter((slot) => slot.status === status).length,
    }),
    {},
  );

  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              MVP v2 experiment
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Experimental Finsbury Park Snapshot
            </h2>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
              Static investigation snapshot — not live availability. Always
              confirm and book through ClubSpark.
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
              href={finsburySnapshotMeta.bookingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open official ClubSpark page
            </a>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-950">Last checked</p>
            <p className="mt-1 text-slate-600">
              {finsburySnapshotMeta.lastChecked}
            </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total slots shown
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {filteredSlots.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Booked
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {summaryCounts.Booked}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unavailable
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-800">
              {summaryCounts.Unavailable}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Closed
            </p>
            <p className="mt-2 text-2xl font-bold text-rose-800">
              {summaryCounts.Closed}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            This snapshot is based on a manually reviewed local investigation
            sample. It may be incomplete or outdated.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Court
            <select
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={selectedCourt}
              onChange={(event) => setSelectedCourt(event.target.value)}
            >
              <option value="All">All courts</option>
              {courtOptions.map((court) => (
                <option key={court} value={court}>
                  {court}
                </option>
              ))}
            </select>
          </label>
          </div>
        </div>

        {filteredSlots.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSlots.map((slot) => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  key={`${slot.court}-${slot.timeRange}-${slot.status}`}
                >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {slot.court}
                    </p>
                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {slot.timeRange}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                      statusStyles[slot.status] ||
                      "bg-slate-100 text-slate-700 ring-slate-200"
                    }`}
                  >
                    {slot.status}
                  </span>
                </div>
              </article>
              ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <h3 className="text-lg font-semibold text-slate-950">
                No snapshot records found
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Try changing the status or court filter.
              </p>
            </div>
        )}

        <div className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-600">
            This experimental snapshot is for discovery only. Confirm details on
            the official page before booking.
          </p>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            href={finsburySnapshotMeta.bookingUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open official ClubSpark page
          </a>
        </div>
      </div>
    </section>
  );
}

export default FinsburySnapshot;
