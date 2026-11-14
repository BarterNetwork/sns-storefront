import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BARTER_SUPABASE_ANON_KEY, BARTER_SUPABASE_URL, COLLECTION_MANAGER_IDS } from "@/lib/barter-config";

export interface BarterUser { id: string; email: string | null }

/** Verifies the Barter Network access token on the request. Returns the user, or null. */
export async function getBarterUser(req: NextRequest): Promise<BarterUser | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const bn = createClient(BARTER_SUPABASE_URL, BARTER_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await bn.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * The signed-in Barter Network profile, if it's allowed to manage design collections
 * (T-Shirt Depot). Returns { user } when allowed, or { status } 401/403 otherwise.
 */
export async function requireCollectionManager(req: NextRequest): Promise<{ user: BarterUser } | { status: 401 | 403 }> {
  const user = await getBarterUser(req);
  if (!user) return { status: 401 };
  if (!COLLECTION_MANAGER_IDS.includes(user.id)) return { status: 403 };
  return { user };
}
