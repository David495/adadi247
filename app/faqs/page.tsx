"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function FAQsPage() {

  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

const toggleFAQ = (id: string) => {
  setOpenFAQ((current) =>
    current === id ? null : id
  );
  };
  
  const customerFAQs = [
    {
      question: "What is ADADI?",
      answer:
        "ADADI is a marketplace platform that helps customers discover businesses, explore products, and connect directly with sellers.",
    },
    {
      question: "How do I buy products on ADADI?",
      answer:
        "Browse businesses and products on the marketplace, add items to your cart, and complete your order through the checkout process.",
    },
    {
      question: "Can I contact a business before buying?",
      answer:
        "Yes. Customers can view business information and contact sellers for questions about products, availability, and services.",
    },
    {
      question: "How are payments handled?",
      answer:
        "Payments are processed securely through our supported payment providers. Payment options may vary depending on availability.",
    },
    {
      question: "Can I track my orders?",
      answer:
        "Yes. Customers can view their order information from their account dashboard.",
    },
  ];

  const businessFAQs = [
    {
      question: "How can my business join ADADI?",
      answer:
        "Businesses can register on ADADI, create their business profile, and set up their marketplace presence.",
    },
    {
      question: "What can I upload as a business owner?",
      answer:
        "Businesses can add their products, descriptions, images, prices, and other information customers need.",
    },
    {
      question: "Does ADADI approve businesses?",
      answer:
        "Yes. Businesses may go through a review process to maintain quality and trust across the marketplace.",
    },
    {
      question: "Can I manage my products myself?",
      answer:
        "Yes. Business owners have access to a dashboard where they can manage products and business information.",
    },
    {
      question: "How much does it cost to use ADADI?",
      answer:
        "Business plans, fees, and marketplace charges depend on the current ADADI pricing structure.",
    },
  ];

  return (
    <>
      <Navbar/>
    <main className="min-h-screen bg-[#FAF8F6]">

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">

        <div className="mb-12 text-center">

          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Help Center
          </p>

          <h1 className="mt-3 text-4xl font-bold text-[#242424]">
            Frequently Asked Questions
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Find answers to common questions about shopping and selling on ADADI.
          </p>

        </div>


        <div className="space-y-12">


          <section>

            <h2 className="mb-6 text-2xl font-bold text-[#242424]">
              For Customers
            </h2>

            <div className="space-y-4">
  {customerFAQs.map((faq, index) => {
    const id = `customer-${index}`;
    const isOpen = openFAQ === id;

    return (
      <div
        key={faq.question}
        className="overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm"
      >
        <button
          type="button"
          onClick={() => toggleFAQ(id)}
          className="flex w-full items-center justify-between p-6 text-left transition hover:bg-[#FCF7F9]"
        >
          <h3 className="font-bold text-[#242424]">
            {faq.question}
          </h3>

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
          <section>

            <h2 className="mb-6 text-2xl font-bold text-[#242424]">
              For Businesses
            </h2>

            <div className="space-y-4">
  {businessFAQs.map((faq, index) => {
    const id = `business-${index}`;
    const isOpen = openFAQ === id;

    return (
      <div
        key={faq.question}
        className="overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm"
      >
        <button
          type="button"
          onClick={() => toggleFAQ(id)}
          className="flex w-full items-center justify-between p-6 text-left transition hover:bg-[#FCF7F9]"
        >
          <h3 className="font-bold text-[#242424]">
            {faq.question}
          </h3>

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


        </div>


      </section>

      </main>
      <Footer/>
      </>
  );
}