import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const hashApiKey = (secret: string) => createHash("sha256").update(secret).digest("hex");
export const makeApiKey = () => { const secret = randomBytes(32).toString("base64url"); return `los_${secret}`; };
export async function requireAgent(request: NextRequest, scope: string) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token?.startsWith("los_")) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) return null;
  // Agent keys are looked up without browser cookies; use the server-only key so
  // RLS cannot hide the key record before we have resolved its owning user.
  const supabase = createSupabaseClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: key } = await supabase.from("personal_api_keys").select("id,user_id,scopes,expires_at,revoked_at").eq("key_hash", hashApiKey(token)).maybeSingle();
  if (!key || key.revoked_at || (key.expires_at && new Date(key.expires_at) <= new Date()) || !key.scopes.includes(scope)) return null;
  await supabase.from("personal_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
  return { supabase, userId: key.user_id, keyId: key.id };
}
