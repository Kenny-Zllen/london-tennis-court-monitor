import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchVenueSnapshot,
  fetchVenueSnapshotDates,
  fetchVenues,
} from "../api/finsburyApi.js";
import {
  defaultFinsburySnapshot,
  finsburySnapshots,
} from "../data/finsburySnapshots/index.js";
import SystemStatus from "./SystemStatus.jsx";

const fallbackVenueOptions = [
  {
    id: "finsbury-park",
    name: "Finsbury Park",
    bookingPlatform: "ClubSpark",
    officialBookingUrl: "https://clubspark.lta.org.uk/FinsburyPark/Booking",
    snapshotSupported: true,
  },
  {
    id: "lee-valley",
    name: "Lee Valley Hockey and Tennis Centre",
    bookingPlatform: "Better",
    officialBookingUrl:
      "https://bookings.better.org.uk/location/lee-valley-hockey-and-tennis-centre/tennis-court-outdoor",
    snapshotSupported: true,
  },
];

const commonStatusOrder = ["Available", "Booked", "Unavailable", "Closed"];

const statusStyles = {
  Available: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Booked: "bg-slate-100 text-slate-700 ring-slate-200",
  Unavailable: "bg-amber-100 text-amber-800 ring-amber-200",
  Closed: "bg-rose-100 text-rose-800 ring-rose-200",
};

