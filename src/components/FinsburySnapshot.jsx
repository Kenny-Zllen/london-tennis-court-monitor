import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchFinsburySnapshot,
  fetchFinsburySnapshotDates,
} from "../api/finsburyApi.js";
import {
  defaultFinsburySnapshot,
  finsburySnapshots,
} from "../data/finsburySnapshots/index.js";

const statusOptions = ["All", "Booked", "Unavailable", "Closed"];

const statusStyles = {
  Booked: "bg-slate-100 text-slate-700 ring-slate-200",
  Unavailable: "bg-amber-100 text-amber-800 ring-amber-200",
  Closed: "bg-rose-100 text-rose-800 ring-rose-200",
};

function formatDateLabel(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getCourtNumber(court) {
  return Number(court.match(/\d+/)?.[0] || 999);
}

function getStartMinutes(timeRange) {
  const [hours, minutes] = timeRange.split(" - ")[0].split(":").map(Number);
  return hours * 60 + minutes;
}

function formatLastChecked(value) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function FinsburySnapshot() {
  const staticSnapshots = useMemo(() => finsburySnapshots, []);
  const [selectedDate, setSelectedDate] = useState(
    defaultFinsburySnapshot.date,
  );
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedCourt, setSelectedCourt] = useState("All");
  const [snapshotOptions, setSnapshotOptions] = useState(staticSnapshots);
  const [snapshotPayload, setSnapshotPayload] = useState(defaultFinsburySnapshot);
  const [dataSource, setDataSource] = useState("static");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadBackendSnapshot() {
      setIsLoading(true);

      try {
        const dates = await fetchFinsburySnapshotDates();

        if (dates.length === 0) {
          throw new Error("No backend snapshot dates found.");
        }

        const latestDate = dates[dates.length - 1];
        const backendSnapshot = await fetchFinsburySnapshot(latestDate);

        if (isCancelled) {
          return;
        }

        setSnapshotOptions(
          dates.map((date) => ({
            date,
            label: formatDateLabel(date),
          })),
        );
        setSnapshotPayload({
          date: latestDate,
          label: formatDateLabel(latestDate),
          meta: backendSnapshot.meta,
          data: backendSnapshot.records,
        });
        setSelectedDate(latestDate);
        setSelectedCourt("All");
        setSelectedStatus("All");
        setDataSource("backend");
        setNotice("");
      } catch {
        if (isCancelled) {
          return;
        }

        setSnapshotOptions(staticSnapshots);
        setSnapshotPayload(defaultFinsburySnapshot);
        setSelectedDate(defaultFinsburySnapshot.date);
        setDataSource("static");
        setNotice("Backend unavailable, using static fallback.");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadBackendSnapshot();

    return () => {
      isCancelled = true;
    };
  }, [staticSnapshots]);

  async function handleDateChange(date) {
    setSelectedDate(date);
    setSelectedCourt("All");
    setSelectedStatus("All");

    if (dataSource === "backend") {
      setIsLoading(true);

      try {
        const backendSnapshot = await fetchFinsburySnapshot(date);

        setSnapshotPayload({
          date,
          label: formatDateLabel(date),
          meta: backendSnapshot.meta,
          data: backendSnapshot.records,
        });
        setNotice("");
      } catch {
        const fallbackSnapshot =
          staticSnapshots.find((snapshot) => snapshot.date === date) ||
          defaultFinsburySnapshot;

        setSnapshotOptions(staticSnapshots);
        setSnapshotPayload(fallbackSnapshot);
        setSelectedDate(fallbackSnapshot.date);
        setDataSource("static");
        setNotice("Backend unavailable, using static fallback.");
      } finally {
        setIsLoading(false);
      }

      return;
    }

    const staticSnapshot =
      staticSnapshots.find((snapshot) => snapshot.date === date) ||
      defaultFinsburySnapshot;
    setSnapshotPayload(staticSnapshot);
  }

  const finsburySnapshot = snapshotPayload.data;
  const finsburySnapshotMeta = snapshotPayload.meta;

  const sortedSlots = useMemo(
    () =>
      [...finsburySnapshot].sort(
        (first, second) =>
          getCourtNumber(first.court) - getCourtNumber(second.court) ||
          getStartMinutes(first.timeRange) - getStartMinutes(second.timeRange),
      ),
    [finsburySnapshot],
  );

  const courtOptions = useMemo(
    () => [...new Set(sortedSlots.map((slot) => slot.court))],
    [sortedSlots],
  );

  const filteredSlots = sortedSlots.filter((slot) => {
    const matchesStatus =
      selectedStatus === "All" || slot.status === selectedStatus;
    const matchesCourt = selectedCourt === "All" || slot.court === selectedCourt;

    return matchesStatus && matchesCourt;
  });

  const summaryCounts = statusOptions.slice(1).reduce(
    (counts, status) => ({
      ...counts,
      [status]: sortedSlots.filter((slot) => slot.status === status).length,
    }),
    {},
  );

  const groupedSlots = courtOptions
    .map((court) => ({
      court,
      slots: filteredSlots.filter((slot) => slot.court === court),
    }))
    .filter((group) => group.slots.length > 0);

  return (
    <section
      className="border-t border-slate-200 bg-slate-50"
      id="finsbury-snapshot"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Static snapshot
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Finsbury Park Experimental Snapshot
            </h2>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
              {finsburySnapshotMeta.disclaimer}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Source:{" "}
                {dataSource === "backend"
                  ? "FastAPI cached backend"
                  : "Static frontend fallback"}
              </span>
              {notice && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                  {notice}
                </span>
              )}
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
                {formatLastChecked(finsburySnapshotMeta.lastCheckedAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="rounded-lg border border-slate-200 bg-white p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Snapshot date
            </span>
            <select
              className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={selectedDate}
              onChange={(event) => handleDateChange(event.target.value)}
            >
              {snapshotOptions.map((snapshot) => (
                <option key={snapshot.date} value={snapshot.date}>
                  {snapshot.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Checked date
            </p>
            <p className="mt-2 font-semibold text-slate-950">
              {finsburySnapshotMeta.checkedDate}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Records parsed
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {sortedSlots.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Source
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              Local rendered-page investigation
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Live status
            </p>
            <p className="mt-2 text-sm font-semibold text-rose-800">
              {finsburySnapshotMeta.isLive ? "Live" : "Not live"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last generated
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {formatLastChecked(finsburySnapshotMeta.lastCheckedAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total parsed records
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {sortedSlots.length}
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
            Showing {filteredSlots.length} of {sortedSlots.length} parsed
            records for {finsburySnapshotMeta.checkedDate}. Some records may
            require manual validation. Only pre-generated static snapshot dates
            are available. This is not live date switching. Always confirm on
            ClubSpark.
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

        {groupedSlots.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {isLoading && (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 lg:col-span-2">
                Loading snapshot...
              </div>
            )}
            {groupedSlots.map((group) => (
              <details
                open
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                key={group.court}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3">
                  <h3 className="font-semibold text-slate-950">
                    {group.court}
                  </h3>
                  <span className="text-sm text-slate-600">
                    {group.slots.length} records
                  </span>
                </summary>

                <div className="divide-y divide-slate-100">
                  {group.slots.map((slot) => (
                    <div
                      className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-sm"
                      key={`${slot.court}-${slot.timeRange}-${slot.status}`}
                    >
                      <span className="font-medium text-slate-800">
                        {slot.timeRange}
                      </span>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          statusStyles[slot.status] ||
                          "bg-slate-100 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {slot.status}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
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
