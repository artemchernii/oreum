/**
 * The labeling prompt.
 *
 * Hand-editing `eval/labels.tsv` put spaces where tabs belonged in fourteen of
 * the first twenty rows, and nothing on screen showed the difference. Columns
 * are a bad interface for a judgment call. This asks one question at a time
 * and writes the file itself, so the format cannot be got wrong.
 *
 * Judge everything still unjudged:
 *   node scripts/label.ts
 *
 * Revisit rows already judged — by symbol, date, partial date, or a range:
 *   node scripts/label.ts MRVL
 *   node scripts/label.ts 2024-12-04
 *   node scripts/label.ts 2024-12
 *   node scripts/label.ts 2024-11-27..2024-12-12
 *
 * Needs no database and no keys — it reads and writes one file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import {
  formatPool,
  matchesFilter,
  parseEntry,
  parsePool,
  type PoolRow,
} from "../src/lib/evaluation.ts";

const PATH = "eval/labels.tsv";
const bold = (value: string) => `\u001b[1m${value}\u001b[0m`;
const dim = (value: string) => `\u001b[2m${value}\u001b[0m`;

/**
 * The scale in words.
 *
 * Deliberately vague at the edges. A sharper mapping would invite labeling by
 * number, and a label derived from the measurement cannot then be used to
 * judge a threshold built on that same measurement.
 */
function howUnusual(value: number | null): string {
  if (value === null) return "no benchmark";

  const size = Math.abs(value);
  if (size < 1) return "ordinary";
  if (size < 2) return "mild";
  if (size < 3) return "notable";
  if (size < 4) return "unusual";
  if (size < 6) return "rare";
  return "extreme";
}

function howBusy(ratio: number | null): string {
  if (ratio === null) return "unknown";
  if (ratio < 1) return "quieter than usual";
  if (ratio < 1.5) return "normal";
  if (ratio < 3) return "busy";
  if (ratio < 5) return "crowded";
  return "everyone is trading it";
}

function signed(value: number | null): string {
  if (value === null) return "—".padStart(7);

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`.padStart(7);
}

const rows = parsePool(readFileSync(PATH, "utf8"));
const filters = process.argv.slice(2);

// Without an argument, judge what is unjudged. With one, show everything that
// matches so a verdict can be revised — the only way to change one's mind
// without opening the file by hand, which is the thing this exists to avoid.
const queue =
  filters.length > 0
    ? rows.filter((row) => matchesFilter(row, filters))
    : rows.filter((row) => row.verdict === "");

if (queue.length === 0) {
  console.log(
    filters.length > 0 ? `nothing matches ${filters.join(" ")}` : "everything is labeled.",
  );
  process.exit(0);
}

const byDate = new Map<string, PoolRow[]>();
for (const row of rows) {
  byDate.set(row.date, [...(byDate.get(row.date) ?? []), row]);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const today = new Date().toISOString().slice(0, 10);

function save() {
  writeFileSync(PATH, formatPool(rows));
}

function tally(): string {
  const counts = { yes: 0, no: 0, major: 0 };
  for (const row of rows) {
    if (row.verdict !== "") counts[row.verdict] += 1;
  }

  return `${counts.yes} yes · ${counts.no} no · ${counts.major} major`;
}

console.log(
  `\n${queue.length} to judge.\n` +
    dim("  y = yes, n = no, m = major, s = skip, q = save and quit\n") +
    dim("  type the letter then why: ") +
    bold("y big earnings move"),
);

for (const [index, row] of queue.entries()) {
  const others = (byDate.get(row.date) ?? []).filter((other) => other !== row);
  // The same-day context is what separates a company event from a market one.
  // Twenty other items on the same date usually means the market moved.
  const loudest = [...others]
    .sort(
      (a, b) =>
        Math.abs(b.volatilityAdjusted ?? 0) - Math.abs(a.volatilityAdjusted ?? 0),
    )
    .slice(0, 3)
    .map((other) => `${other.symbol} ${(other.volatilityAdjusted ?? 0).toFixed(1)}`)
    .join(", ");

  console.log(`\n${dim("─".repeat(64))}`);
  console.log(
    `${dim(`[${index + 1}/${queue.length}]`)}  ${bold(row.symbol.padEnd(6))} ${row.date}  ` +
      dim(row.kind) +
      (row.verdict === "" ? "" : dim(`  currently ${row.verdict}`)),
  );

  const move = row.change * 100;
  console.log(`\n  move           ${`${move >= 0 ? "+" : ""}${move.toFixed(2)}%`.padStart(7)}`);
  console.log(
    `  vs own normal  ${signed(row.volatilityAdjusted)}   ${dim(howUnusual(row.volatilityAdjusted))}`,
  );
  console.log(
    `  vs its sector  ${signed(row.relativeAdjusted)}   ${dim(howUnusual(row.relativeAdjusted))}`,
  );
  console.log(
    `  volume         ${(row.volume === null ? "—" : `${row.volume.toFixed(2)}x`).padStart(7)}   ${dim(howBusy(row.volume))}`,
  );
  console.log(
    "\n  " +
      dim(
        `flagged by ${row.reason} · ${others.length} other items that day` +
          (loudest === "" ? "" : ` (${loudest})`),
      ),
  );
  console.log("  " + dim(`so far: ${tally()}`));

  let answered = false;
  while (!answered) {
    const entry = parseEntry(await rl.question("\n> "));

    if (entry === null) {
      console.log(dim("  didn't catch that — y, n, m, s or q, then the reason"));
      continue;
    }
    if (entry === "quit") {
      save();
      console.log(`\nsaved ${PATH} — ${tally()}`);
      rl.close();
      process.exit(0);
    }
    if (entry === "skip") {
      answered = true;
      continue;
    }

    row.verdict = entry.verdict;
    row.basis = entry.basis;
    row.labeledAt = today;
    // Written after every judgment. A crash or a closed terminal must never
    // cost more than the row being typed.
    save();
    answered = true;
  }
}

save();
console.log(`\ndone — ${tally()}`);
rl.close();
