import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseFinsburyRenderedText } from "./finsbury-parser-utils.js";

const inputPath = "investigation-output/finsbury-rendered.txt";
const outputPath = "investigation-output/finsbury-slot-candidates.json";

async function main() {
  console.log("Finsbury Park rendered-text parser prototype");
  console.log("Reads saved local text only. No web requests are made.");

  await mkdir("investigation-output", { recursive: true });

  const text = await readFile(inputPath, "utf8");
  const candidates = parseFinsburyRenderedText(text, {
    includePrice: true,
    includeContext: true,
  });

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