function formatDateLabel(dateString) {
  if (!dateString) {
    return "No date";
  }

  const [year, month, day] = dateString.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatLastChecked(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(date);
}

function getCourtNumber(groupName) {
  return Number(groupName.match(/\d+/)?.[0] || 999);
}

function getStartMinutes(timeRange = "99:99") {
  const [hours = "99", minutes = "99"] = timeRange
    .split(" - ")[0]
    .split(":");

  return Number(hours) * 60 + Number(minutes);
}

function getGroupName(record, venueId) {
  if (record.court) {
    return record.court;
  }

  if (record.activity) {
    return record.activity;
  }

  return venueId === "lee-valley" ? "Outdoor Court Hire" : "Snapshot records";
}

function getStaticFinsburySnapshot(date) {
  return (
    finsburySnapshots.find((snapshot) => snapshot.date === date) ||
    defaultFinsburySnapshot
  );
}

function buildFinsburyFallbackPayload(date = defaultFinsburySnapshot.date) {
  const snapshot = getStaticFinsburySnapshot(date);

  return {
    date: snapshot.date,
    label: snapshot.label,
    meta: snapshot.meta,
    data: snapshot.data,
  };
}

function buildEmptyPayload(venue, date = "") {
  return {
    date,
    label: date ? formatDateLabel(date) : "No cached dates",
    meta: {
      venueId: venue.id,
      venueName: venue.name,
      checkedDate: date,
      lastCheckedAt: "",
      isLive: false,
      disclaimer:
        "Cached snapshot data only. Not live availability. Always confirm and book through the official venue booking page.",
      bookingUrl: venue.officialBookingUrl,
    },
    data: [],
  };
}

function getOfficialBookingUrl(venue, meta) {
  return meta.bookingUrl || venue.officialBookingUrl || "#";
}

function FinsburySnapshot() {
  const [venueOptions, setVenueOptions] = useState(fallbackVenueOptions);
  const [selectedVenueId, setSelectedVenueId] = useState("finsbury-park");
  const [selectedDate, setSelectedDate] = useState(defaultFinsburySnapshot.date);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [snapshotOptions, setSnapshotOptions] = useState(
    finsburySnapshots.map(({ date, label }) => ({ date, label })),
  );
  const [snapshotPayload, setSnapshotPayload] = useState(
    buildFinsburyFallbackPayload(),
  );
  const [dataSource, setDataSource] = useState("static");
  const [backendConnected, setBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedVenue =
    venueOptions.find((venue) => venue.id === selectedVenueId) ||
    fallbackVenueOptions[0];
  const snapshotRecords = snapshotPayload.data || [];
  const snapshotMeta = snapshotPayload.meta;
  const isLeeValley = selectedVenueId === "lee-valley";

  async function loadBackendSnapshotForVenue(venue) {
    const dates = await fetchVenueSnapshotDates(venue.id);

    if (dates.length === 0) {
      return {
        options: [],
        payload: buildEmptyPayload(venue),
        selectedDate: "",
        notice:
          "No cached dates for this venue yet. A protected backend refresh is required before records can be displayed.",
      };
    }

    const latestDate = dates[dates.length - 1];
    const backendSnapshot = await fetchVenueSnapshot(venue.id, latestDate);

    return {
      options: dates.map((date) => ({
        date,
        label: formatDateLabel(date),
      })),
      payload: {
        date: latestDate,
        label: formatDateLabel(latestDate),
        meta: {
          ...backendSnapshot.meta,
          bookingUrl: venue.officialBookingUrl,
        },
        data: backendSnapshot.records || [],
      },
      selectedDate: latestDate,
      notice: "",
    };
  }

  function applyFinsburyFallback(message) {
    const fallbackPayload = buildFinsburyFallbackPayload();

    setSnapshotOptions(
      finsburySnapshots.map(({ date, label }) => ({ date, label })),
    );
    setSnapshotPayload(fallbackPayload);
    setSelectedVenueId("finsbury-park");
    setSelectedDate(fallbackPayload.date);
    setSelectedGroup("All");
    setSelectedStatus("All");
    setDataSource("static");
    setNotice(message);
  }

  function applyNoStaticFallback(venue, message) {
    setSnapshotOptions([]);
    setSnapshotPayload(buildEmptyPayload(venue));
    setSelectedDate("");
    setSelectedGroup("All");
    setSelectedStatus("All");
    setDataSource("static");
    setNotice(message);
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialSnapshot() {
      setIsLoading(true);

      try {
        const venues = await fetchVenues();
        const supportedVenues = venues.filter((venue) => venue.snapshotSupported);
        const nextVenueOptions =
          supportedVenues.length > 0 ? supportedVenues : fallbackVenueOptions;
        const initialVenue =
          nextVenueOptions.find((venue) => venue.id === "finsbury-park") ||
          nextVenueOptions[0];
        const backendResult = await loadBackendSnapshotForVenue(initialVenue);

        if (isCancelled) {
          return;
        }

        setVenueOptions(nextVenueOptions);
        setSelectedVenueId(initialVenue.id);
        setSnapshotOptions(backendResult.options);
        setSnapshotPayload(backendResult.payload);
        setSelectedDate(backendResult.selectedDate);
        setSelectedGroup("All");
        setSelectedStatus("All");
        setDataSource("backend");
        setBackendConnected(true);
        setNotice(backendResult.notice);
      } catch {
        if (isCancelled) {
          return;
        }

        setVenueOptions(fallbackVenueOptions);
        setBackendConnected(false);
        applyFinsburyFallback("Backend unavailable, using static fallback.");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadInitialSnapshot();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleVenueChange(venueId) {
    const venue =
      venueOptions.find((option) => option.id === venueId) ||
      fallbackVenueOptions.find((option) => option.id === venueId);

    setSelectedVenueId(venueId);
    setSelectedGroup("All");
    setSelectedStatus("All");

    if (!venue) {
      return;
    }

    if (!backendConnected) {
      if (venue.id === "finsbury-park") {
        applyFinsburyFallback("Backend unavailable, using static fallback.");
      } else {
        applyNoStaticFallback(
          venue,
          "Backend unavailable and no static fallback is available for this venue.",
        );
      }

      return;
    }

    setIsLoading(true);

    try {
      const backendResult = await loadBackendSnapshotForVenue(venue);

      setSnapshotOptions(backendResult.options);
      setSnapshotPayload(backendResult.payload);
      setSelectedDate(backendResult.selectedDate);
      setDataSource("backend");
      setNotice(backendResult.notice);
    } catch {
      setBackendConnected(false);

      if (venue.id === "finsbury-park") {
        applyFinsburyFallback("Backend unavailable, using static fallback.");
      } else {
        applyNoStaticFallback(
          venue,
          "Backend unavailable and no static fallback is available for this venue.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDateChange(date) {
    setSelectedDate(date);
    setSelectedGroup("All");
    setSelectedStatus("All");

    if (dataSource !== "backend") {
      const staticSnapshot = getStaticFinsburySnapshot(date);
      setSnapshotPayload(staticSnapshot);
      return;
    }

    setIsLoading(true);

    try {
      const backendSnapshot = await fetchVenueSnapshot(selectedVenueId, date);

      setSnapshotPayload({
        date,
        label: formatDateLabel(date),
        meta: {
          ...backendSnapshot.meta,
          bookingUrl: selectedVenue.officialBookingUrl,
        },
        data: backendSnapshot.records || [],
      });
      setNotice("");
    } catch {
      if (selectedVenueId === "finsbury-park") {
        const fallbackSnapshot = getStaticFinsburySnapshot(date);

        setSnapshotOptions(
          finsburySnapshots.map(({ date: itemDate, label }) => ({
            date: itemDate,
            label,
          })),
        );
        setSnapshotPayload(fallbackSnapshot);
        setSelectedDate(fallbackSnapshot.date);
        setBackendConnected(false);
        setDataSource("static");
        setNotice("Backend unavailable, using static fallback.");
      } else {
        setBackendConnected(false);
        applyNoStaticFallback(
          selectedVenue,
          "Backend unavailable and no static fallback is available for this venue.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  const sortedSlots = useMemo(
    () =>
      [...snapshotRecords].sort((first, second) => {
        const firstGroup = getGroupName(first, selectedVenueId);
        const secondGroup = getGroupName(second, selectedVenueId);
        const groupCompare = firstGroup.localeCompare(secondGroup, "en", {
          numeric: true,
        });

        if (first.court && second.court) {
          return (
            getCourtNumber(firstGroup) - getCourtNumber(secondGroup) ||
            getStartMinutes(first.timeRange) - getStartMinutes(second.timeRange)
          );
        }

        return (
          groupCompare ||
          getStartMinutes(first.timeRange) - getStartMinutes(second.timeRange)
        );
      }),
    [snapshotRecords, selectedVenueId],
  );

  const groupOptions = useMemo(
    () => [...new Set(sortedSlots.map((slot) => getGroupName(slot, selectedVenueId)))],
    [sortedSlots, selectedVenueId],
  );

  const statusOptions = useMemo(() => {
    const statuses = [...new Set(sortedSlots.map((slot) => slot.status))].filter(
      Boolean,
    );
    const orderedStatuses = commonStatusOrder.filter((status) =>
      statuses.includes(status),
    );
    const otherStatuses = statuses.filter(
      (status) => !commonStatusOrder.includes(status),
    );

    return ["All", ...orderedStatuses, ...otherStatuses];
  }, [sortedSlots]);

  const filteredSlots = sortedSlots.filter((slot) => {
    const groupName = getGroupName(slot, selectedVenueId);
    const matchesStatus =
      selectedStatus === "All" || slot.status === selectedStatus;
    const matchesGroup = selectedGroup === "All" || groupName === selectedGroup;

    return matchesStatus && matchesGroup;
  });

  const summaryItems = statusOptions
    .filter((status) => status !== "All")
    .map((status) => ({
      label: status,
      value: sortedSlots.filter((slot) => slot.status === status).length,
      status,
    }));

  const groupedSlots = groupOptions
    .map((group) => ({
      group,
      slots: filteredSlots.filter(
        (slot) => getGroupName(slot, selectedVenueId) === group,
      ),
    }))
    .filter((group) => group.slots.length > 0);

  const groupFilterLabel = isLeeValley ? "Activity" : "Court";
  const allGroupsLabel = isLeeValley ? "All activities" : "All courts";
  const bookingPlatformName =
    selectedVenue.bookingPlatform === "Better" ? "Better" : "official venue page";
  const officialBookingUrl = getOfficialBookingUrl(selectedVenue, snapshotMeta);

  return (
    <section
      className="border-t border-slate-200 bg-slate-50"
      id="finsbury-snapshot"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Cached venue snapshots
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Multi-Venue Snapshot Dashboard
            </h2>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
              Cached snapshot data only. Not live availability. Always confirm
              and book through the official venue booking page.
              {isLeeValley &&
                " Lee Valley bookings may require a Better account even when slot visibility is public."}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Source:{" "}
                {dataSource === "backend"
                  ? "FastAPI cached backend"
                  : "Static frontend fallback"}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                Selected venue: {selectedVenue.name}
              </span>
              {notice && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                  {notice}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 text-sm lg:w-80">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
              href={officialBookingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open official {selectedVenue.bookingPlatform || ""} page
            </a>
          </div>
        </div>

        <div className="mt-6">
          <SystemStatus
            backendConnected={backendConnected && dataSource === "backend"}
            dataSource={dataSource}
            lastCheckedAt={formatLastChecked(snapshotMeta.lastCheckedAt)}
            recordCount={sortedSlots.length}
            selectedDate={selectedDate}
            selectedVenue={selectedVenue.name}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="rounded-lg border border-slate-200 bg-white p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Venue
            </span>
            <select
              className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={selectedVenueId}
              onChange={(event) => handleVenueChange(event.target.value)}
            >
              {venueOptions.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-lg border border-slate-200 bg-white p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Snapshot date
            </span>
            <select
              className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              value={selectedDate}
              onChange={(event) => handleDateChange(event.target.value)}
              disabled={snapshotOptions.length === 0}
            >
              {snapshotOptions.length > 0 ? (
                snapshotOptions.map((snapshot) => (
                  <option key={snapshot.date} value={snapshot.date}>
                    {snapshot.label}
                  </option>
                ))
              ) : (
                <option value="">No cached dates</option>
              )}
            </select>
          </label>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last generated
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {formatLastChecked(snapshotMeta.lastCheckedAt)}
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
              Live status
            </p>
            <p className="mt-2 text-sm font-semibold text-rose-800">
              {snapshotMeta.isLive ? "Live" : "Not live"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total records
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {sortedSlots.length}
            </p>
          </div>
          {summaryItems.map((item) => (
            <div
              className="rounded-lg border border-slate-200 bg-white p-4"
              key={item.label}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  item.status === "Available"
                    ? "text-emerald-800"
                    : item.status === "Unavailable"
                      ? "text-amber-800"
                      : item.status === "Closed"
                        ? "text-rose-800"
                        : "text-slate-950"
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Showing {filteredSlots.length} of {sortedSlots.length} cached
            records for {snapshotMeta.checkedDate || "the selected date"}.
            This is not live date switching. Always confirm on{" "}
            {bookingPlatformName}.
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
              {groupFilterLabel}
              <select
                className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
              >
                <option value="All">{allGroupsLabel}</option>
                {groupOptions.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {isLoading && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
            Loading snapshot...
          </div>
        )}

        {groupedSlots.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {groupedSlots.map((group) => (
              <details
                open
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                key={group.group}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3">
                  <h3 className="font-semibold text-slate-950">
                    {group.group}
                  </h3>
                  <span className="text-sm text-slate-600">
                    {group.slots.length} records
                  </span>
                </summary>

                <div className="divide-y divide-slate-100">
                  {group.slots.map((slot) => (
                    <div
                      className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]"
                      key={`${group.group}-${slot.timeRange}-${slot.status}-${slot.spaces ?? ""}`}
                    >
                      <div>
                        <span className="font-medium text-slate-800">
                          {slot.timeRange}
                        </span>
                        {isLeeValley && (
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Spaces: {slot.spaces ?? "Not shown"} · Price:{" "}
                            {slot.price || "Not shown"}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex h-fit w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
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
              {notice ||
                "Try changing the status or group filter, or generate a cached backend snapshot for this venue."}
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
            href={officialBookingUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open official {selectedVenue.bookingPlatform || ""} page
          </a>
        </div>
      </div>
    </section>
  );
}

export default FinsburySnapshot;
