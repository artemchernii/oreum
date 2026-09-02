import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `database.types.ts` is maintained by hand until the Supabase CLI is wired
 * up, and a stale copy is worse than none: it type-checks against a schema
 * that no longer exists. This test makes the drift loud in CI — it parses
 * every migration for the columns each table ends up with and requires the
 * Row types to list exactly those columns.
 *
 * The parsers below understand the house migration style (one column per
 * line, `--` comments, idempotent DDL), not arbitrary SQL. If a migration
 * introduces a construct they miss, they fail toward a false mismatch — the
 * test complains and the parser gets extended, rather than drift passing
 * silently.
 */

const ROOT = join(__dirname, "..", "..");

/** Split on commas at paren depth zero, so `numeric(10,2)` stays whole. */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/** Table-level clauses that open a column list but are not columns. */
const NON_COLUMN = /^(primary\s+key|foreign\s+key|constraint|check|unique|exclude)\b/i;

function migrationColumns(sqlFiles: readonly string[]): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();

  for (const sql of sqlFiles) {
    const clean = sql.replace(/--[^\n]*/g, "");

    // create table if not exists public.name ( ... )
    const createRe = /create\s+table\s+if\s+not\s+exists\s+public\.(\w+)\s*\(/gi;
    for (let m = createRe.exec(clean); m; m = createRe.exec(clean)) {
      let depth = 1;
      let i = createRe.lastIndex;
      while (i < clean.length && depth > 0) {
        if (clean[i] === "(") depth += 1;
        if (clean[i] === ")") depth -= 1;
        i += 1;
      }
      const body = clean.slice(createRe.lastIndex, i - 1);
      const cols = tables.get(m[1]) ?? new Set<string>();
      for (const part of splitTopLevel(body)) {
        const line = part.trim();
        if (!line || NON_COLUMN.test(line)) continue;
        cols.add(line.split(/\s+/)[0]);
      }
      tables.set(m[1], cols);
    }

    // alter table public.name add column if not exists col ...
    const addRe =
      /alter\s+table\s+public\.(\w+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)/gi;
    for (let m = addRe.exec(clean); m; m = addRe.exec(clean)) {
      const cols = tables.get(m[1]) ?? new Set<string>();
      cols.add(m[2]);
      tables.set(m[1], cols);
    }

    // alter table public.name drop column if exists col
    const dropRe =
      /alter\s+table\s+public\.(\w+)\s+drop\s+column\s+(?:if\s+exists\s+)?(\w+)/gi;
    for (let m = dropRe.exec(clean); m; m = dropRe.exec(clean)) {
      tables.get(m[1])?.delete(m[2]);
    }
  }

  return tables;
}

function typeRowColumns(source: string): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();

  // In gen-types output each table is `name: { Row: { ... };`.
  const rowRe = /(\w+): \{\s*Row: \{([\s\S]*?)\};/g;
  for (let m = rowRe.exec(source); m; m = rowRe.exec(source)) {
    const cols = new Set<string>();
    for (const key of m[2].matchAll(/^\s*(\w+)\??:/gm)) {
      cols.add(key[1]);
    }
    tables.set(m[1], cols);
  }

  return tables;
}

describe("database.types.ts matches the migrations", () => {
  const migrationsDir = join(ROOT, "supabase", "migrations");
  const sqlFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), "utf8"));

  const fromMigrations = migrationColumns(sqlFiles);
  const fromTypes = typeRowColumns(
    readFileSync(join(ROOT, "src", "lib", "database.types.ts"), "utf8"),
  );

  it("parses the migrations at all", () => {
    // Guard against the parser matching nothing and the comparisons below
    // passing vacuously.
    expect(fromMigrations.size).toBeGreaterThan(0);
  });

  it("lists the same tables", () => {
    expect([...fromTypes.keys()].sort()).toEqual([...fromMigrations.keys()].sort());
  });

  it("lists the same columns on every table", () => {
    for (const [table, cols] of fromMigrations) {
      expect([...(fromTypes.get(table) ?? [])].sort(), `table ${table}`).toEqual(
        [...cols].sort(),
      );
    }
  });
});
