import Link from "next/link";
import {
  Home,
  Search,
  Store,
} from "lucide-react";

import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#faf7f7] text-gray-900">
      {/* =========================================
          NAVIGATION
          ========================================= */}

      <Navbar />

      {/* =========================================
          404 CONTENT
          ========================================= */}

      <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-20">
        <div className="w-full max-w-2xl text-center">
          {/* 404 ICON */}

          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#6b1224]/10">
            <Search className="h-10 w-10 text-[#6b1224]" />
          </div>

          {/* 404 NUMBER */}

          <p className="mt-8 text-7xl font-black tracking-tight text-[#6b1224] sm:text-8xl">
            404
          </p>

          {/* HEADING */}

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Page Not Found
          </h1>

          {/* DESCRIPTION */}

          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-gray-500 sm:text-lg">
            Sorry, we couldn't find the page you're
            looking for. It may have been moved,
            deleted, or the link you followed may
            be incorrect.
          </p>

          {/* BUTTONS */}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {/* HOME */}

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6b1224] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c]"
            >
              <Home className="h-4 w-4" />

              Go to Homepage
            </Link>

            {/* EXPLORE */}

            <Link
              href="/businesses"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#6b1224]/20 bg-[#6b1224]/5 px-6 py-3.5 text-sm font-semibold text-[#6b1224] transition hover:bg-[#6b1224]/10"
            >
              <Store className="h-4 w-4" />

              Explore Businesses
            </Link>
          </div>

          {/* HELPFUL MESSAGE */}

          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-[#6b1224]/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">
              Looking for something?
            </p>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Visit our marketplace to discover
              businesses and products available
              on ADADI.
            </p>

            <Link
              href="/businesses"
              className="mt-4 inline-block text-sm font-semibold text-[#6b1224] hover:underline"
            >
              Browse the marketplace →
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================
          FOOTER
          ========================================= */}

      <Footer />
    </main>
  );
}