import Link from "next/link";

import { createClient } from "@/app/lib/supabase/server";

import BusinessDirectory from "./BusinessDirectory";

export default async function BusinessesPage() {
  // =========================================
  // 1. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET BUSINESSES
  // =========================================

  const {
    data: businesses,
    error,
  } = await supabase
    .from("businesses")
    .select(
      `
        id,
        name,
        slug,
        description,
        logo_url,
        cover_image_url,
        category,
        phone,
        address,
        status,
        is_open
      `
    )
    .in("status", ["active", "approved"])
    .order("name", {
      ascending: true,
    });

  // =========================================
  // 3. HANDLE DATABASE ERROR
  // =========================================

  if (error) {
    console.error("BUSINESS DIRECTORY ERROR:", error);

    return (
      <main className="min-h-screen bg-[#faf7f8]">
        {/* =========================================
            HEADER
        ========================================= */}

        <header className="border-b border-[#ead6dd] bg-white">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <Link
              href="/"
              className="text-2xl font-bold text-[#8B1E3F]"
            >
              ADADI
            </Link>
          </div>
        </header>

        {/* =========================================
            ERROR MESSAGE
        ========================================= */}

        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <span className="text-2xl font-bold text-red-600">
              !
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Unable to load businesses
          </h1>

          <p className="mt-3 text-gray-600">
            We couldn't load the business directory right now.
            Please try again later.
          </p>

          <Link
            href="/customer/dashboard"
            className="mt-6 inline-block rounded-lg bg-[#8B1E3F] px-6 py-3 font-semibold text-white transition hover:bg-[#64152E]"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const formattedBusinesses =
    (businesses || []).map((business) => ({
      ...business,
      category: business.category || "Other",
      description:
        business.description ||
        "No description available.",
      is_open: business.is_open ?? true,
    }));

  // =========================================
  // 5. RENDER BUSINESS DIRECTORY
  // =========================================

  return (
    <BusinessDirectory
      businesses={formattedBusinesses}
    />
  );
}