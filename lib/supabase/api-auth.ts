import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

/**
 * Resolves the authenticated user for API Route Handlers.
 * Supports:
 * 1. Web session cookies (via createServerClient)
 * 2. Authorization: Bearer <token> (for CLI / external scripts)
 */
export async function getAuthenticatedUser(request?: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  // 1. Check Authorization Bearer header first (CLI access)
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const directClient = createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      const { data: { user }, error } = await directClient.auth.getUser(token);
      if (!error && user) {
        return { user, supabase: directClient };
      }
    }
  }

  // 2. Fall back to cookie-based session (Web app)
  const cookieClient = await createServerClient();
  const { data: { user }, error } = await cookieClient.auth.getUser();

  if (error || !user) {
    return { user: null, supabase: cookieClient };
  }

  return { user, supabase: cookieClient };
}
