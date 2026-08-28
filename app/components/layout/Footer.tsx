import Link from "next/link";
import AdadiLogo from '../../../public/adadi-logo.png'
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-[#5b1020]/10 bg-white">

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          <div className="lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
            >
            <Image src={AdadiLogo} alt='logo'/>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-500">
              Discover businesses, explore products,
              and shop from businesses you can trust.
              ADADI connects customers with businesses
              in one marketplace.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Marketplace
            </h3>

            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  href="/businesses"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  Explore Businesses
                </Link>
              </li>

              <li>
                <Link
                  href="/businesses"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  Browse Products
                </Link>
              </li>

              <li>
                <Link
                  href="/cart"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* =========================================
              BUSINESS
              ========================================= */}

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              For Businesses
            </h3>

            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  href="/business-login"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  Sell on ADADI
                </Link>
              </li>

              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  Why Sell on ADADI
                </Link>
              </li>

              <li>
                <Link
                  href="/faqs"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  Business Help
                </Link>
              </li>

              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  Contact Us
                </Link>
                <Link
            href="/faqs"
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Faqs
          </Link>
              </li>
            </ul>
          </div>

          {/* =========================================
              COMPANY
              ========================================= */}

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Company
            </h3>

            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  About ADADI
                </Link>
              </li>

              <li>
                <Link
                  href="/faqs"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  Help
                </Link>
              </li>

              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-500 transition hover:text-[#6b1224]"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* =========================================
            HELP / CONTACT STRIP
            ========================================= */}

        <div className="mt-12 flex flex-col gap-6 rounded-2xl bg-[#faf7f7] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Need help?
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Have a question about shopping or
              selling on ADADI?
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-[#6b1224] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#53101c]"
          >
            Contact Support
          </Link>
        </div>
      </div>

      {/* =========================================
          BOTTOM FOOTER
          ========================================= */}

      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} ADADI.
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}