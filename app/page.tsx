import Link from "next/link";

import {
  ArrowRight,
  Search,
  ShoppingBag,
  ShieldCheck,
  Truck,
  CreditCard,
  Users,
  Store,
  Sparkles,
} from "lucide-react";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

const categories = [
  {
    name: "Fashion",
    description: "Clothing, shoes & accessories",
    icon: "👗",
  },
  {
    name: "Food & Drinks",
    description: "Restaurants, snacks & groceries",
    icon: "🍔",
  },
  {
    name: "Beauty",
    description: "Beauty, skincare & wellness",
    icon: "💄",
  },
  {
    name: "Electronics",
    description: "Phones, gadgets & accessories",
    icon: "📱",
  },
  {
    name: "Home & Living",
    description: "Furniture & home essentials",
    icon: "🏠",
  },
  {
    name: "Services",
    description: "Professional & local services",
    icon: "🛠️",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf7f7] text-gray-900">
      <Navbar />

      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative overflow-hidden bg-[#6b1224]">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-white/5" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">

            {/* BADGE */}
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              <Sparkles className="h-4 w-4" />
              <span>Discover local businesses on ADADI</span>
            </div>

            {/* HEADING */}
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-7xl">
              Discover.
              <br />
              <span className="text-white/80">
                Shop. Support Local.
              </span>
            </h1>

            {/* DESCRIPTION */}
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              ADADI connects you with businesses around you.
              Discover products, explore local shops, and
              order what you need from businesses you can trust.
            </p>

            {/* SEARCH */}
            <div className="mx-auto mt-10 max-w-2xl">
              <form
                action="/businesses"
                method="GET"
                className="flex flex-col gap-3 rounded-2xl bg-white p-2 shadow-2xl sm:flex-row"
              >
                <div className="flex flex-1 items-center gap-3 px-4">
                  <Search className="h-5 w-5 shrink-0 text-gray-400" />

                  <input
                    type="text"
                    name="search"
                    placeholder="Search for businesses or products..."
                    className="h-12 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#6b1224] px-7 text-sm font-semibold text-white transition hover:bg-[#53101c]"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </form>
            </div>

            {/* QUICK LINK */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
              <span>Popular:</span>

              <Link
                href="/businesses?category=Fashion"
                className="underline-offset-4 hover:text-white hover:underline"
              >
                Fashion
              </Link>

              <Link
                href="/businesses?category=Food"
                className="underline-offset-4 hover:text-white hover:underline"
              >
                Food
              </Link>

              <Link
                href="/businesses?category=Electronics"
                className="underline-offset-4 hover:text-white hover:underline"
              >
                Electronics
              </Link>

              <Link
                href="/businesses?category=Beauty"
                className="underline-offset-4 hover:text-white hover:underline"
              >
                Beauty
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          TRUST BAR
      ====================================================== */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-gray-200 sm:grid-cols-4">

          <div className="flex items-center justify-center gap-3 px-4 py-6">
            <ShieldCheck className="h-6 w-6 text-[#6b1224]" />

            <div>
              <p className="text-sm font-semibold">
                Trusted Businesses
              </p>

              <p className="hidden text-xs text-gray-500 sm:block">
                Shop with confidence
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 px-4 py-6">
            <CreditCard className="h-6 w-6 text-[#6b1224]" />

            <div>
              <p className="text-sm font-semibold">
                Secure Payments
              </p>

              <p className="hidden text-xs text-gray-500 sm:block">
                Safe & secure checkout
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 px-4 py-6">
            <Truck className="h-6 w-6 text-[#6b1224]" />

            <div>
              <p className="text-sm font-semibold">
                Flexible Delivery
              </p>

              <p className="hidden text-xs text-gray-500 sm:block">
                Delivery or pickup
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 px-4 py-6">
            <Users className="h-6 w-6 text-[#6b1224]" />

            <div>
              <p className="text-sm font-semibold">
                Support Local
              </p>

              <p className="hidden text-xs text-gray-500 sm:block">
                Grow local businesses
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* =====================================================
          CATEGORIES
      ====================================================== */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#6b1224]">
                Explore
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Shop by category
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
                Find exactly what you're looking for from
                businesses offering products and services you
                love.
              </p>
            </div>

            <Link
              href="/businesses"
              className="hidden items-center gap-2 text-sm font-semibold text-[#6b1224] sm:flex"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/businesses?category=${encodeURIComponent(
                  category.name
                )}`}
                className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-1 hover:border-[#6b1224]/20 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#faf7f7] text-2xl transition group-hover:bg-[#6b1224]/10">
                  {category.icon}
                </div>

                <h3 className="mt-4 text-sm font-bold">
                  {category.name}
                </h3>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {category.description}
                </p>
              </Link>
            ))}
          </div>

          <Link
            href="/businesses"
            className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[#6b1224] sm:hidden"
          >
            View all businesses
            <ArrowRight className="h-4 w-4" />
          </Link>

        </div>
      </section>

      {/* =====================================================
          HOW ADADI WORKS
      ====================================================== */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-[#6b1224]">
              Simple & convenient
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              How ADADI works
            </h2>

            <p className="mt-4 text-sm leading-6 text-gray-500 sm:text-base">
              Everything you need to discover and shop from
              local businesses, all in one place.
            </p>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">

            <div className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6b1224] text-white shadow-lg shadow-[#6b1224]/20">
                <Search className="h-7 w-7" />
              </div>

              <span className="mt-5 block text-xs font-bold uppercase tracking-wider text-[#6b1224]">
                Step 01
              </span>

              <h3 className="mt-2 text-xl font-bold">
                Discover
              </h3>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
                Search and explore businesses, products and
                services available on ADADI.
              </p>
            </div>

            <div className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6b1224] text-white shadow-lg shadow-[#6b1224]/20">
                <ShoppingBag className="h-7 w-7" />
              </div>

              <span className="mt-5 block text-xs font-bold uppercase tracking-wider text-[#6b1224]">
                Step 02
              </span>

              <h3 className="mt-2 text-xl font-bold">
                Shop
              </h3>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
                Browse products, add your favourites to your
                cart and place your order with ease.
              </p>
            </div>

            <div className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6b1224] text-white shadow-lg shadow-[#6b1224]/20">
                <Truck className="h-7 w-7" />
              </div>

              <span className="mt-5 block text-xs font-bold uppercase tracking-wider text-[#6b1224]">
                Step 03
              </span>

              <h3 className="mt-2 text-xl font-bold">
                Receive
              </h3>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
                Choose delivery or pickup and receive your
                order directly from the business.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          BUSINESS CTA
      ====================================================== */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#6b1224]">

          <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:px-20">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />

            <div className="relative flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">

              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
                  <Store className="h-4 w-4" />
                  Grow your business with ADADI
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Ready to take your business online?
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                  Create your ADADI business profile, showcase
                  your products and reach more customers.
                </p>
              </div>

              <Link
                href="/business-login"
                className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#6b1224] transition hover:bg-gray-100"
              >
                Start Selling
                <ArrowRight className="h-4 w-4" />
              </Link>

            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <Footer />
    </main>
  );
}