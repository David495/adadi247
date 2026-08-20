"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  Wallet,
  Tags,
  Menu,
  X,
} from "lucide-react";

import { logout } from "@/app/logout/action";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // =========================================
  // MOBILE SIDEBAR STATE
  // =========================================

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // =========================================
  // CLOSE SIDEBAR WHEN SCREEN BECOMES DESKTOP
  // =========================================

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // =========================================
  // PREVENT BODY SCROLL WHEN MOBILE SIDEBAR
  // IS OPEN
  // =========================================

  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // =========================================
  // CLOSE SIDEBAR
  // =========================================

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF8F6]">

      {/* =========================================
          MOBILE OVERLAY
      ========================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close admin menu"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* =========================================
          SIDEBAR
      ========================================== */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-screen
          w-72
          max-w-[85vw]
          flex-col
          bg-[#64152E]
          text-white
          shadow-2xl
          transition-transform
          duration-300
          ease-in-out

          lg:z-40
          lg:w-64
          lg:translate-x-0
          lg:shadow-none

          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >

        {/* =========================================
            SIDEBAR HEADER
        ========================================== */}

        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5 sm:px-6">

          <Link
            href="/admin/dashboard"
            onClick={closeSidebar}
            className="flex items-center gap-2"
          >
            <span className="text-2xl font-bold tracking-tight">
              ADADI
            </span>

            <span className="h-2 w-2 rounded-full bg-[#D4A017]" />
          </Link>

          {/* MOBILE CLOSE BUTTON */}

          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close admin menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={21} />
          </button>

        </div>

        {/* =========================================
            NAVIGATION
        ========================================== */}

        <nav className="flex-1 overflow-y-auto p-4">

          {/* =======================================
              ADMINISTRATION
          ======================================== */}

          <div className="mb-7">

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
              Administration
            </p>

            <div className="space-y-1">

              {/* DASHBOARD */}

              <Link
                href="/admin/dashboard"
                onClick={closeSidebar}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <LayoutDashboard size={19} />

                <span>
                  Dashboard
                </span>
              </Link>

              {/* BUSINESSES */}

              <Link
                href="/admin/dashboard/businesses"
                onClick={closeSidebar}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Store size={19} />

                <span>
                  Businesses
                </span>
              </Link>

              {/* PRODUCTS */}

              <Link
                href="/admin/dashboard/products"
                onClick={closeSidebar}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Package size={19} />

                <span>
                  Products
                </span>
              </Link>

              {/* ORDERS */}

              <Link
                href="/admin/dashboard/orders"
                onClick={closeSidebar}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <ShoppingBag size={19} />

                <span>
                  Orders
                </span>
              </Link>

              {/* CUSTOMERS */}

              <Link
                href="/admin/dashboard/customers"
                onClick={closeSidebar}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Users size={19} />

                <span>
                  Customers
                </span>
              </Link>

              {/* FINANCE */}

              <Link
                href="/admin/dashboard/finance"
                onClick={closeSidebar}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Wallet size={19} />

                <span>
                  Finance
                </span>
              </Link>

              {/* CATEGORIES */}

              <Link
                href="/admin/dashboard/categories"
                onClick={closeSidebar}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Tags size={19} />

                <span>
                  Categories
                </span>
              </Link>

            </div>

          </div>

          {/* =======================================
              SYSTEM
          ======================================== */}

          <div>

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
              System
            </p>

            <div className="space-y-1">

              {/* SETTINGS */}

              <Link
                href="/admin/dashboard/settings"
                onClick={closeSidebar}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Settings size={19} />

                <span>
                  Settings
                </span>
              </Link>

            </div>

          </div>

        </nav>

        {/* =========================================
            LOGOUT
        ========================================== */}

        <div className="shrink-0 border-t border-white/10 p-4">

          <form action={logout}>

            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={19} />

              <span>
                Logout
              </span>
            </button>

          </form>

        </div>

      </aside>

      {/* =========================================
          MAIN CONTENT
      ========================================== */}

      <main className="min-h-screen lg:ml-64">

        {/* =======================================
            HEADER
        ======================================== */}

        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 pl-16 sm:px-6 sm:pl-16 lg:px-8 lg:pl-8">

          {/* =====================================
              MOBILE MENU BUTTON
          ====================================== */}

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
            className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#64152E] shadow-sm transition hover:bg-gray-50 lg:hidden"
          >
            <Menu size={21} />
          </button>

          {/* =====================================
              HEADER TITLE
          ====================================== */}

          <div className="min-w-0">

            <h1 className="truncate text-base font-semibold text-[#242424] sm:text-lg">
              ADADI Administration
            </h1>

            <p className="hidden text-xs text-gray-500 sm:block">
              Manage and monitor the ADADI platform
            </p>

          </div>

          {/* =====================================
              ADMIN PROFILE
          ====================================== */}

          <div className="ml-4 flex shrink-0 items-center gap-2 sm:gap-3">

            <div className="hidden text-right md:block">

              <p className="text-sm font-semibold text-[#242424]">
                Administrator
              </p>

              <p className="text-xs text-gray-500">
                ADADI Admin
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B1E3F] text-sm font-semibold text-white sm:h-10 sm:w-10">
              A
            </div>

          </div>

        </header>

        <div className="w-full p-4 sm:p-6 lg:p-8">

          {children}

        </div>

      </main>

    </div>
  );
}