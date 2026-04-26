import { mkdir, writeFile } from "node:fs/promises";

const bookingUrl =
  "https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDate#?date=2026-04-26&role=guest";

const outputTextPath = "investigation-output/finsbury-rendered.txt";
const outputImagePath = "investigation-output/finsbury-rendered.png";

const patterns = {
  courtOrResource: /\b(Court|Court\s+\d+|Resource)\b/i,
  time: /\b\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?\b/,
  price: /£|\bGBP\b|\b\d+(?:\.\d{2})?\s*(?:GBP|gbp)\b/,
  status: /\b(Available|Unavailable|Booked|Not available)\b/i,
};

function getMatchedLabels(text) {
  return Object.entries(patterns)
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label);
}

function getExcerpts(text, pattern, label) {
  const matches = [...text.matchAll(new RegExp(pattern, "gi"))].slice(0, 5);

  return matches.map((match) => {
    const start = Math.max(0, match.index - 80);
    const end = Math.min(text.length, match.index + match[0].length + 80);
    const excerpt = text.slice(start, end).replace(/\s+/g, " ").trim();

    return `${label}: ...${excerpt}...`;
  });
}

function hasConfirmedSlotData(matchedLabels) {
  const hasTime = matchedLabels.includes("time");
  const hasSupportingSlotDetail =
    matchedLabels.includes("courtOrResource") ||
    matchedLabels.includes("price") ||
    matchedLabels.includes("status");

  return hasTime && hasSupportingSlotDetail;
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

async function main() {
  console.log("Finsbury Park rendered-page availability investigation");
  console.log("The public booking page is loaded once. No booking actions run.");
  console.log(bookingUrl);

  const playwright = await loadPlaywright();

  if (!playwright) {
    return;
  }

  await mkdir("investigation-output", { recursive: true });

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

    const bodyText = await page.locator("body").innerText({ timeout: 10000 });
    await writeFile(outputTextPath, bodyText, "utf8");
    await page.screenshot({ path: outputImagePath, fullPage: true });

    const matchedLabels = getMatchedLabels(bodyText);
    const timeExcerpts = getExcerpts(bodyText, patterns.time, "time");
    const priceExcerpts = getExcerpts(bodyText, patterns.price, "price");

    console.log(`Visible text length: ${bodyText.length} characters`);
    console.log(
      `Matched indicators: ${
        matchedLabels.length > 0 ? matchedLabels.join(", ") : "none"
      }`,
    );
    console.log(`Saved text: ${outputTextPath}`);
    console.log(`Saved screenshot: ${outputImagePath}`);

    if (timeExcerpts.length > 0 || priceExcerpts.length > 0) {
      console.log("Debug excerpts:");
      [...timeExcerpts, ...priceExcerpts].forEach((excerpt) =>
        console.log(`- ${excerpt}`),
      );
    }

    console.log("\nConclusion:");

    if (hasConfirmedSlotData(matchedLabels)) {
      console.log("Slot data appears in rendered page text");
    } else {
      console.log("Rendered page loaded, but slot data not confirmed");
    }
  } finally {
    await browser.close();
  }
}

main();
