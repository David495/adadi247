"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  X,
} from "lucide-react";

import LogoutButton from "./businesses/LogoutButton";

type Props = {
  businessName: string;
  open: boolean;
  onClose: () => void;
};

export default function MobileBusinessSidebar({
  businessName,
  open,
  onClose,
}: Props) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[280px] max-w-[85vw] flex-col bg-[#64152E] text-white shadow-2xl transition-transform duration-300 lg:hidden ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/dashboard/businesses"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <span className="text-2xl font-bold tracking-tight">
              ADADI
            </span>

            <span className="h-2 w-2 rounded-full bg-[#D4A017]" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="p-4">
            <div className="mb-7">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
                Business
              </p>

              <div className="space-y-1">
                <Link
                  href="/dashboard/businesses"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <LayoutDashboard size={19} />
                  Overview
                </Link>

                <Link
                  href="/dashboard/businesses/products"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <Package size={19} />
                  Products & Services
                </Link>

                <Link
                  href="/dashboard/businesses/orders"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <ShoppingBag size={19} />
                  Orders
                </Link>

                <Link
                  href="/dashboard/businesses/customers"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <Users size={19} />
                  Customers
                </Link>

                <Link
                  href="/dashboard/businesses/analytics"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <BarChart3 size={19} />
                  Analytics
                </Link>
              </div>
            </div>

            <div>
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
                Account
              </p>

              <div className="space-y-1">
                <Link
                  href="/dashboard/businesses/subscription"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <CreditCard size={19} />
                  Subscription
                </Link>

                <Link
                  href="/dashboard/businesses/settings"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <Settings size={19} />
                  Settings
                </Link>
              </div>
            </div>
          </nav>
        </div>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="mb-3 px-3">
            <p className="truncate text-sm font-semibold text-white">
              {businessName}
            </p>

            <p className="text-xs text-white/50">
              Business Account
            </p>
          </div>

          <LogoutButton />
        </div>
      </aside>
    </>
  );
}