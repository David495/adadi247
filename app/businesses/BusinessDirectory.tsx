"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Search,
  MapPin,
  Store,
  X,
  ArrowRight,
} from "lucide-react";

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  phone: string | null;
  address: string | null;
  status: string | null;
  is_open: boolean | null;
};

type BusinessDirectoryProps = {
  businesses: Business[];
};

export default function BusinessDirectory({
  businesses,
}: BusinessDirectoryProps) {
  // =========================================
  // 1. SEARCH STATE
  // =========================================

  const [searchQuery, setSearchQuery] =
    useState("");

  // =========================================
  // 2. CATEGORY STATE
  // =========================================

  const [selectedCategory, setSelectedCategory] =
    useState("All Categories");

  // =========================================
  // 3. GET UNIQUE CATEGORIES
  // =========================================

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        businesses
          .map(
            (business) =>
              business.category
          )
          .filter(
            (
              category
            ): category is string =>
              Boolean(category)
          )
      )
    );

    return [
      "All Categories",
      ...uniqueCategories.sort(),
    ];
  }, [businesses]);

  // =========================================
  // 4. FILTER BUSINESSES
  // =========================================

  const filteredBusinesses =
    useMemo(() => {
      const normalizedSearch =
        searchQuery
          .trim()
          .toLowerCase();

      return businesses.filter(
        (business) => {
          // =========================================
          // SEARCH MATCH
          // =========================================

          const matchesSearch =
            !normalizedSearch ||
            business.name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            business.category
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            business.description
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            business.address
              ?.toLowerCase()
              .includes(
                normalizedSearch
              );

          // =========================================
          // CATEGORY MATCH
          // =========================================

          const matchesCategory =
            selectedCategory ===
              "All Categories" ||
            business.category ===
              selectedCategory;

          return (
            Boolean(matchesSearch) &&
            matchesCategory
          );
        }
      );
    }, [
      businesses,
      searchQuery,
      selectedCategory,
    ]);

  // =========================================
  // 5. CLEAR FILTERS
  // =========================================

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(
      "All Categories"
    );
  };

  // =========================================
  // 6. CHECK ACTIVE FILTERS
  // =========================================

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !==
      "All Categories";

  // =========================================
  // 7. RENDER
  // =========================================

  return (
    <main className="min-h-screen bg-[#faf7f8]">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="sticky top-0 z-20 border-b border-[#ead6dd] bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          {/* LOGO */}

          <Link
            href="/"
            className="text-2xl font-bold text-[#8B1E3F]"
          >
            ADADI
          </Link>

          {/* NAVIGATION */}

          <nav className="flex items-center gap-4 sm:gap-6">

            <Link
              href="/businesses"
              className="font-medium text-[#8B1E3F]"
            >
              Businesses
            </Link>

            <Link
              href="/customer/dashboard"
              className="text-gray-600 transition hover:text-[#8B1E3F]"
            >
              Dashboard
            </Link>

          </nav>

        </div>

      </header>


      {/* =========================================
          PAGE CONTENT
      ========================================= */}

      <div className="mx-auto max-w-7xl px-6 py-10 sm:py-12">

        {/* =========================================
            PAGE INTRO
        ========================================= */}

        <div className="max-w-3xl">

          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Discover on ADADI
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900 sm:text-5xl">
            Explore Businesses
          </h1>

          <p className="mt-4 text-lg leading-7 text-gray-600">
            Discover trusted businesses,
            products, and services available
            on ADADI.
          </p>

        </div>


        {/* =========================================
            SEARCH & FILTERS
        ========================================= */}

        <div className="mt-10 rounded-2xl border border-[#ead6dd] bg-white p-5 shadow-sm">

          <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">

            {/* SEARCH */}

            <div className="relative">

              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search businesses, categories, or locations..."
                className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-11 pr-10 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              )}

            </div>


            {/* CATEGORY FILTER */}

            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(
                  event.target.value
                )
              }
              className="h-12 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-700 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
            >

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}

            </select>


            {/* CLEAR FILTERS */}

            {hasActiveFilters ? (

              <button
                type="button"
                onClick={clearFilters}
                className="h-12 rounded-lg border border-[#8B1E3F] px-5 text-sm font-semibold text-[#8B1E3F] transition hover:bg-[#f7e9ee]"
              >
                Clear Filters
              </button>

            ) : (

              <div className="hidden md:block" />

            )}

          </div>

        </div>


        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-lg font-semibold text-gray-900">

              {filteredBusinesses.length}{" "}

              {filteredBusinesses.length ===
              1
                ? "Business"
                : "Businesses"}{" "}
              Available

            </h2>

            {hasActiveFilters && (
              <p className="mt-1 text-sm text-gray-500">
                Showing results based on
                your search and filters.
              </p>
            )}

          </div>


          {/* ACTIVE CATEGORY */}

          {selectedCategory !==
            "All Categories" && (

            <div className="flex items-center gap-2 text-sm text-gray-600">

              <span>
                Category:
              </span>

              <span className="rounded-full bg-[#f7e9ee] px-3 py-1 font-medium text-[#8B1E3F]">
                {selectedCategory}
              </span>

            </div>

          )}

        </div>


        {/* =========================================
            NO BUSINESSES IN DATABASE
        ========================================= */}

        {businesses.length === 0 ? (

          <div className="mt-8 rounded-2xl border border-[#ead6dd] bg-white p-12 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7e9ee]">

              <Store
                size={30}
                className="text-[#8B1E3F]"
              />

            </div>

            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              No businesses available yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-gray-600">
              We're working on bringing
              more businesses to ADADI.
              Please check back soon.
            </p>

            <Link
              href="/customer/dashboard"
              className="mt-6 inline-block rounded-lg bg-[#8B1E3F] px-6 py-3 font-semibold text-white transition hover:bg-[#64152E]"
            >
              Back to Dashboard
            </Link>

          </div>

        ) : filteredBusinesses.length ===
          0 ? (

          /* =========================================
             NO SEARCH RESULTS
          ========================================= */

          <div className="mt-8 rounded-2xl border border-[#ead6dd] bg-white p-12 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7e9ee]">

              <Search
                size={30}
                className="text-[#8B1E3F]"
              />

            </div>

            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              No businesses found
            </h2>

            <p className="mx-auto mt-3 max-w-md text-gray-600">
              We couldn't find any businesses
              matching your search or selected
              category.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-lg bg-[#8B1E3F] px-6 py-3 font-semibold text-white transition hover:bg-[#64152E]"
            >
              Clear Search & Filters
            </button>

          </div>

        ) : (

          /* =========================================
             BUSINESS GRID
          ========================================= */

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {filteredBusinesses.map(
              (business) => (

                <Link
                  key={business.id}
                  href={`/businesses/${business.slug}`}
                  className="group overflow-hidden rounded-2xl border border-[#ead6dd] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#8B1E3F] hover:shadow-lg"
                >

                  {/* =========================================
                      COVER IMAGE
                  ========================================= */}

                  <div className="relative h-44 overflow-hidden bg-[#f7e9ee]">

                    {business.cover_image_url ? (

                      <img
                        src={
                          business.cover_image_url
                        }
                        alt={
                          `${business.name} cover`
                        }
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                    ) : (

                      <div className="flex h-full w-full items-center justify-center">

                        <Store
                          size={52}
                          className="text-[#8B1E3F]/30"
                        />

                      </div>

                    )}


                    {/* OPEN STATUS */}

                    <div className="absolute right-4 top-4">

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
                          business.is_open
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {business.is_open
                          ? "Open"
                          : "Closed"}
                      </span>

                    </div>

                  </div>


                  {/* =========================================
                      BUSINESS INFO
                  ========================================= */}

                  <div className="p-6">

                    {/* BUSINESS IDENTITY */}

                    <div className="flex items-start gap-4">

                      {/* LOGO */}

                      <div className="relative -mt-12 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-[#f7e9ee] shadow-sm">

                        {business.logo_url ? (

                          <img
                            src={
                              business.logo_url
                            }
                            alt={
                              `${business.name} logo`
                            }
                            className="h-full w-full object-cover"
                          />

                        ) : (

                          <Store
                            size={24}
                            className="text-[#8B1E3F]"
                          />

                        )}

                      </div>


                      {/* BUSINESS NAME */}

                      <div className="min-w-0 flex-1">

                        <h2 className="truncate text-xl font-bold text-gray-900 transition group-hover:text-[#8B1E3F]">
                          {business.name}
                        </h2>

                        {business.category && (
                          <p className="mt-1 text-sm font-medium text-[#8B1E3F]">
                            {business.category}
                          </p>
                        )}

                      </div>

                    </div>


                    {/* DESCRIPTION */}

                    {business.description && (

                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-600">
                        {business.description}
                      </p>

                    )}


                    {/* ADDRESS */}

                    {business.address && (

                      <div className="mt-4 flex items-start gap-2 text-sm text-gray-500">

                        <MapPin
                          size={17}
                          className="mt-0.5 shrink-0"
                        />

                        <span className="line-clamp-2">
                          {business.address}
                        </span>

                      </div>

                    )}


                    {/* VIEW BUSINESS */}

                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">

                      <span className="text-sm font-semibold text-[#8B1E3F]">
                        View Business
                      </span>

                      <ArrowRight
                        size={18}
                        className="text-[#8B1E3F] transition-transform group-hover:translate-x-1"
                      />

                    </div>

                  </div>

                </Link>

              )
            )}

          </div>

        )}

      </div>

    </main>
  );
}