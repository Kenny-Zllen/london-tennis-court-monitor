import { mkdir, readFile, writeFile } from "node:fs/promises";

const inputPath = "investigation-output/finsbury-rendered.txt";
const outputPath = "investigation-output/finsbury-slot-candidates.json";

const courtHeadingPattern = /^Court\s+\d+(?:\s+\(.+\))?$/;
const timeRangePattern = /^(?:at\s+)?(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/;
const statusPattern = /^(Available|Unavailable|Booked|Not available|Closed)$/i;
const pricePattern = /^£\d+(?:\.\d{2})?$|^GBP\s*\d+(?:\.\d{2})?$/i;

function cleanLines(text) {
  return text
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getNearbyPrice(lines, index) {
  for (let offset = 0; offset <= 3; offset += 1) {
    const line = lines[index + offset];

    if (!line || (offset > 0 && courtHeadingPattern.test(line))) {
      return null;
    }

    if (pricePattern.test(line)) {
      return line;
    }
  }

  return null;
}

function makeCandidate({ court, timeRange, status, price, confidence, context }) {
  return {
    court,
    timeRange,
    status,
    price,
    confidence,
    context,
  };
}

function parseCandidates(lines) {
  const candidates = [];
  let currentCourt = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    // Assumption: real court sections start with headings like "Court 1" or
    // "Court 4 (no floodlights)". A range label like "Court 1 - Court 7" is
    // intentionally ignored because it is a view label, not a resource.
    if (courtHeadingPattern.test(line)) {
      currentCourt = line;
      continue;
    }

    if (!currentCourt) {
      continue;
    }

    const lineTimeMatch = line.match(timeRangePattern);
    const lineStatusMatch = line.match(statusPattern);
    const nextLine = lines[index + 1] || "";

    // Common pattern in the rendered text:
    // 08:00 - 09:00
    // Booked
    if (lineTimeMatch && statusPattern.test(nextLine)) {
      const price = getNearbyPrice(lines, index);

      candidates.push(
        makeCandidate({
          court: currentCourt,
          timeRange: `${lineTimeMatch[1]} - ${lineTimeMatch[2]}`,
          status: nextLine,
          price,
          confidence: price ? "medium" : "medium",
          context: lines.slice(Math.max(0, index - 2), index + 4),
        }),
      );

      continue;
    }

    // Alternate pattern seen in some accessible text:
    // Unavailable
    // at 07:00 - 08:00
    if (lineStatusMatch && nextLine.startsWith("at ")) {
      const nextTimeMatch = nextLine.match(timeRangePattern);
      const price = getNearbyPrice(lines, index);

      candidates.push(
        makeCandidate({
          court: currentCourt,
          timeRange: `${nextTimeMatch[1]} - ${nextTimeMatch[2]}`,
          status: line,
          price,
          confidence: "medium",
          context: lines.slice(Math.max(0, index - 2), index + 4),
        }),
      );

      continue;
    }
  }

  return dedupeCandidates(candidates);
}

function dedupeCandidates(candidates) {
  const seen = new Set();

  return candidates.filter((candidate) => {
    const key = [
      candidate.court,
      candidate.timeRange,
      candidate.status.toLowerCase(),
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function main() {
  console.log("Finsbury Park rendered-text parser prototype");
  console.log("Reads saved local text only. No web requests are made.");

  await mkdir("investigation-output", { recursive: true });

  const text = await readFile(inputPath, "utf8");
  const lines = cleanLines(text);
  const candidates = parseCandidates(lines);

  await writeFile(outputPath, JSON.stringify(candidates, null, 2), "utf8");

  console.log(`Candidates found: ${candidates.length}`);
  console.log(`Saved candidates: ${outputPath}`);
  console.log("First 10 candidates:");
  console.log(JSON.stringify(candidates.slice(0, 10), null, 2));
  console.log(
    "\nNote: This parser is conservative and prototype-only. Results need manual review.",
  );
}

main().catch((error) => {
  console.error(`Parser failed: ${error.message}`);
  process.exitCode = 1;
});
