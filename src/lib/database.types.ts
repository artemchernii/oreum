/**
 * Database types for the `public` schema.
 *
 * Shaped exactly like `supabase gen types typescript` output so it is a
 * drop-in replacement once the Supabase CLI is available locally — see
 * `pnpm db:types`. Until then this is derived from the live PostgREST schema
 * rather than written from memory: the column names, nullability and foreign
 * keys below were read back from `GET /rest/v1/` on the real project.
 *
 * `numeric` maps to `number`. Verified against the live API rather than
 * assumed — PostgREST serialises numeric as a JSON number
 * (`"volume": 5845766.588348`), not a string.
 *
 * Regenerate whenever a migration lands. A stale file here is worse than no
 * file, because it type-checks against a schema that no longer exists.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          symbol: string;
          name: string;
          sector_line: string;
          created_at: string;
        };
        Insert: {
          symbol: string;
          name: string;
          sector_line: string;
          created_at?: string;
        };
        Update: {
          symbol?: string;
          name?: string;
          sector_line?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      watchlist: {
        Row: {
          user_id: string;
          symbol: string;
          added_at: string;
        };
        Insert: {
          user_id: string;
          symbol: string;
          added_at?: string;
        };
        Update: {
          user_id?: string;
          symbol?: string;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watchlist_symbol_fkey";
            columns: ["symbol"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["symbol"];
          },
        ];
      };
      daily_bars: {
        Row: {
          symbol: string;
          trade_date: string;
          open: number;
          high: number;
          low: number;
          close: number;
          vwap: number | null;
          volume: number | null;
          trades: number | null;
        };
        Insert: {
          symbol: string;
          trade_date: string;
          open: number;
          high: number;
          low: number;
          close: number;
          vwap?: number | null;
          volume?: number | null;
          trades?: number | null;
        };
        Update: {
          symbol?: string;
          trade_date?: string;
          open?: number;
          high?: number;
          low?: number;
          close?: number;
          vwap?: number | null;
          volume?: number | null;
          trades?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "daily_bars_symbol_fkey";
            columns: ["symbol"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["symbol"];
          },
        ];
      };
      market_days: {
        Row: {
          trade_date: string;
          is_trading: boolean;
          checked_at: string;
        };
        Insert: {
          trade_date: string;
          is_trading: boolean;
          checked_at?: string;
        };
        Update: {
          trade_date?: string;
          is_trading?: boolean;
          checked_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

/** Convenience aliases so call sites don't spell out the lookup each time. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
