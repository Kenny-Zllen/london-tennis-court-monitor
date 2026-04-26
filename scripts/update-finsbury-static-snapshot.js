import { mkdir, readdir, writeFile } from "node:fs/promises";
import {
  countBy,
  formatSnapshotModule,
  parseFinsburyRenderedText,
} from "./finsbury-parser-utils.js";

const snapshotDir = "src/data/finsburySnapshots";
const snapshotIndexPath = `${snapshotDir}/index.js`;
const baseBookingUrl =
  "https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDate";

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateArgument() {
  const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
  return dateArg ? dateArg.replace("--date=", "") : getTodayDateString();
}

function validateDateString(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error("Invalid date. Use --date=YYYY-MM-DD.");
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const parsedDate = new Date(year, month - 1, day);
  const isRealDate =
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day;

  if (!isRealDate) {
    throw new Error("Invalid date. Use a real calendar date in YYYY-MM-DD format.");
  }
}

function buildBookingUrl(dateString) {
  return `${baseBookingUrl}#?date=${dateString}&role=guest`;
}

function getSnapshotFilePath(dateString) {
  return `${snapshotDir}/${dateString}.js`;
}

function getImportName(dateString) {
  return `snapshot${dateString.replaceAll("-", "")}`;
}

function getMetaImportName(dateString) {
  return `meta${dateString.replaceAll("-", "")}`;
}

function formatDateLabel(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

async function getAvailableSnapshotDates(selectedDate) {
  await mkdir(snapshotDir, { recursive: true });

  const files = await readdir(snapshotDir);
  const existingDates = files
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.js$/.test(file))
    .map((file) => file.replace(".js", ""));

  return [...new Set([...existingDates, selectedDate])].sort();
}

function formatSnapshotIndex(dates) {
  const imports = dates
    .map((date) => {
      const snapshotImportName = getImportName(date);
      const metaImportName = getMetaImportName(date);

      return `import {
  finsburySnapshot as ${snapshotImportName},
  finsburySnapshotMeta as ${metaImportName},
} from "./${date}.js";`;
    })
    .join("\n\n");

  const entries = dates
    .map((date) => {
      const snapshotImportName = getImportName(date);
      const metaImportName = getMetaImportName(date);

      return `  {
    date: "${date}",
    label: "${formatDateLabel(date)}",
    meta: ${metaImportName},
    data: ${snapshotImportName},
  }`;
    })
    .join(",\n");

  return `${imports}

export const finsburySnapshots = [
${entries},
];

export const defaultFinsburySnapshot =
  finsburySnapshots[finsburySnapshots.length - 1];
`;
}

function formatCounts(counts) {
  return Object.entries(counts)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, count]) => `- ${key}: ${count}`)
    .join("\n");
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.log("Playwright is not installed yet.");
    console.log("Run: npm install");
    console.log("Then install the browser binary if needed:");
    console.log("npx playwright install chromium");
    process.exitCode = 1;
    return null;
  }
}

function buildMetadata({ bookingUrl, dateString, lastCheckedAt }) {
  return {
    venueName: "Finsbury Park",
    source: "Local Playwright rendered-page investigation",
    checkedDate: dateString,
    sourceUrl: bookingUrl,
    lastCheckedAt,
    isLive: false,
    disclaimer:
      "Static snapshot generated from local rendered-page investigation output. Not live availability. Some records may require manual validation. Always confirm and book through the official ClubSpark page.",
    bookingUrl,
  };
}

async function main() {
  const selectedDate = getDateArgument();
  validateDateString(selectedDate);
  const bookingUrl = buildBookingUrl(selectedDate);

  console.log("Finsbury Park static snapshot updater");
  console.log("Loads the public guest booking page once per manual run.");
  console.log("No booking actions are performed.");
  console.log(`Selected date: ${selectedDate}`);
  console.log(bookingUrl);

  const playwright = await loadPlaywright();

  if (!playwright) {
    return;
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
  });

  try {
    await page.goto(bookingUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    try {
      await page.waitForLoadState("networkidle", { timeout: 15000 });
    } catch {
      console.log("Network did not become idle; continuing with rendered page.");
    }

    await page.waitForTimeout(3000);

    const renderedText = await page
      .locator("body")
      .innerText({ timeout: 10000 });
    const records = parseFinsburyRenderedText(renderedText);
    const lastCheckedAt = new Date().toISOString();
    const meta = buildMetadata({
      bookingUrl,
      dateString: selectedDate,
      lastCheckedAt,
    });
    const moduleText = formatSnapshotModule({ meta, records });
    const snapshotFilePath = getSnapshotFilePath(selectedDate);
    const availableDates = await getAvailableSnapshotDates(selectedDate);
    const indexText = formatSnapshotIndex(availableDates);

    await writeFile(snapshotFilePath, moduleText, "utf8");
    await writeFile(snapshotIndexPath, indexText, "utf8");

    console.log("\nSnapshot updated.");
    console.log(`Selected date: ${selectedDate}`);
    console.log(`Records generated: ${records.length}`);
    console.log(`lastCheckedAt: ${lastCheckedAt}`);
    console.log("\nCount by court:");
    console.log(formatCounts(countBy(records, (record) => record.court)));
    console.log("\nCount by status:");
    console.log(formatCounts(countBy(records, (record) => record.status)));
    console.log(`\nWrote: ${snapshotFilePath}`);
    console.log(`Updated: ${snapshotIndexPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`Snapshot update failed: ${error.message}`);

  if (error.message.includes("Executable doesn't exist")) {
    console.log("Install the Chromium browser binary with:");
    console.log("npx playwright install chromium");
  }

  process.exitCode = 1;
});
