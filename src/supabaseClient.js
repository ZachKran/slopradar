import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars aren't set (e.g. running before Supabase is configured),
// export null so callers can fall back to mock data instead of crashing.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
