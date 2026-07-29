import { notFound } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

type BusinessPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BusinessPublicPage({
  params,
}: BusinessPageProps) {
  // =========================================
  // 1. GET SLUG
  // =========================================

  const { slug } = await params;

  console.log(
    "========================================="
  );

  console.log(
    "PUBLIC BUSINESS PAGE LOADED"
  );

  console.log(
    "SLUG FROM URL:",
    slug
  );

  console.log(
    "========================================="
  );

  // =========================================
  // 2. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 3. TEST BUSINESS QUERY
  // =========================================

  const {
    data: business,
    error,
  } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      slug,
      description,
      category,
      status,
      owner_id
    `)
    .eq("slug", slug)
    .maybeSingle();

  // =========================================
  // 4. LOG RESULT
  // =========================================

  console.log(
    "BUSINESS QUERY RESULT:",
    business
  );

  console.log(
    "BUSINESS QUERY ERROR:",
    error
  );

  console.log(
    "========================================="
  );

  // =========================================
  // 5. HANDLE ERROR
  // =========================================

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-10">

        <h1 className="text-2xl font-bold text-red-600">
          Supabase Error
        </h1>

        <div className="mt-5 rounded-xl bg-red-50 p-5">

          <p>
            <strong>Message:</strong>{" "}
            {error.message}
          </p>

          <p className="mt-2">
            <strong>Code:</strong>{" "}
            {error.code}
          </p>

          <p className="mt-2">
            <strong>Details:</strong>{" "}
            {error.details}
          </p>

          <p className="mt-2">
            <strong>Hint:</strong>{" "}
            {error.hint}
          </p>

        </div>

      </div>
    );
  }

  // =========================================
  // 6. BUSINESS NOT FOUND
  // =========================================

  if (!business) {
    return (
      <div className="mx-auto max-w-3xl p-10">

        <h1 className="text-2xl font-bold text-red-600">
          Business Not Found
        </h1>

        <div className="mt-5 rounded-xl bg-gray-100 p-5">

          <p>
            No business was returned from Supabase.
          </p>

          <p className="mt-3">
            Slug searched:
          </p>

          <p className="mt-1 font-mono font-bold">
            {slug}
          </p>

        </div>

      </div>
    );
  }

  // =========================================
  // 7. SUCCESS
  // =========================================

  return (
    <main className="min-h-screen bg-[#FAF8F6] p-6">

      <div className="mx-auto max-w-4xl">

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

          <p className="text-sm font-semibold text-[#8B1E3F]">
            Business Found Successfully
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#242424]">
            {business.name}
          </h1>

          <div className="mt-6 space-y-3 text-sm">

            <p>
              <strong>ID:</strong>{" "}
              {business.id}
            </p>

            <p>
              <strong>Slug:</strong>{" "}
              {business.slug}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {business.status}
            </p>

            <p>
              <strong>Owner ID:</strong>{" "}
              {business.owner_id}
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}