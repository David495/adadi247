import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css";

import { CartProvider } from "./components/cart/CartProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ADADI | Discover. Shop. Sell.",
  description:
    "ADADI is a marketplace connecting customers with businesses, making it easy to discover products, shop from local businesses, and grow your business online.",
  verification: {
    google: "D8whXJ6z5ty2xrIMFQxlzKqpGJ66lTs1w398nx-hkJ8",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
        <SpeedInsights/>

        <Script id="chatbase-script" strategy="afterInteractive">
          {`
            (function() {
              if (
                !window.chatbase ||
                window.chatbase("getState") !== "initialized"
              ) {
                window.chatbase = (...arguments) => {
                  if (!window.chatbase.q) {
                    window.chatbase.q = [];
                  }

                  window.chatbase.q.push(arguments);
                };

                window.chatbase = new Proxy(
                  window.chatbase,
                  {
                    get(target, prop) {
                      if (prop === "q") {
                        return target.q;
                      }

                      return (...args) =>
                        target(prop, ...args);
                    }
                  }
                );
              }

              const onLoad = function() {
                const script = document.createElement("script");

                script.src =
                  "https://www.chatbase.co/embed.min.js";

                script.id =
                  "kXzntwa876vWoJ2xDgnhw";

                script.domain =
                  "www.chatbase.co";

                document.body.appendChild(script);
              };

              if (document.readyState === "complete") {
                onLoad();
              } else {
                window.addEventListener("load", onLoad);
              }
            })();
          `}
        </Script>
      </body>
    </html>
  );
}