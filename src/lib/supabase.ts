import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase URL or Anon Key is missing. Please check your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const marketModeUrl =
  import.meta.env.MARKET_MODE_VITE_SUPABASE_URL ||
  "https://tvmmtwnjewwuymtowzpv.supabase.co";
const marketModeAnonKey =
  import.meta.env.MARKET_MODE_VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bW10d25qZXd3dXltdG93enB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjQ3NTksImV4cCI6MjA5MDcwMDc1OX0.PYj_QGIVkBtEYKyaCrG8IahgCYqlA3bIwnljO47kxf4";

export const marketModeSupabase = createClient(marketModeUrl, marketModeAnonKey);

