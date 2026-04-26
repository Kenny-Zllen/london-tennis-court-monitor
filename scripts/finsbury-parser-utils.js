const courtHeadingPattern = /^Court\s+\d+(?:\s+\(.+\))?$/;
const timeRangePattern = /^(?:at\s+)?(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/;
const statusPattern = /^(Available|Unavailable|Booked|Not available|Closed)$/i;
const pricePattern = /^£\d+(?:\.\d{2})?$|^GBP\s*\d+(?:\.\d{2})?$/i;

export function cleanRenderedLines(text) {
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

function makeCandidate({
  court,
  timeRange,
  status,
  price,
  confidence,
  context,
  includePrice,
  includeContext,
}) {
  const candidate = {
    court,
    timeRange,
    status,
    confidence,
  };

  if (includePrice) {
    candidate.price = price;
  }

  if (includeContext) {
    candidate.context = context;
  }

  return candidate;
}

export function parseFinsburyRenderedText(
  text,
  { includePrice = false, includeContext = false } = {},
) {
  const lines = cleanRenderedLines(text);
  const candidates = [];
  let currentCourt = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    // Assumption: real court sections start with headings like "Court 1" or
    // "Court 4 (no floodlights)". A range label like "Court 1 - Court 7" is
    // ignored because it is a view label, not a resource.
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
      candidates.push(
        makeCandidate({
          court: currentCourt,
          timeRange: `${lineTimeMatch[1]} - ${lineTimeMatch[2]}`,
          status: nextLine,
          price: getNearbyPrice(lines, index),
          confidence: "medium",
          context: lines.slice(Math.max(0, index - 2), index + 4),
          includePrice,
          includeContext,
        }),
      );

      continue;
    }

    // Alternate pattern seen in some accessible text:
    // Unavailable
    // at 07:00 - 08:00
    if (lineStatusMatch && nextLine.startsWith("at ")) {
      const nextTimeMatch = nextLine.match(timeRangePattern);

      candidates.push(
        makeCandidate({
          court: currentCourt,
          timeRange: `${nextTimeMatch[1]} - ${nextTimeMatch[2]}`,
          status: line,
          price: getNearbyPrice(lines, index),
          confidence: "medium",
          context: lines.slice(Math.max(0, index - 2), index + 4),
          includePrice,
          includeContext,
        }),
      );
    }
  }

  return sortSlotRecords(dedupeCandidates(candidates));
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

function getCourtNumber(court) {
  return Number(court.match(/\d+/)?.[0] || 999);
}

function getStartMinutes(timeRange) {
  const [hours, minutes] = timeRange.split(" - ")[0].split(":").map(Number);
  return hours * 60 + minutes;
}

export function sortSlotRecords(records) {
  return [...records].sort(
    (first, second) =>
      getCourtNumber(first.court) - getCourtNumber(second.court) ||
      getStartMinutes(first.timeRange) - getStartMinutes(second.timeRange),
  );
}

export function countBy(records, getKey) {
  return records.reduce((counts, record) => {
    const key = getKey(record) || "Missing";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function formatSnapshotModule({ meta, records }) {
  return `export const finsburySnapshotMeta = ${JSON.stringify(meta, null, 2)};

export const finsburySnapshot = ${JSON.stringify(records, null, 2)};
`;
}
