import { writeFile } from "node:fs/promises";
import {
  countBy,
  formatSnapshotModule,
  parseFinsburyRenderedText,
} from "./finsbury-parser-utils.js";

const bookingUrl =
  "https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDate#?date=2026-04-26&role=guest";

const outputPath = "src/data/finsburySnapshot.js";

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

function buildMetadata({ lastCheckedAt }) {
  return {
    venueName: "Finsbury Park",
    source: "Local Playwright rendered-page investigation",
    checkedDate: "Sunday 26 April 2026",
    lastCheckedAt,
    isLive: false,
    disclaimer:
      "Static snapshot generated from local rendered-page investigation output. Not live availability. Some records may require manual validation. Always confirm and book through the official ClubSpark page.",
    bookingUrl,
  };
}

async function main() {
  console.log("Finsbury Park static snapshot updater");
  console.log("Loads the public guest booking page once per manual run.");
  console.log("No booking actions are performed.");
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
    const meta = buildMetadata({ lastCheckedAt });
    const moduleText = formatSnapshotModule({ meta, records });

    await writeFile(outputPath, moduleText, "utf8");

    console.log("\nSnapshot updated.");
    console.log(`Records generated: ${records.length}`);
    console.log(`lastCheckedAt: ${lastCheckedAt}`);
    console.log("\nCount by court:");
    console.log(formatCounts(countBy(records, (record) => record.court)));
    console.log("\nCount by status:");
    console.log(formatCounts(countBy(records, (record) => record.status)));
    console.log(`\nWrote: ${outputPath}`);
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
