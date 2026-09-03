/**
 * The labeled evaluation set: the ground truth a threshold gets chosen from.
 *
 * The replay measures how *often* the email would have fired. It cannot say
 * whether it fired on the right days, and no amount of sweeping will tell it —
 * there is no natural target for attention, so the target has to be
 * constructed by hand. That is what this module holds the machinery for.
 *
 * Import-free for the same reason `observations.ts` is: pure functions over
 * values, so the maths is testable without a database and cannot drag a server
 * client into a client bundle. File and network I/O live in `scripts/`.
 *
 * Two rules here are load-bearing:
 *
 * An unlabeled row is not a negative. It is a row nobody has judged yet, and
 * counting it as unwanted would make precision fall every time the pool grows.
 *
 * A human label survives everything. Bars are adjusted, so a split restates
 * history and every measurement in the pool moves; the judgment does not.
 * Labels are hours of work that cannot be regenerated, so a refresh preserves
 * them and a row that leaves the candidate set is retired rather than deleted.
 */

/**
 * The judgment: would I have wanted to be told about this that day?
 *
 * Three values, not two. "Recall of major events" needs a denominator that a
 * pile of correct minor calls cannot dilute — a missed earnings blowup is the
 * catastrophic failure, and it must not average away against forty small
 * moves the rule got right. Empty means unjudged.
 */
export type Verdict = "" | "no" | "yes" | "major";

const VERDICTS: readonly string[] = ["", "no", "yes", "major"];

/** A wanted day. `major` is a stronger `yes`, never a separate axis. */
export function isWanted(verdict: Verdict): boolean {
  return verdict === "yes" || verdict === "major";
}

/** One measured session that entered the pool, before anyone judged it. */
export type Candidate = {
  symbol: string;
  date: string;
  kind: "company" | "benchmark";
  /**
   * Why the row is in the pool: the family that fired, or `control` for the
   * random sample of quiet sessions, or `retired` for a labeled row that a
   * recomputation pushed out of the candidate set.
   */
  reason: string;
  change: number;
  volatilityAdjusted: number | null;
  relativeAdjusted: number | null;
  volume: number | null;
};

/** A candidate plus whatever a human has said about it. */
export type PoolRow = Candidate & {
  verdict: Verdict;
  basis: string;
  /**
   * When the verdict was recorded. This is what keeps the label set
   * point-in-time honest: re-labeling a day after seeing how a threshold
   * scored on it is the failure mode, and a moved timestamp makes that
   * visible in the diff instead of invisible in the metric.
   */
  labeledAt: string;
};

/** One row reduced to the two facts a metric needs. */
export type Judged = { verdict: Verdict; fired: boolean };

export type Evaluation = {
  /** Rows a human has judged. The denominator behind every number here. */
  labeled: number;
  /** Labeled rows the rule fired on. */
  fired: number;
  /** Wanted rows, `yes` and `major` together. */
  wanted: number;
  /** Wanted rows the rule fired on. */
  hits: number;
  /** Of the wanted days, how many the rule caught. Null when none were wanted. */
  recall: number | null;
  /** Of what the rule sent, how much was wanted. Null when it sent nothing. */
  precision: number | null;
  majorWanted: number;
  majorHits: number;
  /** Recall restricted to `major`. The number a release should be read on. */
  majorRecall: number | null;
};

