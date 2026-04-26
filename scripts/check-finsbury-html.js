import { mkdir, writeFile } from "node:fs/promises";

const urls = [
  {
    label: "BookByDate",
    url: "https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDate",
    outputPath: "investigation-output/bookbydate.html",
  },
  {
    label: "BookByDateIframe",
    url: "https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDateIframe",
    outputPath: "investigation-output/bookbydate-iframe.html",
  },
];

const genericIndicators = ["Book", "Booking", "Please select a resource"];

const strongPatterns = {
  courtOrResource: /\b(Court|Court\s+\d+|Resource)\b/i,
  time: /\b\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?\b/,
  price: /£|\bGBP\b|\b\d+(?:\.\d{2})?\s*(?:GBP|gbp)\b/,
  status: /\b(Available|Unavailable|Booked|Not available)\b/i,
};

function getMatchedLabels(html) {
  const genericMatches = genericIndicators.filter((indicator) =>
    html.includes(indicator),
  );

  const strongMatches = Object.entries(strongPatterns)
    .filter(([, pattern]) => pattern.test(html))
    .map(([label]) => label);

  return { genericMatches, strongMatches };
}

function getExcerpts(html, pattern, label) {
  const matches = [...html.matchAll(new RegExp(pattern, "gi"))].slice(0, 3);

  return matches.map((match) => {
    const start = Math.max(0, match.index - 70);
    const end = Math.min(html.length, match.index + match[0].length + 70);
    const excerpt = html.slice(start, end).replace(/\s+/g, " ").trim();

    return `${label}: ...${excerpt}...`;
  });
}

function classifyResult({ genericMatches, strongMatches }) {
  const hasTime = strongMatches.includes("time");
  const hasSupportingSlotDetail =
    strongMatches.includes("courtOrResource") ||
    strongMatches.includes("price") ||
    strongMatches.includes("status");

  if (hasTime && hasSupportingSlotDetail) {
    return "strong-slot-data";
  }

  if (genericMatches.length > 0) {
    return "generic-booking-page";
  }

  return "no-slot-data";
}

async function checkUrl({ label, url, outputPath }) {
  console.log(`\nChecking ${label}`);
  console.log(url);

  const response = await fetch(url);
  const html = await response.text();

  await writeFile(outputPath, html, "utf8");

  const { genericMatches, strongMatches } = getMatchedLabels(html);
  const timeExcerpts = getExcerpts(html, strongPatterns.time, "time");
  const priceExcerpts = getExcerpts(html, strongPatterns.price, "price");
  const resultType = classifyResult({ genericMatches, strongMatches });

  console.log(`Status: ${response.status}`);
  console.log(`Response length: ${html.length} characters`);
  console.log(
    `Generic indicators: ${
      genericMatches.length > 0 ? genericMatches.join(", ") : "none"
    }`,
  );
  console.log(
    `Strong indicators: ${
      strongMatches.length > 0 ? strongMatches.join(", ") : "none"
    }`,
  );

  if (timeExcerpts.length > 0 || priceExcerpts.length > 0) {
    console.log("Debug excerpts:");
    [...timeExcerpts, ...priceExcerpts].forEach((excerpt) =>
      console.log(`- ${excerpt}`),
    );
  }

  console.log(`Saved response: ${outputPath}`);

  return resultType;
}

async function main() {
  console.log("Finsbury Park HTML availability investigation");
  console.log("Each URL is fetched once. No booking actions are performed.");

  await mkdir("investigation-output", { recursive: true });

  const results = [];

  for (const item of urls) {
    try {
      const resultType = await checkUrl(item);
      results.push(resultType);
    } catch (error) {
      console.log(`\nChecking ${item.label}`);
      console.log(item.url);
      console.log(`Request failed: ${error.message}`);
      results.push("no-slot-data");
    }
  }

  console.log("\nConclusion:");

  if (results.includes("strong-slot-data")) {
    console.log("Strong slot data appears to be present in raw HTML.");
  } else if (results.includes("generic-booking-page")) {
    console.log("Booking page HTML found, but slot data is not confirmed.");
  } else {
    console.log("Slot data not found in raw HTML; likely loaded dynamically");
  }
}

main();
