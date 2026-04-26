import { mkdir, readFile, writeFile } from "node:fs/promises";

const inputPath = "investigation-output/finsbury-slot-candidates.json";
const outputPath = "investigation-output/finsbury-parser-summary.md";

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item) || "Missing";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function formatCounts(counts) {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return "- None";
  }

  return entries.map(([key, count]) => `- ${key}: ${count}`).join("\n");
}

function hasPriceNearCourtBoundary(candidate) {
  if (!candidate.price || !Array.isArray(candidate.context)) {
    return false;
  }

  const priceIndex = candidate.context.findIndex(
    (line) => line === candidate.price,
  );

  if (priceIndex === -1) {
    return false;
  }

  const nextLines = candidate.context.slice(priceIndex + 1);
  return nextLines.some((line) => /^Court\s+\d+/.test(line));
}

function findIssues(candidates) {
  return {
    missingCourt: candidates.filter((candidate) => !candidate.court),
    missingTimeRange: candidates.filter((candidate) => !candidate.timeRange),
    missingStatus: candidates.filter((candidate) => !candidate.status),
    priceNearCourtBoundary: candidates.filter(hasPriceNearCourtBoundary),
  };
}

function makeIssueSummary(issues) {
  return [
    `- Missing court: ${issues.missingCourt.length}`,
    `- Missing timeRange: ${issues.missingTimeRange.length}`,
    `- Missing status: ${issues.missingStatus.length}`,
    `- Price near court boundary: ${issues.priceNearCourtBoundary.length}`,
  ].join("\n");
}

function makeMarkdownReport(candidates, issues) {
  const total = candidates.length;
  const countWithPrice = candidates.filter((candidate) => candidate.price).length;

  return `# Finsbury Park Parser Summary

This report summarizes the local parser output from \`${inputPath}\`.

No web requests are made by this summary script. This is an investigation artifact only.

## Counts

- Total candidates: ${total}
- Candidates with price: ${countWithPrice}

## Count by Court

${formatCounts(countBy(candidates, (candidate) => candidate.court))}

## Count by Status

${formatCounts(countBy(candidates, (candidate) => candidate.status))}

## Count by Confidence

${formatCounts(countBy(candidates, (candidate) => candidate.confidence))}

## Possible Issues

${makeIssueSummary(issues)}

## Records With Price Near Court Boundary

${formatBoundaryExamples(issues.priceNearCourtBoundary)}

## Conclusion

The parser is suitable for investigation because it produces structured candidate records from the saved rendered text and highlights records that may need manual review.

It is not safe to show this output directly in the app yet. The extraction depends on visible text layout, price association is still approximate, and recurring sessions or booking labels may need better structured handling.

Before an MVP v2, the candidates should be manually validated against the rendered screenshot and official booking page. The next phase should confirm the data structure, decide which statuses should be displayed, and define clear wording for stale or incomplete availability data.
`;
}

function formatBoundaryExamples(candidates) {
  if (candidates.length === 0) {
    return "- None detected";
  }

  return candidates
    .slice(0, 10)
    .map((candidate) => {
      const context = Array.isArray(candidate.context)
        ? candidate.context.join(" | ")
        : "No context";

      return `- ${candidate.court}, ${candidate.timeRange}, ${candidate.status}, ${candidate.price}: ${context}`;
    })
    .join("\n");
}

async function main() {
  console.log("Finsbury Park candidate parser summary");
  console.log("Reads saved local JSON only. No web requests are made.");

  await mkdir("investigation-output", { recursive: true });

  const rawJson = await readFile(inputPath, "utf8");
  const candidates = JSON.parse(rawJson);
  const issues = findIssues(candidates);
  const countWithPrice = candidates.filter((candidate) => candidate.price).length;

  console.log(`Total candidates: ${candidates.length}`);
  console.log("\nCount by court:");
  console.log(formatCounts(countBy(candidates, (candidate) => candidate.court)));
  console.log("\nCount by status:");
  console.log(formatCounts(countBy(candidates, (candidate) => candidate.status)));
  console.log(`\nCount with price: ${countWithPrice}`);
  console.log("\nCount by confidence:");
  console.log(
    formatCounts(countBy(candidates, (candidate) => candidate.confidence)),
  );
  console.log("\nPossible issues:");
  console.log(makeIssueSummary(issues));

  const report = makeMarkdownReport(candidates, issues);
  await writeFile(outputPath, report, "utf8");

  console.log(`\nSaved markdown report: ${outputPath}`);
}

main().catch((error) => {
  console.error(`Summary failed: ${error.message}`);
  process.exitCode = 1;
});