/** Null rather than zero: a rate with no denominator is unknown, not nil. */
function rate(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

/**
 * How a rule performed against the labels.
 *
 * Unlabeled rows are dropped before anything is counted. A pool is always
 * mostly unjudged, so treating "not yet judged" as "not wanted" would report a
 * precision that tracks labeling progress rather than the rule.
 */
export function evaluate(rows: readonly Judged[]): Evaluation {
  const labeled = rows.filter((row) => row.verdict !== "");
  const wanted = labeled.filter((row) => isWanted(row.verdict));
  const fired = labeled.filter((row) => row.fired);
  const hits = wanted.filter((row) => row.fired);
  const majorWanted = labeled.filter((row) => row.verdict === "major");
  const majorHits = majorWanted.filter((row) => row.fired);

  return {
    labeled: labeled.length,
    fired: fired.length,
    wanted: wanted.length,
    hits: hits.length,
    recall: rate(hits.length, wanted.length),
    precision: rate(hits.length, fired.length),
    majorWanted: majorWanted.length,
    majorHits: majorHits.length,
    majorRecall: rate(majorHits.length, majorWanted.length),
  };
}

/** Date first, so a refreshed pool diffs as insertions rather than a rewrite. */
function key(row: { symbol: string; date: string }): string {
  return `${row.date}|${row.symbol}`;
}

/**
 * A refreshed pool: today's candidates carrying yesterday's judgments.
 *
 * Measurements come from `candidates` — they are recomputed from the bars and
 * are the authority. Verdicts come from `existing` and are never recomputed.
 *
 * A labeled row that is no longer a candidate is kept and marked `retired`
 * rather than dropped: it means the thresholds or the bars moved under a
 * judgment somebody already made, which is worth seeing. An unlabeled row that
 * is no longer a candidate is just stale and goes.
 */
export function mergePool(
  existing: readonly PoolRow[],
  candidates: readonly Candidate[],
): PoolRow[] {
  const labels = new Map(existing.map((row) => [key(row), row]));
  const fresh = new Set(candidates.map(key));

  const merged: PoolRow[] = candidates.map((candidate) => {
    const previous = labels.get(key(candidate));

    return {
      ...candidate,
      verdict: previous?.verdict ?? "",
      basis: previous?.basis ?? "",
      labeledAt: previous?.labeledAt ?? "",
    };
  });

  for (const row of existing) {
    if (fresh.has(key(row))) continue;
    if (row.verdict === "") continue;

    merged.push({ ...row, reason: "retired" });
  }

  return merged.sort(
    (a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol),
  );
}

/**
 * Tab-separated, not CSV.
 *
 * The pool is edited by hand — a spreadsheet or an editor, a thousand rows of
 * it — and the `basis` field is free prose full of commas. Quoted CSV would
 * mean hand-rolling an escaping state machine, which is exactly the kind of
 * parsing that fails quietly. Tabs are stripped from free text on write
 * instead, so a column can never split in two.
 */
const COLUMNS = [
  "symbol",
  "date",
  "kind",
  "reason",
  "change",
  // `price_sigma`, not `vol_adjusted`. The old name sat next to a column
  // called `volume` and read as "volume-adjusted" to everyone who met it —
  // it means volatility. Two different measurements should not share a prefix.
  "price_sigma",
  "cohort_sigma",
  "volume",
  "verdict",
  "basis",
  "labeled_at",
] as const;

/** Empty, not `0` or `null`, so a missing benchmark reads as missing. */
function num(value: number | null): string {
  return value === null ? "" : String(value);
}

function text(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ");
}

export function formatPool(rows: readonly PoolRow[]): string {
  const lines = rows.map((row) =>
    [
      row.symbol,
      row.date,
      row.kind,
      row.reason,
      String(row.change),
      num(row.volatilityAdjusted),
      num(row.relativeAdjusted),
      num(row.volume),
      row.verdict,
      text(row.basis),
      row.labeledAt,
    ].join("\t"),
  );

  return [COLUMNS.join("\t"), ...lines].join("\n") + "\n";
}

function optional(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function parsePool(text: string): PoolRow[] {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  // The header is dropped by position rather than matched, but a file whose
  // columns have drifted would produce silent nonsense, so it is checked.
  const [header, ...body] = lines;
  if (header === undefined) return [];
  if (header !== COLUMNS.join("\t")) {
    throw new Error(`pool header does not match: ${header}`);
  }

  return body.map((line) => {
    const cells = line.split("\t");
    if (cells.length !== COLUMNS.length) {
      throw new Error(`pool row has ${cells.length} columns, expected ${COLUMNS.length}: ${line}`);
    }

    const [symbol, date, kind, reason, change, adjusted, relative, volume, verdict, basis, labeledAt] =
      cells;

    if (!VERDICTS.includes(verdict)) {
      throw new Error(`unknown verdict ${JSON.stringify(verdict)} on ${symbol} ${date}`);
    }
    if (kind !== "company" && kind !== "benchmark") {
      throw new Error(`unknown kind ${JSON.stringify(kind)} on ${symbol} ${date}`);
    }

    return {
      symbol,
      date,
      kind,
      reason,
      change: Number(change),
      volatilityAdjusted: optional(adjusted),
      relativeAdjusted: optional(relative),
      volume: optional(volume),
      verdict: verdict as Verdict,
      basis,
      labeledAt,
    };
  });
}

/**
 * A deterministic pseudo-random hash of a string — FNV-1a, 32-bit.
 *
 * Not cryptographic and not trying to be. It only needs to scatter keys the
 * same way on every run, on every machine, forever. `Math.random` would not:
 * the sample it drew would differ each refresh.
 */
function hash(value: string): number {
  let result = 0x811c9dc5;

  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    // The FNV prime, multiplied in 32-bit space. Math.imul keeps it there;
    // a plain `*` would exceed 2^53 and start losing low bits, which are the
    // ones doing the scattering.
    result = Math.imul(result, 0x01000193);
  }

  return result >>> 0;
}

/**
 * A fixed-size sample that does not move when the pool does.
 *
 * The control sample is the part of the pool nothing fired on, and it is the
 * only thing that makes recall honest: label only what the thresholds
 * surfaced and a day that measured 1.5 sigma but mattered can never be
 * counted as missed, so recall comes out perfect by construction.
 *
 * Those rows are judged by hand, so the sample must survive a refresh. Drawing
 * it randomly would retire the rows somebody just labeled and ask for a fresh
 * set every run. Selecting the lowest hashes instead makes membership a
 * property of the row itself: independent of input order, and stable as the
 * pool grows except where a genuinely lower hash arrives.
 */
export function stableSample<T extends { symbol: string; date: string }>(
  rows: readonly T[],
  size: number,
): T[] {
  return [...rows]
    .map((row) => ({ row, at: hash(key(row)) }))
    // The key breaks ties, so a hash collision cannot make the order depend
    // on which row happened to arrive first.
    .sort((a, b) => a.at - b.at || key(a.row).localeCompare(key(b.row)))
    .slice(0, Math.max(0, size))
    .map((entry) => entry.row);
}

/** What one line of input at the labeling prompt asked for. */
export type Entry = { verdict: Exclude<Verdict, "">; basis: string };

const WORDS: Record<string, Exclude<Verdict, "">> = {
  y: "yes",
  yes: "yes",
  n: "no",
  no: "no",
  m: "major",
  major: "major",
};

/**
 * One typed line: a verdict, then the reason in plain words.
 *
 * `y big earnings move` rather than eleven tab-separated columns. Hand-editing
 * the file put spaces where tabs belonged in fourteen of the first twenty
 * rows, and nothing on screen showed the difference.
 *
 * Null means the input was not understood and the prompt should ask again.
 * Guessing a verdict from a typo would record a judgment nobody made.
 */
export function parseEntry(input: string): Entry | "skip" | "quit" | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const [head, ...rest] = trimmed.split(/\s+/);
  const word = head.toLowerCase();

  // Only when they stand alone, so a reason starting with "some" is not a skip.
  if (rest.length === 0) {
    if (word === "s" || word === "skip") return "skip";
    if (word === "q" || word === "quit") return "quit";
  }

  const verdict = WORDS[word];
  if (verdict === undefined) return null;

  return { verdict, basis: rest.join(" ") };
}
