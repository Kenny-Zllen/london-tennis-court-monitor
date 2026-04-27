import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VENUE_SLUG = "lee-valley-hockey-and-tennis-centre";
const ACTIVITY_SLUG = "tennis-court-outdoor";
const OUTPUT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "investigation-output",
);

function parseDateArgument() {
  const arg = process.argv.find((value) => value.startsWith("--date="));

  if (arg) {
    const date = arg.slice("--date=".length);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Invalid --date value: ${date}. Use YYYY-MM-DD.`);
    }

    return date;
  }

  return new Date().toISOString().slice(0, 10);
}

function buildApiUrl(date) {
  return (
    `https://better-admin.org.uk/api/activities/venue/${VENUE_SLUG}` +
    `/activity/${ACTIVITY_SLUG}/times?date=${date}`
  );
}

function buildRefererUrl(date) {
  return (
    `https://bookings.better.org.uk/location/${VENUE_SLUG}/${ACTIVITY_SLUG}` +
    `/${date}/by-time`
  );
}

function getRecordsFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    for (const key of ["data", "results", "times"]) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }
  }

  return [];
}

function getTimeValue(record, field) {
  const value = record[field];

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && value.format_24_hour) {
    return value.format_24_hour;
  }

  return "Unknown";
}

function getSourceStatus(record) {
  const action = record.action_to_show;

  if (action && typeof action === "object" && action.status) {
    return action.status;
  }

  return record.status || "Unknown";
}

function mapStatus(record) {
  const spaces = Number(record.spaces || 0);
  const sourceStatus = String(getSourceStatus(record)).toUpperCase();

  if (spaces > 0 && sourceStatus === "BOOK") {
    return "Available";
  }

  if (spaces === 0) {
    return "Unavailable";
  }

  return "Unavailable";
}

function normalizeRecord(record) {
  const startTime = getTimeValue(record, "starts_at");
  const endTime = getTimeValue(record, "ends_at");
  const price = (record.price && record.price.formatted_amount) || "Unknown";

  return {
    venue: "Lee Valley Hockey and Tennis Centre",
    activity: "Outdoor Court Hire",
    timeRange: `${startTime} - ${endTime}`,
    status: mapStatus(record),
    spaces: Number(record.spaces || 0),
    price,
    sourceStatus: getSourceStatus(record),
    confidence: "high",
  };
}

async function main() {
  const date = parseDateArgument();
  const url = buildApiUrl(date);
  const headers = {
    Accept: "application/json",
    Origin: "https://bookings.better.org.uk",
    Referer: buildRefererUrl(date),
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
  };

  console.log(`Fetching Lee Valley times for ${date}`);
  console.log(`URL: ${url}`);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Better API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = await response.json();
  const rawRecords = getRecordsFromPayload(payload);
  const normalized = rawRecords.map(normalizeRecord);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const rawPath = resolve(OUTPUT_DIR, `lee-valley-times-${date}.json`);
  const normalizedPath = resolve(
    OUTPUT_DIR,
    `lee-valley-normalized-${date}.json`,
  );

  await writeFile(rawPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  await writeFile(
    normalizedPath,
    JSON.stringify(normalized, null, 2) + "\n",
    "utf8",
  );

  const available = normalized.filter((r) => r.status === "Available").length;
  const unavailable = normalized.filter(
    (r) => r.status === "Unavailable",
  ).length;
  const prices = [...new Set(normalized.map((r) => r.price))];

  console.log("");
  console.log(`Date:         ${date}`);
  console.log(`Total slots:  ${normalized.length}`);
  console.log(`Available:    ${available}`);
  console.log(`Unavailable:  ${unavailable}`);
  console.log(`Prices seen:  ${prices.join(", ") || "none"}`);
  console.log("");
  console.log("First 5 normalized records:");
  console.log(JSON.stringify(normalized.slice(0, 5), null, 2));
  console.log("");
  console.log(`Raw saved:        ${rawPath}`);
  console.log(`Normalized saved: ${normalizedPath}`);
  console.log("");
  console.log(
    "Investigation only. This script does not write the production backend cache.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
