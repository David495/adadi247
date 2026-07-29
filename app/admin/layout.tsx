import Link from "next/link";

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
} from "lucide-react";

import { logout } from "@/app/logout/action";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF8F6]">

      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#64152E] text-white">

        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-6">

          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2"
          >
            <span className="text-2xl font-bold tracking-tight">
              ADADI
            </span>

            <span className="h-2 w-2 rounded-full bg-[#D4A017]" />
          </Link>

        </div>

        <nav className="flex-1 overflow-y-auto p-4">


          <div className="mb-7">

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
              Administration
            </p>

            <div className="space-y-1">


              <Link
                href="/admin/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <LayoutDashboard size={19} />

                Dashboard
              </Link>


              <Link
                href="/admin/dashboard/businesses"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Store size={19} />

                Businesses
              </Link>

              <Link
                href="/admin/dashboard/products"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Package size={19} />

                Products
              </Link>

              <Link
                href="/admin/dashboard/orders"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <ShoppingBag size={19} />

                Orders
              </Link>

              <Link
                href="/admin/dashboard/customers"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Users size={19} />

                Customers
              </Link>

              <Link
                href="/admin/dashboard/finance"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Wallet size={19} />

                Finance
              </Link>

              <Link
                href="/admin/dashboard/categories"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Tags size={19} />

                Categories
              </Link>

            </div>

          </div>

          <div>

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
              System
            </p>

            <div className="space-y-1">

              <Link
                href="/admin/dashboard/settings"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Settings size={19} />

                Settings
              </Link>

            </div>

          </div>

        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">

          <form action={logout}>

            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={19} />

              Logout
            </button>

          </form>

        </div>

      </aside>

      <main className="ml-64 min-h-screen">

        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">

          <div>

            <h1 className="text-lg font-semibold text-[#242424]">
              ADADI Administration
            </h1>

            <p className="text-xs text-gray-500">
              Manage and monitor the ADADI platform
            </p>

          </div>


          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">

              <p className="text-sm font-semibold text-[#242424]">
                Administrator
              </p>

              <p className="text-xs text-gray-500">
                ADADI Admin
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B1E3F] text-sm font-semibold text-white">
              A
            </div>

          </div>

        </header>

        <div className="p-8">

          {children}

        </div>

      </main>

    </div>
  );
}