"use client";

import Link from "next/link";
import { ShoppingBag, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

type Product = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

type ProductPriceFilterProps = {
  products: Product[];
  businessSlug: string;
};

type PriceFilter =
  | "all"
  | "under-1000"
  | "1000-2000"
  | "2000-5000"
  | "5000-10000"
  | "10000-plus";

const priceFilters: {
  value: PriceFilter;
  label: string;
}[] = [
  {
    value: "all",
    label: "All prices",
  },
  {
    value: "under-1000",
    label: "Under ₦1,000",
  },
  {
    value: "1000-2000",
    label: "₦1,000 – ₦2,000",
  },
  {
    value: "2000-5000",
    label: "₦2,000 – ₦5,000",
  },
  {
    value: "5000-10000",
    label: "₦5,000 – ₦10,000",
  },
  {
    value: "10000-plus",
    label: "₦10,000+",
  },
];

export default function ProductPriceFilter({
  products,
  businessSlug,
}: ProductPriceFilterProps) {
  const [selectedPrice, setSelectedPrice] =
    useState<PriceFilter>("all");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const price = Number(product.price);

      switch (selectedPrice) {
        case "under-1000":
          return price < 1000;

        case "1000-2000":
          return price >= 1000 && price <= 2000;

        case "2000-5000":
          return price > 2000 && price <= 5000;

        case "5000-10000":
          return price > 5000 && price <= 10000;

        case "10000-plus":
          return price > 10000;

        case "all":
        default:
          return true;
      }
    });
  }, [products, selectedPrice]);

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-[#6b1224]/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-[#6b1224]" />

            <span className="text-sm font-semibold text-gray-900">
              Filter by price
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={selectedPrice}
              onChange={(event) =>
                setSelectedPrice(
                  event.target.value as PriceFilter
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none transition focus:border-[#6b1224] focus:ring-2 focus:ring-[#6b1224]/10 sm:min-w-64"
              aria-label="Filter products by price"
            >
              {priceFilters.map((filter) => (
                <option
                  key={filter.value}
                  value={filter.value}
                >
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {filteredProducts.length}
            </span>{" "}
            {filteredProducts.length === 1
              ? "product"
              : "products"}
          </p>

          {selectedPrice !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedPrice("all")}
              className="text-sm font-semibold text-[#6b1224] transition hover:text-[#53101c]"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#6b1224]/20 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6b1224]/10">
            <ShoppingBag className="h-7 w-7 text-[#6b1224]" />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-gray-900">
            No products in this price range
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
            Try selecting a different price range to see more
            products.
          </p>

          <button
            type="button"
            onClick={() => setSelectedPrice("all")}
            className="mt-5 rounded-xl bg-[#6b1224] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#53101c]"
          >
            Show all products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/businesses/${businessSlug}/products/${product.slug}`}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#6b1224]/20 hover:shadow-xl"
            >
              <div className="relative aspect-square overflow-hidden bg-[#f3eeee]">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <ShoppingBag className="h-10 w-10" />
                      <span className="text-sm">
                        No image
                      </span>
                    </div>
                  </div>
                )}

                <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-green-700 shadow-sm backdrop-blur">
                  Available
                </div>
              </div>

              <div className="p-5">
                <h3 className="line-clamp-1 text-lg font-semibold text-gray-900 transition-colors group-hover:text-[#6b1224]">
                  {product.name}
                </h3>

                {product.description && (
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-gray-500">
                    {product.description}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-xl font-bold text-[#6b1224]">
                    ₦{Number(product.price).toLocaleString()}
                  </span>

                  <span className="rounded-lg bg-[#6b1224] px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-[#53101c]">
                    View
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}