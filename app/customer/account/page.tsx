import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export default async function CustomerAccountPage() {
  // =========================================
  // 1. CREATE SUPABASE SERVER CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET CURRENT AUTHENTICATED USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // =========================================
  // 3. PROTECT ACCOUNT PAGE
  // =========================================

  if (userError || !user) {
    redirect("/login");
  }

  // =========================================
  // 4. GET CUSTOMER PROFILE
  // =========================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, role, created_at"
    )
    .eq("id", user.id)
    .single();

  // =========================================
  // 5. VERIFY CUSTOMER PROFILE
  // =========================================

  if (
    profileError ||
    !profile ||
    profile.role !== "customer"
  ) {
    await supabase.auth.signOut();

    redirect("/login");
  }

  // =========================================
  // 6. CUSTOMER DISPLAY NAME
  // =========================================

  const customerName =
    profile.full_name ||
    user.email?.split("@")[0] ||
    "Customer";

  // =========================================
  // 7. FORMAT JOIN DATE
  // =========================================

  const joinedDate = profile.created_at
    ? new Date(
        profile.created_at
      ).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )
    : "Not available";

  return (
    <main className="min-h-screen bg-[#faf7f8]">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="bg-white border-b border-[#ead6dd]">

        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* ADADI LOGO */}

          <Link
            href="/customer/dashboard"
            className="text-2xl font-bold text-[#8B1E3F]"
          >
            ADADI
          </Link>

          {/* NAVIGATION */}

          <nav className="flex items-center gap-6">

            <Link
              href="/businesses"
              className="text-gray-600 hover:text-[#8B1E3F] transition"
            >
              Businesses
            </Link>

            <Link
              href="/customer/dashboard"
              className="text-gray-600 hover:text-[#8B1E3F] transition"
            >
              Dashboard
            </Link>

          </nav>

        </div>

      </header>

      {/* =========================================
          PAGE CONTENT
      ========================================= */}

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* PAGE HEADER */}

        <div className="mb-10">

          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            My Account
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Account Settings
          </h1>

          <p className="mt-3 text-lg text-gray-600">
            View and manage your ADADI account
            information.
          </p>

        </div>

        {/* =========================================
            PROFILE CARD
        ========================================= */}

        <div className="bg-white rounded-2xl border border-[#ead6dd] shadow-sm overflow-hidden">

          {/* CARD HEADER */}

          <div className="bg-[#8B1E3F] px-6 py-8">

            <div className="flex items-center gap-5">

              {/* AVATAR */}

              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">

                <span className="text-2xl font-bold text-[#8B1E3F]">
                  {customerName
                    .charAt(0)
                    .toUpperCase()}
                </span>

              </div>

              {/* NAME */}

              <div>

                <h2 className="text-2xl font-bold text-white">
                  {customerName}
                </h2>

                <p className="mt-1 text-[#f7e9ee]">
                  ADADI Customer
                </p>

              </div>

            </div>

          </div>

          {/* PROFILE INFORMATION */}

          <div className="p-6">

            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* FULL NAME */}

              <div>

                <p className="text-sm text-gray-500">
                  Full Name
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {profile.full_name ||
                    "Not provided"}
                </p>

              </div>

              {/* EMAIL */}

              <div>

                <p className="text-sm text-gray-500">
                  Email Address
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {profile.email ||
                    user.email ||
                    "Not provided"}
                </p>

              </div>

              {/* PHONE */}

              <div>

                <p className="text-sm text-gray-500">
                  Phone Number
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {profile.phone ||
                    "Not provided"}
                </p>

              </div>

              {/* ACCOUNT TYPE */}

              <div>

                <p className="text-sm text-gray-500">
                  Account Type
                </p>

                <p className="mt-1 font-medium text-[#8B1E3F]">
                  Customer
                </p>

              </div>

              {/* JOINED DATE */}

              <div>

                <p className="text-sm text-gray-500">
                  Member Since
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {joinedDate}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* =========================================
            ACCOUNT ACTIONS
        ========================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

          {/* BROWSE BUSINESSES */}

          <Link
            href="/businesses"
            className="bg-white rounded-2xl border border-[#ead6dd] p-6 hover:border-[#8B1E3F] hover:shadow-md transition"
          >

            <h3 className="text-lg font-bold text-gray-900">
              Explore Businesses
            </h3>

            <p className="mt-2 text-gray-600">
              Discover businesses and products
              available on ADADI.
            </p>

            <span className="inline-block mt-4 text-sm font-semibold text-[#8B1E3F]">
              Browse Businesses →
            </span>

          </Link>

          {/* DASHBOARD */}

          <Link
            href="/customer/dashboard"
            className="bg-white rounded-2xl border border-[#ead6dd] p-6 hover:border-[#8B1E3F] hover:shadow-md transition"
          >

            <h3 className="text-lg font-bold text-gray-900">
              Customer Dashboard
            </h3>

            <p className="mt-2 text-gray-600">
              Return to your ADADI customer
              dashboard.
            </p>

            <span className="inline-block mt-4 text-sm font-semibold text-[#8B1E3F]">
              Go to Dashboard →
            </span>

          </Link>

        </div>

      </div>

    </main>
  );
}