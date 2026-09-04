import Link from "next/link";
import Image from "next/image";
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
    image: "/adadi-cloth.jpeg",
  },
  {
    name: "Food & Drinks",
    description: "Restaurants, snacks & groceries",
    image: "/adadi-food.jpeg",
  },
  {
    name: "Beauty",
    description: "Beauty, skincare & wellness",
    image: "/adadi-beauty.jpg",
  },
];

const benefits = [
  {
    icon: ShieldCheck,
    title: "Trusted Businesses",
    description: "Shop with confidence",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Safe & secure checkout",
  },
  {
    icon: Truck,
    title: "Flexible Delivery",
    description: "Delivery or pickup",
  },
  {
    icon: Users,
    title: "Support Local",
    description: "Grow local businesses",
  },
];

const steps = [
  {
    icon: Search,
    number: "01",
    title: "Discover",
    description:
      "Search and explore businesses, products and services available on ADADI.",
  },
  {
    icon: ShoppingBag,
    number: "02",
    title: "Shop",
    description:
      "Browse products, add your favourites to your cart and place your order with ease.",
  },
  {
    icon: Truck,
    number: "03",
    title: "Receive",
    description:
      "Choose delivery or pickup and receive your order directly from the business.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf7f7] text-gray-900">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#6b1224]">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 sm:h-96 sm:w-96" />
        <div className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-white/5 sm:h-96 sm:w-96" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-medium text-white backdrop-blur sm:px-4 sm:text-sm">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Discover local businesses on ADADI</span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Discover.
              <br />
              <span className="text-white/75">
                Shop. Support Local.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/70 sm:mt-6 sm:text-lg sm:leading-7">
              ADADI connects you with businesses around you.
              Discover products, explore local shops, and order
              what you need from businesses you can trust.
            </p>

            <div className="mx-auto mt-8 max-w-2xl sm:mt-10">
              <form
                action="/businesses"
                method="GET"
                className="rounded-2xl bg-white p-2 shadow-2xl"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-4">
                    <Search className="h-5 w-5 shrink-0 text-gray-400" />

                    <input
                      type="text"
                      name="search"
                      placeholder="Search businesses or products..."
                      className="h-12 min-w-0 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6b1224] px-7 text-sm font-semibold text-white transition hover:bg-[#53101c] active:scale-[0.98] sm:w-auto"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/65 sm:text-sm">
              <span>Popular:</span>

              <Link
                href="/businesses?category=Fashion"
                className="underline-offset-4 transition hover:text-white hover:underline"
              >
                Fashion
              </Link>

              <Link
                href="/businesses?category=Food%20%26%20Drinks"
                className="underline-offset-4 transition hover:text-white hover:underline"
              >
                Food
              </Link>

              <Link
                href="/businesses?category=Electronics"
                className="underline-offset-4 transition hover:text-white hover:underline"
              >
                Electronics
              </Link>

              <Link
                href="/businesses?category=Beauty"
                className="underline-offset-4 transition hover:text-white hover:underline"
              >
                Beauty
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <div
                key={benefit.title}
                className={`flex items-center gap-3 px-4 py-5 sm:px-6 sm:py-6 ${
                  index < 2
                    ? "border-b border-gray-200 lg:border-b-0"
                    : ""
                } ${
                  index % 2 === 0
                    ? "border-r border-gray-200 lg:border-r"
                    : "lg:border-r"
                } ${
                  index === 1
                    ? "lg:border-r"
                    : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6b1224]/10">
                  <Icon className="h-5 w-5 text-[#6b1224]" />
                </div>

                <div>
                  <p className="text-xs font-bold sm:text-sm">
                    {benefit.title}
                  </p>

                  <p className="mt-0.5 hidden text-xs text-gray-500 sm:block">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b1224] sm:text-sm">
                Explore
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
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
              className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-[#6b1224] transition hover:gap-3 sm:flex"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/businesses?category=${encodeURIComponent(
                  category.name
                )}`}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-[#6b1224]/20 hover:shadow-xl"
              >
                <div className="relative h-44 w-full overflow-hidden bg-[#faf7f7] sm:h-52">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#6b1224] backdrop-blur">
                      Explore
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold">
                      {category.name}
                    </h3>

                    <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#6b1224]" />
                  </div>

                  <p className="mt-1.5 text-xs leading-5 text-gray-500 sm:text-sm">
                    {category.description}
                  </p>
                </div>
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

      {/* How it works */}
      <section className="border-y border-gray-200 bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b1224] sm:text-sm">
              Simple & convenient
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              How ADADI works
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-500 sm:mt-4 sm:text-base">
              Everything you need to discover and shop from
              local businesses, all in one place.
            </p>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8 lg:mt-14">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="group text-center"
                >
                  <div className="relative mx-auto w-fit">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6b1224] text-white shadow-lg shadow-[#6b1224]/20 transition duration-300 group-hover:-translate-y-1">
                      <Icon className="h-7 w-7" />
                    </div>

                    <span className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#faf7f7] text-[10px] font-bold text-[#6b1224] shadow-sm">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold">
                    {step.title}
                  </h3>

                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Business CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#6b1224]">
          <div className="relative px-6 py-12 sm:px-12 sm:py-16 lg:px-20 lg:py-20">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5" />
            <div className="absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-white/5" />

            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center lg:gap-12">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white sm:text-sm">
                  <Store className="h-4 w-4" />
                  Grow your business with ADADI
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Ready to take your business online?
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                  Create your ADADI business profile, showcase
                  your products and reach more customers.
                </p>
              </div>

              <Link
                href="/business-login"
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#6b1224] transition hover:bg-gray-100 active:scale-[0.98] sm:w-auto"
              >
                Start Selling
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}