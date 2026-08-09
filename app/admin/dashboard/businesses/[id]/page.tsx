import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

import BusinessActions from "./BusinessStatusActions";

type BusinessDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BusinessDetailsPage({
  params,
}: BusinessDetailsPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("ADMIN DETAILS AUTH ERROR:", authError);

    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Authentication Required
        </h1>

        <p className="mt-3 text-gray-600">
          Please log in as an administrator to access this page.
        </p>

        <Link
          href="/admin-login"
          className="mt-6 inline-block rounded-lg bg-[#8B1E3F] px-6 py-3 font-semibold text-white transition hover:bg-[#64152E]"
        >
          Go to Admin Login
        </Link>
      </div>
    );
  }

  const admin = createAdminClient();

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  console.log("========== ADMIN DETAILS CHECK ==========");
  console.log("Authenticated user ID:", user.id);
  console.log("Authenticated user email:", user.email);
  console.log("Profile:", profile);
  console.log("Profile error:", profileError);
  console.log("Profile role:", profile?.role);
  console.log("=========================================");

  if (profileError || !profile || profile.role !== "admin") {
    console.error("========== ADMIN ACCESS DENIED ==========");
    console.error("User ID:", user.id);
    console.error("User email:", user.email);
    console.error("Profile:", profile);
    console.error("Profile error:", profileError);
    console.error("=========================================");

    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
          !
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900">
          Access Denied
        </h1>

        <p className="mt-3 text-gray-600">
          You are not authorized to access the admin business
          management area.
        </p>

        <Link
          href="/admin/dashboard"
          className="mt-6 inline-block rounded-lg bg-[#64152E] px-6 py-3 font-semibold text-white transition hover:bg-[#8B1E3F]"
        >
          Back to Admin Dashboard
        </Link>
      </div>
    );
  }

  const {
    data: business,
    error: businessError,
  } = await admin
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
        is_open,
        onboarding_status,
        owner_id,
        created_at
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (businessError) {
    console.error(
      "ADMIN BUSINESS DETAILS ERROR:",
      businessError
    );

    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Unable to Load Business
        </h1>

        <p className="mt-3 text-gray-600">
          We could not load this business right now.
          Please try again later.
        </p>

        <Link
          href="/admin/dashboard/businesses"
          className="mt-6 inline-block rounded-lg bg-[#64152E] px-6 py-3 font-semibold text-white transition hover:bg-[#8B1E3F]"
        >
          Back to Businesses
        </Link>
      </div>
    );
  }

  if (!business) {
    notFound();
  }

  const {
    data: owner,
    error: ownerError,
  } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", business.owner_id)
    .maybeSingle();

  if (ownerError) {
    console.error(
      "BUSINESS OWNER ERROR:",
      ownerError
    );
  }

  const isApproved = business.status === "approved";
  const isSuspended = business.status === "suspended";
  const isPending = business.status === "pending";

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard/businesses"
            className="text-sm font-medium text-gray-600 transition hover:text-[#8B1E3F]"
          >
            ← Back to Businesses
          </Link>

          <span className="hidden text-gray-300 md:inline">
            |
          </span>

          <h1 className="text-xl font-bold text-[#8B1E3F]">
            Business Review
          </h1>
        </div>

        <Link
          href="/admin/dashboard"
          className="text-sm font-medium text-gray-600 transition hover:text-[#8B1E3F]"
        >
          Admin Dashboard
        </Link>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Business Management
        </p>

        <h2 className="mt-2 text-3xl font-bold text-gray-900">
          Review Business
        </h2>

        <p className="mt-2 text-gray-600">
          Review the business information and manage its
          approval status.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#ead6dd] bg-white shadow-sm">

        <div className="relative h-64 bg-[#f7e9ee]">
          {business.cover_image_url ? (
            <img
              src={business.cover_image_url}
              alt={`${business.name} cover`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-6xl">
                🏪
              </span>
            </div>
          )}
        </div>

        <div className="p-8">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-5">

              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#ead6dd] bg-[#f7e9ee]">

                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={`${business.name} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">
                    🏪
                  </span>
                )}

              </div>

              <div>

                <h3 className="text-2xl font-bold text-gray-900">
                  {business.name}
                </h3>

                {business.category && (
                  <p className="mt-1 text-sm font-medium text-[#8B1E3F]">
                    {business.category}
                  </p>
                )}

                <p className="mt-1 text-sm text-gray-500">
                  /businesses/{business.slug}
                </p>

              </div>

            </div>

            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                isApproved
                  ? "bg-green-100 text-green-700"
                  : isSuspended
                  ? "bg-red-100 text-red-700"
                  : isPending
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {business.status || "pending"}
            </span>

          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <div className="rounded-2xl border border-[#ead6dd] bg-white p-8 shadow-sm lg:col-span-2">

          <h3 className="text-xl font-bold text-gray-900">
            Business Information
          </h3>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Business Name
              </p>

              <p className="mt-2 font-medium text-gray-900">
                {business.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Category
              </p>

              <p className="mt-2 font-medium text-gray-900">
                {business.category || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Phone
              </p>

              <p className="mt-2 font-medium text-gray-900">
                {business.phone || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Address
              </p>

              <p className="mt-2 font-medium text-gray-900">
                {business.address || "Not provided"}
              </p>
            </div>

          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">

            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Description
            </p>

            <p className="mt-3 leading-7 text-gray-600">
              {business.description ||
                "No business description was provided."}
            </p>

          </div>

        </div>

        <div className="rounded-2xl border border-[#ead6dd] bg-white p-8 shadow-sm">

          <h3 className="text-xl font-bold text-gray-900">
            Business Status
          </h3>

          <div className="mt-6 space-y-5">

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Account Status
              </p>

              <p className="mt-2 font-semibold capitalize text-gray-900">
                {business.status || "pending"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Onboarding
              </p>

              <p className="mt-2 font-semibold capitalize text-gray-900">
                {(
                  business.onboarding_status ||
                  "incomplete"
                ).replace(/_/g, " ")}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Store Status
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {business.is_open ? "Open" : "Closed"}
              </p>
            </div>

          </div>

        </div>

      </div>

      <div className="rounded-2xl border border-[#ead6dd] bg-white p-8 shadow-sm">

        <h3 className="text-xl font-bold text-gray-900">
          Business Owner
        </h3>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Full Name
            </p>

            <p className="mt-2 font-medium text-gray-900">
              {owner?.full_name || "Not available"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Email
            </p>

            <p className="mt-2 font-medium text-gray-900">
              {owner?.email || "Not available"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Account Role
            </p>

            <p className="mt-2 font-medium capitalize text-gray-900">
              {owner?.role || "Not available"}
            </p>
          </div>

        </div>

      </div>

      <div className="rounded-2xl border border-[#ead6dd] bg-white p-8 shadow-sm">

        <h3 className="text-xl font-bold text-gray-900">
          Admin Actions
        </h3>

        <p className="mt-2 text-gray-600">
          Manage the approval status of this business.
        </p>

        <div className="mt-6">
          <BusinessActions
            businessId={business.id}
            status={business.status}
          />
        </div>

        <div className="mt-5">
          <Link
            href="/admin/dashboard/businesses"
            className="inline-block rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to Businesses
          </Link>
        </div>

      </div>

    </div>
  );
}