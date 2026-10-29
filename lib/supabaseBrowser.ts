"use client";
import { createClient } from "@supabase/supabase-js";

/** Browser client. Can only upload using a one-time signed token the server hands out. */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
