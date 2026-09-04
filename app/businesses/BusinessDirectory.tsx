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

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";


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
  status: string;
  is_open: boolean;
};

type Product = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
};

type BusinessDirectoryProps = {
  businesses: Business[];
  products: Product[];
};

export default function BusinessDirectory({
  businesses,
  products,
}: BusinessDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = useMemo<string[]>(() => {
    const uniqueCategories = Array.from(
      new Set(
        businesses
          .map((business) => business.category)
          .filter(
            (category): category is string =>
              Boolean(category)
          )
      )
    );

    return ["All", ...uniqueCategories];
  }, [businesses]);

  const productsByBusiness = useMemo(() => {
    const map = new Map<string, Product[]>();

    products.forEach((product) => {
      const existing = map.get(product.business_id) || [];
      existing.push(product);
      map.set(product.business_id, existing);
    });

    return map;
  }, [products]);

  const filteredBusinesses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return businesses.filter((business) => {
      const businessProducts =
        productsByBusiness.get(business.id) || [];

      const matchesBusinessSearch =
        !query ||
        business.name.toLowerCase().includes(query) ||
        business.category?.toLowerCase().includes(query) ||
        business.description?.toLowerCase().includes(query) ||
        business.address?.toLowerCase().includes(query);

      const matchesProductSearch =
        !query ||
        businessProducts.some(
          (product) =>
            product.name.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query)
        );

      const matchesSearch =
        matchesBusinessSearch || matchesProductSearch;

      const matchesCategory =
        selectedCategory === "All" ||
        business.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [
    businesses,
    productsByBusiness,
    searchQuery,
    selectedCategory,
  ]);

  const getMatchingProducts = (businessId: string) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return [];

    const businessProducts =
      productsByBusiness.get(businessId) || [];

    return businessProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
    );
  };

  return (
    <>
      <Navbar/>
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B1E3F] text-white">
              <Store size={23} />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Discover Businesses
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
              Discover local businesses and the products they
              offer on ADADI.
            </p>

            <div className="relative mt-7">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Search businesses or products..."
                className="h-13 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:bg-white focus:ring-2 focus:ring-[#8B1E3F]/10"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
              {filteredBusinesses.length}{" "}
              {filteredBusinesses.length === 1
                ? "Business"
                : "Businesses"}
            </h2>

            {searchQuery && (
              <p className="mt-1 text-sm text-gray-500">
                Results for "{searchQuery}"
              </p>
            )}
          </div>

          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(category)
                  }
                  className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                    selectedCategory === category
                      ? "bg-[#8B1E3F] text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-[#8B1E3F]/30 hover:text-[#8B1E3F]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredBusinesses.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Store
                size={26}
                className="text-gray-400"
              />
            </div>

            <h3 className="mt-4 text-base font-semibold text-gray-900">
              No businesses found
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Try searching for another business, product, or
              category.
            </p>

            {(searchQuery ||
              selectedCategory !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-5 rounded-lg bg-[#8B1E3F] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#64152E]"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBusinesses.map((business) => {
              const matchingProducts =
                getMatchingProducts(business.id);

              return (
                <Link
                  key={business.id}
                  href={`/businesses/${business.slug}`}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                >
                  <div className="relative h-44 overflow-hidden bg-gray-100">
                    {business.cover_image_url ? (
                      <img
                        src={business.cover_image_url}
                        alt={business.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gray-100">
                        <Store
                          size={40}
                          className="text-gray-300"
                        />
                      </div>
                    )}

                    <div className="absolute left-4 top-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          business.is_open
                            ? "bg-white text-green-700"
                            : "bg-white text-gray-600"
                        }`}
                      >
                        {business.is_open
                          ? "Open"
                          : "Closed"}
                      </span>
                    </div>

                    {matchingProducts.length > 0 && (
                      <div className="absolute bottom-4 left-4 rounded-full bg-[#8B1E3F] px-3 py-1.5 text-xs font-medium text-white shadow-sm">
                        {matchingProducts.length}{" "}
                        {matchingProducts.length === 1
                          ? "matching product"
                          : "matching products"}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-3">
                      {business.logo_url ? (
                        <img
                          src={business.logo_url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl border border-gray-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8B1E3F]/10 text-[#8B1E3F]">
                          <Store size={20} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-gray-900 transition group-hover:text-[#8B1E3F]">
                          {business.name}
                        </h3>

                        <p className="mt-0.5 text-sm text-[#8B1E3F]">
                          {business.category || "Other"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-500">
                      {business.description ||
                        "No description available."}
                    </p>

                    {business.address && (
                      <div className="mt-4 flex items-start gap-2 text-sm text-gray-500">
                        <MapPin
                          size={16}
                          className="mt-0.5 shrink-0 text-gray-400"
                        />

                        <span className="line-clamp-2">
                          {business.address}
                        </span>
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                      <span className="text-sm font-medium text-gray-700 transition group-hover:text-[#8B1E3F]">
                        View Business
                      </span>

                      <ArrowRight
                        size={17}
                        className="text-[#8B1E3F] transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      </main>
      <Footer/>
    </>
  );
}