"use client";
import AdadiLogo from '../../../public/adadi-logo.png';
import Image from 'next/image';

import Link from "next/link";
import { useState } from "react";
import {
  Menu,
  Search,
  ShoppingCart,
  Store,
  X,
} from "lucide-react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#5b1020]/20 bg-[#6b1224] text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        <Link
          href="/"
          className="flex items-center gap-2"
          onClick={() =>
            setIsMenuOpen(false)
          }
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#6b1224]">
            <Image src={AdadiLogo} alt='logo'/>
          </div>

          <span className="text-xl font-bold tracking-tight">
            ADADI
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link
            href="/businesses"
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Explore Businesses
          </Link>

          <Link
            href="/about"
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            About
          </Link>

          <Link
            href="/faqs"
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Help
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/* SEARCH */}

          <Link
            href="/businesses"
            aria-label="Search businesses"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <Search className="h-5 w-5" />
          </Link>

          <Link
            href="/cart"
            aria-label="Shopping cart"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>

          <Link
            href="/business-login"
            className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
          >
            Sell on ADADI
          </Link>

          {/* SIGN IN */}

          <Link
            href="/login"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#6b1224] shadow-sm transition hover:bg-[#faf7f7]"
          >
            Sign In
          </Link>
        </div>

        {/* =========================================
            MOBILE MENU BUTTON
            ========================================= */}

        <button
          type="button"
          aria-label={
            isMenuOpen
              ? "Close menu"
              : "Open menu"
          }
          aria-expanded={isMenuOpen}
          onClick={() =>
            setIsMenuOpen(
              !isMenuOpen
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition hover:bg-white/10 md:hidden"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* =========================================
          MOBILE NAVIGATION
          ========================================= */}

      {isMenuOpen && (
        <div className="border-t border-white/10 bg-[#5b1020] md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            <nav className="flex flex-col gap-1">
              <Link
                href="/businesses"
                onClick={() =>
                  setIsMenuOpen(false)
                }
                className="rounded-lg px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Explore Businesses
              </Link>

              <Link
                href="/about"
                onClick={() =>
                  setIsMenuOpen(false)
                }
                className="rounded-lg px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                About ADADI
              </Link>

              <Link
                href="/help"
                onClick={() =>
                  setIsMenuOpen(false)
                }
                className="rounded-lg px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Help & FAQ
              </Link>

              <Link
                href="/cart"
                onClick={() =>
                  setIsMenuOpen(false)
                }
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <ShoppingCart className="h-5 w-5" />

                Shopping Cart
              </Link>

              <div className="my-3 border-t border-white/10" />

              {/* SELL ON ADADI */}

              <Link
                href="/login"
                onClick={() =>
                  setIsMenuOpen(false)
                }
                className="rounded-lg border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sell on ADADI
              </Link>

              {/* SIGN IN */}

              <Link
                href="/login"
                onClick={() =>
                  setIsMenuOpen(false)
                }
                className="mt-2 rounded-lg bg-white px-4 py-3 text-center text-sm font-semibold text-[#6b1224] transition hover:bg-[#faf7f7]"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}