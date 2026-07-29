import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

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
} = await supabase.auth.getUser();

if (!user) {
return ( <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] p-6"> <div className="w-full max-w-lg rounded-2xl border border-[#ead6dd] bg-white p-8 text-center shadow-sm">

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
  </main>
);
}

const {
data: profile,
error: profileError,
} = await supabase
.from("profiles")
.select(
"id, full_name, email, role"
)
.eq("id", user.id)
.maybeSingle();

if (
profileError ||
!profile ||
profile.role !== "admin"
) {
return ( <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] p-6"> <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
        !
      </div>

      <h1 className="mt-5 text-2xl font-bold text-gray-900">
        Access Denied
      </h1>

      <p className="mt-3 text-gray-600">
        You are not authorized to access the admin business management area.
      </p>

      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-[#64152E] px-6 py-3 font-semibold text-white transition hover:bg-[#8B1E3F]"
      >
        Go Home
      </Link>

    </div>
  </main>
);


}

const {
data: business,
error: businessError,
} = await supabase
.from("businesses")
.select(
`         id,
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
  <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] p-6">

    <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">

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

  </main>
);


}

if (!business) {
notFound();
}

const {
data: owner,
} = await supabase
.from("profiles")
.select(
"id, full_name, email, role"
)
.eq(
"id",
business.owner_id
)
.maybeSingle();

const isActive =
business.status === "active";

const isSuspended =
business.status === "suspended";


return ( <main className="min-h-screen bg-[#faf7f8]">


  <header className="border-b border-[#ead6dd] bg-white">

    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

      <div className="flex items-center gap-4">

        <Link
          href="/admin/dashboard/businesses"
          className="text-sm font-medium text-gray-600 transition hover:text-[#8B1E3F]"
        >
          ← Back to Businesses
        </Link>

        <span className="text-gray-300">
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

  </header>

  <div className="mx-auto max-w-7xl px-6 py-10">

    <div className="mb-8">

      <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
        Business Management
      </p>

      <h2 className="mt-2 text-3xl font-bold text-gray-900">
        Review Business
      </h2>

      <p className="mt-2 text-gray-600">
        Review the business information and manage its activation status.
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
              isActive
                ? "bg-green-100 text-green-700"
                : isSuspended
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {business.status || "pending"}
          </span>

        </div>

      </div>

    </div>

    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

      <div className="lg:col-span-2 rounded-2xl border border-[#ead6dd] bg-white p-8 shadow-sm">

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
              {business.category ||
                "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Phone
            </p>

            <p className="mt-2 font-medium text-gray-900">
              {business.phone ||
                "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Address
            </p>

            <p className="mt-2 font-medium text-gray-900">
              {business.address ||
                "Not provided"}
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
              {business.status ||
                "Pending"}
            </p>

          </div>

          <div className="rounded-xl bg-gray-50 p-4">

            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Onboarding
            </p>

            <p className="mt-2 font-semibold capitalize text-gray-900">
              {business.onboarding_status ||
                "Incomplete"}
            </p>

          </div>

          <div className="rounded-xl bg-gray-50 p-4">

            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Store Status
            </p>

            <p className="mt-2 font-semibold text-gray-900">
              {business.is_open
                ? "Open"
                : "Closed"}
            </p>

          </div>

        </div>

      </div>

    </div>

    <div className="mt-6 rounded-2xl border border-[#ead6dd] bg-white p-8 shadow-sm">

      <h3 className="text-xl font-bold text-gray-900">
        Business Owner
      </h3>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Full Name
          </p>

          <p className="mt-2 font-medium text-gray-900">
            {owner?.full_name ||
              "Not available"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Email
          </p>

          <p className="mt-2 font-medium text-gray-900">
            {owner?.email ||
              "Not available"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Account Role
          </p>

          <p className="mt-2 font-medium capitalize text-gray-900">
            {owner?.role ||
              "Not available"}
          </p>
        </div>

      </div>

    </div>

    <div className="mt-6 rounded-2xl border border-[#ead6dd] bg-white p-8 shadow-sm">

      <h3 className="text-xl font-bold text-gray-900">
        Admin Actions
      </h3>

      <p className="mt-2 text-gray-600">
        Manage the activation status of this business.
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

</main>


);
}