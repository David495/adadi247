"use client";

import { useState } from "react";
import {
ChevronDown,
ChevronUp,
} from "lucide-react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

type FAQ = {
question: string;
answer: string;
};

export default function FAQsPage() {
const [openFAQ, setOpenFAQ] = useState<string | null>(null);

const toggleFAQ = (id: string) => {
setOpenFAQ((current) =>
current === id ? null : id
);
};

const customerFAQs: FAQ[] = [
{
question: "What is ADADI?",
answer:
"ADADI is a marketplace platform that connects customers with businesses. Customers can discover businesses, browse products, place orders and make secure payments through the platform.",
},
{
question: "Do I need an account to shop on ADADI?",
answer:
"You can browse businesses and products on ADADI without creating an account. Depending on the available customer features, signing in allows you to access your customer dashboard and manage your orders and account information.",
},
{
question: "How do I buy something on ADADI?",
answer:
"Find a business on the marketplace, browse its products, add the items you want to your cart and proceed to checkout. Enter the required customer and delivery information, then complete your payment through Paystack.",
},
{
question: "How are customer payments handled?",
answer:
"Customer payments are processed securely through Paystack. ADADI verifies the payment before the order is treated as successfully paid.",
},
{
question: "Is my payment secure?",
answer:
"Yes. ADADI uses Paystack to process customer payments, so your card or payment details are handled by the payment provider rather than stored directly by ADADI.",
},
{
question: "What happens after I pay for an order?",
answer:
"After a successful payment is verified, your order is recorded on ADADI and made available to the relevant business for processing and fulfilment.",
},
{
question: "Can I contact a business before buying?",
answer:
"Yes. Business storefronts contain information about the business, including available contact details where provided. You can contact the business if you have questions about its products or services.",
},
{
question: "Can I see my previous orders?",
answer:
"Customers with access to the customer dashboard can view their recorded order information from their account.",
},
{
question: "What if my payment was deducted but my order was not confirmed?",
answer:
"Do not immediately make another payment. If your bank account was charged but ADADI did not confirm your order, keep your payment reference or transaction details and contact ADADI support so the payment can be investigated and verified.",
},
];

const businessFAQs: FAQ[] = [
{
question: "How can my business join ADADI?",
answer:
"Business owners can register their business on ADADI and complete the required onboarding process. Businesses are reviewed and approved before they can fully operate on the marketplace.",
},
{
question: "Is there a subscription fee for businesses?",
answer:
"Yes. ADADI businesses operate on a subscription plan. The current business subscription fee and billing period are displayed during the relevant registration or subscription process.",
},
{
question: "What can I do from my business dashboard?",
answer:
"Your business dashboard allows you to manage your storefront, products, orders, customer information and other business-related activity available on ADADI.",
},
{
question: "Can I add and manage my own products?",
answer:
"Yes. Approved businesses can add products to their storefront and manage information such as product names, descriptions, prices and images.",
},
{
question: "How do customers pay for my products?",
answer:
"Customers pay through ADADI's checkout using Paystack. Once Paystack confirms the payment and ADADI verifies the transaction, the order is recorded for your business.",
},
{
question: "How does ADADI's commission work?",
answer:
"ADADI currently charges a 2.5% marketplace commission on customer order payments. This is calculated as ₦25 for every ₦1,000 paid through the marketplace.",
},
{
question: "How does my business receive customer payments?",
answer:
"ADADI uses Paystack's payment infrastructure to process customer payments and route the applicable business funds through the business's configured Paystack account or subaccount setup, after applicable ADADI charges.",
},
{
question: "What is required before my business can receive payments?",
answer:
"Your business must complete the required ADADI onboarding and payment setup, including the necessary Paystack subaccount configuration. Your business must also be approved and have an active payment setup before customer payments can be processed for it.",
},
{
question: "Can my business subscription expire?",
answer:
"Yes. Business subscriptions have a defined billing period. When a subscription expires, the business owner may need to renew the subscription to continue using subscription-dependent business features.",
},
{
question: "Can I manage my orders?",
answer:
"Yes. Business owners can access their order management area to review customer purchases and manage order-related activity and fulfilment.",
},
{
question: "Can I see my customers?",
answer:
"Yes. ADADI provides a customer management area where business owners can view customers associated with recorded orders and see information such as order count, spending and recent order activity.",
},
{
question: "Can I view business analytics?",
answer:
"Yes. The business dashboard includes analytics features designed to help you understand sales, orders, customer activity and overall business performance.",
},
{
question: "What happens if my business is not approved?",
answer:
"A business that has not completed the required onboarding or approval process may not have access to all marketplace and payment features. Complete the required setup and contact ADADI support if you need assistance.",
},
];

const supportFAQs: FAQ[] = [
{
question: "What should I do if I have a payment problem?",
answer:
"If you experience a payment problem, check whether your bank account was charged before attempting the payment again. Keep your transaction reference and contact ADADI support if the payment was deducted but your order or subscription was not confirmed.",
},
{
question: "What should I do if I see an error during checkout?",
answer:
"First, check your internet connection and try the checkout again after a short period. If your bank account was already charged, do not immediately pay again. Keep your transaction details and contact ADADI support.",
},
{
question: "How can I get help from ADADI?",
answer:
"If you need help with your account, business, subscription, order or payment, contact the ADADI support team through the available support channels.",
},
];

const renderFAQSection = (
title: string,
faqs: FAQ[],
prefix: string
) => ( <section> <h2 className="mb-6 text-2xl font-bold text-[#242424]">
{title} </h2>

  <div className="space-y-4">
    {faqs.map((faq, index) => {
      const id = `${prefix}-${index}`;
      const isOpen = openFAQ === id;

      return (
        <div
          key={faq.question}
          className="overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm"
        >
          <button
            type="button"
            onClick={() => toggleFAQ(id)}
            aria-expanded={isOpen}
            className="flex w-full items-center justify-between gap-6 p-6 text-left transition hover:bg-[#FCF7F9] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#8B1E3F]/30"
          >
            <h3 className="font-bold leading-6 text-[#242424]">
              {faq.question}
            </h3>

            <span className="shrink-0">
              {isOpen ? (
                <ChevronUp
                  size={20}
                  className="text-[#8B1E3F]"
                />
              ) : (
                <ChevronDown
                  size={20}
                  className="text-[#8B1E3F]"
                />
              )}
            </span>
          </button>

          {isOpen && (
            <div className="border-t border-[#E8D5DC] px-6 pb-6 pt-4">
              <p className="leading-7 text-gray-600">
                {faq.answer}
              </p>
            </div>
          )}
        </div>
      );
    })}
  </div>
</section>

);

return (
<> <Navbar />
  <main className="min-h-screen bg-[#FAF8F6]">
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-14 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Help Center
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#242424] sm:text-5xl">
          Frequently Asked Questions
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
          Find answers to common questions about
          shopping, selling, payments, subscriptions
          and managing your business on ADADI.
        </p>
      </div>

      <div className="space-y-12">
        {renderFAQSection(
          "For Customers",
          customerFAQs,
          "customer"
        )}

        {renderFAQSection(
          "For Businesses",
          businessFAQs,
          "business"
        )}

        {renderFAQSection(
          "Payments & Support",
          supportFAQs,
          "support"
        )}
      </div>

      <div className="mt-14 rounded-2xl border border-[#8B1E3F]/10 bg-[#8B1E3F]/5 p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold text-[#64152E]">
          Still need help?
        </h2>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
          If you cannot find the answer you are
          looking for, contact the ADADI support team
          and we will help you with your account,
          business, order or payment.
        </p>
      </div>
    </section>
  </main>

  <Footer />
</>

);
}
