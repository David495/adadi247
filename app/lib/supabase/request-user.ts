import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/app/lib/supabase/server";

export async function getRequestUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  const hasAuthorization = Boolean(authorization);

  if (hasAuthorization && !bearerMatch) {
    return { user: null, error: new Error("Invalid authorization header") };
  }

  if (bearerMatch) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { user: null, error: new Error("Supabase is not configured") };
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${bearerMatch[1]}`,
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  }

  const supabase = await createCookieClient();
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}
