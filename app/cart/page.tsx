"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Store,
} from "lucide-react";

import { useCart } from "@/app/components/cart/CartProvider";

export default function CartPage() {
  const {
    items,
    itemCount,
    subtotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  // =========================================
  // EMPTY CART
  // =========================================

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#faf7f7]">
        {/* =========================================
            ADADI NAVIGATION
        ========================================= */}

        <header className="sticky top-0 z-50 border-b border-[#5b1020]/20 bg-[#6b1224] text-white shadow-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#6b1224]">
                <Store className="h-5 w-5" />
              </div>

              <span className="text-xl font-bold tracking-tight">
                ADADI
              </span>
            </Link>

            <Link
              href="/businesses"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />

              <span className="hidden sm:inline">
                Back to Marketplace
              </span>

              <span className="sm:hidden">
                Back
              </span>
            </Link>
          </div>
        </header>

        {/* =========================================
            EMPTY CART CONTENT
        ========================================= */}

        <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#6b1224]/10">
              <ShoppingBag className="h-9 w-9 text-[#6b1224]" />
            </div>

            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Your cart is empty
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              You haven't added any products to your cart
              yet. Explore ADADI and find something you
              love.
            </p>

            <Link
              href="/businesses"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#6b1224] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c]"
            >
              Explore Marketplace
            </Link>
          </div>
        </section>

        {/* =========================================
            FOOTER
        ========================================= */}

        <footer className="border-t border-[#6b1224]/10 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 text-center sm:px-6 lg:px-8">
            <p className="font-bold text-[#6b1224]">
              ADADI
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Discover and shop from local businesses.
            </p>
          </div>
        </footer>
      </main>
    );
  }

  // =========================================
  // CART WITH ITEMS
  // =========================================

  return (
    <main className="min-h-screen bg-[#faf7f7]">
      {/* =========================================
          ADADI NAVIGATION
      ========================================= */}

      <header className="sticky top-0 z-50 border-b border-[#5b1020]/20 bg-[#6b1224] text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ADADI LOGO */}

          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#6b1224]">
              <Store className="h-5 w-5" />
            </div>

            <span className="text-xl font-bold tracking-tight">
              ADADI
            </span>
          </Link>

          {/* CART COUNT */}

          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <ShoppingBag className="h-5 w-5" />

            <span>
              {itemCount}{" "}
              {itemCount === 1
                ? "Item"
                : "Items"}
            </span>
          </div>
        </div>
      </header>

      {/* =========================================
          MAIN CART CONTENT
      ========================================= */}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* =========================================
            PAGE HEADER
        ========================================= */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={`/businesses/${items[0].businessSlug}`}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#6b1224] transition hover:text-[#53101c]"
            >
              <ArrowLeft className="h-4 w-4" />

              Continue Shopping
            </Link>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Your Cart
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Review your products before checkout.
            </p>
          </div>

          {/* CLEAR CART */}

          <button
            type="button"
            onClick={clearCart}
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-red-600 transition hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />

            Clear Cart
          </button>
        </div>

        {/* =========================================
            BUSINESS NOTICE
        ========================================= */}

        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-[#6b1224]/10 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6b1224]/10">
            <Store className="h-5 w-5 text-[#6b1224]" />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">
              Shopping from {items[0].businessName}
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              ADADI currently supports one business per
              cart. Complete this order before shopping
              from another business.
            </p>
          </div>
        </div>

        {/* =========================================
            CART GRID
        ========================================= */}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* =========================================
              CART ITEMS
          ========================================= */}

          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex gap-4 sm:gap-5">
                  {/* PRODUCT IMAGE */}

                  <Link
                    href={`/businesses/${item.businessSlug}/products/${item.slug}`}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f3eeee] sm:h-32 sm:w-32"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </Link>

                  {/* PRODUCT DETAILS */}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/businesses/${item.businessSlug}/products/${item.slug}`}
                          className="line-clamp-2 font-semibold text-gray-900 transition hover:text-[#6b1224]"
                        >
                          {item.name}
                        </Link>

                        <p className="mt-1 text-xs text-gray-500">
                          {item.businessName}
                        </p>
                      </div>

                      {/* REMOVE */}

                      <button
                        type="button"
                        onClick={() =>
                          removeFromCart(item.id)
                        }
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* PRICE */}

                    <p className="mt-3 text-lg font-bold text-[#6b1224]">
                      ₦
                      {item.price.toLocaleString()}
                    </p>

                    {/* QUANTITY CONTROLS */}

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(item.id)
                          }
                          className="flex h-9 w-9 items-center justify-center text-gray-600 transition hover:bg-[#6b1224]/5 hover:text-[#6b1224]"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <span className="flex h-9 min-w-10 items-center justify-center border-x border-gray-200 px-3 text-sm font-semibold text-gray-900">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(item.id)
                          }
                          className="flex h-9 w-9 items-center justify-center text-gray-600 transition hover:bg-[#6b1224]/5 hover:text-[#6b1224]"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* ITEM TOTAL */}

                      <p className="text-sm font-semibold text-gray-900">
                        ₦
                        {(
                          item.price *
                          item.quantity
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* =========================================
              ORDER SUMMARY
          ========================================= */}

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                Order Summary
              </h2>

              {/* SUMMARY DETAILS */}

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Items
                  </span>

                  <span className="font-medium text-gray-900">
                    {itemCount}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="font-medium text-gray-900">
                    ₦
                    {subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Delivery
                  </span>

                  <span className="font-medium text-gray-900">
                    Calculated at checkout
                  </span>
                </div>
              </div>

              {/* DIVIDER */}

              <div className="my-6 h-px bg-gray-200" />

              {/* TOTAL */}

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">
                  Total
                </span>

                <span className="text-2xl font-bold text-[#6b1224]">
                  ₦
                  {subtotal.toLocaleString()}
                </span>
              </div>

              {/* CHECKOUT BUTTON */}

              <Link
                href="/checkout"
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#6b1224] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c]"
              >
                Proceed to Checkout
              </Link>

              {/* CONTINUE SHOPPING */}

              <Link
                href={`/businesses/${items[0].businessSlug}`}
                className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#6b1224]/20 px-6 py-3.5 text-sm font-semibold text-[#6b1224] transition hover:bg-[#6b1224]/5"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="border-t border-[#6b1224]/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div>
            <p className="font-bold text-[#6b1224]">
              ADADI
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Discover and shop from local businesses.
            </p>
          </div>

          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ADADI. All
            rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}