import {
  type NextRequest,
} from "next/server";

import {
  updateSession,
} from "@/app/lib/supabase/proxy";

export async function proxy(
  request: NextRequest
) {
  return updateSession(
    request
  );
}

export const config = {
  matcher: [
    /*
     * Run proxy on all application
     * routes except Next.js internals
     * and static files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};