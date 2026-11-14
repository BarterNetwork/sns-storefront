// Barter Network's Supabase project — where Barter Network profiles (incl. T-Shirt Depot) log in.
// The anon key is public by design (Barter Network's own site ships it to every browser);
// it only allows what Barter Network's row-level security permits. Env vars override these.
export const BARTER_SUPABASE_URL =
  process.env.NEXT_PUBLIC_BARTER_SUPABASE_URL || "https://jgmwmcxzxpbvrcdsvxuw.supabase.co";
export const BARTER_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_BARTER_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnbXdtY3h6eHBidnJjZHN2eHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzUyNTgsImV4cCI6MjA4MTYxMTI1OH0.jpdqM91r2UTFfz5dN0e9cqxqk_NcP55E4RMueRaly0E";

// Barter Network profiles allowed to manage design collections.
// T-Shirt Depot's user id (same id Barter Network uses for apparel orders).
export const TSHIRT_DEPOT_USER_ID = "5cddc0c8-609e-4471-a7c3-09618c2a7e9b";
export const COLLECTION_MANAGER_IDS: string[] = (process.env.COLLECTION_MANAGER_IDS || TSHIRT_DEPOT_USER_ID)
  .split(",").map(s => s.trim()).filter(Boolean);
