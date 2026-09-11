import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const tests: Record<string, number> = {};

  const start1 = Date.now();

  const { error: settingsError } = await supabase
    .from("platform_settings")
    .select("*")
    .limit(1);

  tests.platformSettings = Date.now() - start1;

  const start2 = Date.now();

  const { error: businessesError } = await supabase
    .from("businesses")
    .select("id")
    .limit(1);

  tests.businesses = Date.now() - start2;

  const start3 = Date.now();

  const { error: productsError } = await supabase
    .from("products")
    .select("id")
    .limit(1);

  tests.products = Date.now() - start3;

  return NextResponse.json({
    tests,
    errors: {
      platformSettings: settingsError?.message ?? null,
      businesses: businessesError?.message ?? null,
      products: productsError?.message ?? null,
    },
  });
}