import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Store,
  Users,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";

import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#faf7f7] text-gray-900">
      <Navbar />

      <section className="relative overflow-hidden bg-[#6b1224] text-white">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-white/5" />

        <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-white/5" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              About ADADI
            </p>

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              A marketplace built to connect businesses and customers.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              ADADI makes it easier for businesses to showcase their
              products online and for customers to discover, shop,
              and connect with businesses in one convenient place.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#6b1224]">
              Our Story
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Making it easier to buy and sell online.
            </h2>

            <div className="mt-6 space-y-5 text-base leading-7 text-gray-600">
              <p>
                ADADI was created with a simple idea: businesses
                should have a place where they can easily reach
                customers, and customers should have an easier way
                to discover businesses and the products they offer.
              </p>

              <p>
                Whether you are a growing business looking for more
                customers or a shopper searching for something you
                need, ADADI brings both sides together in one
                marketplace.
              </p>

              <p>
                Our goal is to help businesses build their online
                presence while creating a simple and convenient
                shopping experience for customers.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-[#faf7f7] p-8 sm:p-10">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <ShoppingBag className="h-8 w-8 text-[#6b1224]" />

                <h3 className="mt-4 text-lg font-bold">
                  For Customers
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Discover businesses and find products from
                  different sellers in one marketplace.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <Store className="h-8 w-8 text-[#6b1224]" />

                <h3 className="mt-4 text-lg font-bold">
                  For Businesses
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Create your business presence, showcase your
                  products, and reach more customers online.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          WHAT WE DO
      ========================================= */}

      <section className="bg-[#faf7f7] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#6b1224]">
              What We Do
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need in one marketplace.
            </h2>

            <p className="mt-4 text-base leading-7 text-gray-600">
              ADADI is designed to make the connection between
              businesses and customers simple, accessible, and
              convenient.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <Store className="h-6 w-6 text-[#6b1224]" />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Business Stores
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Businesses can create their own presence on ADADI
                and showcase what they offer.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <ShoppingBag className="h-6 w-6 text-[#6b1224]" />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Easy Shopping
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Customers can explore businesses and products
                and place orders through the marketplace.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <ShieldCheck className="h-6 w-6 text-[#6b1224]" />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Secure Payments
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                We aim to provide a secure payment experience that
                makes transactions between customers and businesses
                easier.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <Users className="h-6 w-6 text-[#6b1224]" />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Growing Community
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                We are building a marketplace where businesses
                and customers can connect and grow together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          WHY ADADI
      ========================================= */}

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#6b1224]">
                Why ADADI
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Built with businesses and customers in mind.
              </h2>

              <p className="mt-5 text-base leading-7 text-gray-600">
                We believe that technology should make commerce
                easier, not more complicated. ADADI brings the
                essential tools businesses need to get discovered
                together with a convenient shopping experience for
                customers.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Simple business onboarding",
                  "Dedicated online business presence",
                  "Easy product discovery",
                  "Convenient customer ordering",
                  "Secure online payment experience",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#6b1224]" />

                    <span className="text-sm font-medium text-gray-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-[#6b1224] p-8 text-white shadow-xl sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-wider text-white/70">
                Our Vision
              </p>

              <h3 className="mt-4 text-3xl font-bold">
                A marketplace where every business can be discovered.
              </h3>

              <p className="mt-5 leading-7 text-white/80">
                We envision a future where businesses of all sizes
                can establish an online presence, connect with
                customers, and grow their reach without unnecessary
                complexity.
              </p>

              <Link
                href="/businesses"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-[#6b1224] transition hover:bg-gray-100"
              >
                Explore Businesses

                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          BUSINESS CTA
      ========================================= */}

      <section className="bg-[#faf7f7] py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to grow your business?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
            Join ADADI and start building your online business
            presence today.
          </p>

          <Link
            href="/business-login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#6b1224] px-7 py-4 text-sm font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c]"
          >
            Sell on ADADI

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* =========================================
          FOOTER
      ========================================= */}

      <Footer />
    </main>
  );
}