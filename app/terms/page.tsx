import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function TermsPage() {
    return (
      <>
            <Navbar/>
    <main className="min-h-screen bg-[#FAF8F6]">

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">

        <div className="mb-12 text-center">

          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Legal
          </p>

          <h1 className="mt-3 text-4xl font-bold text-[#242424]">
            Terms and Conditions
          </h1>

          <p className="mt-4 text-gray-600">
            Please read these terms carefully before using the ADADI platform.
          </p>

        </div>


        <div className="space-y-8 rounded-2xl border border-[#E8D5DC] bg-white p-8 shadow-sm sm:p-10">


          <section>
            <h2 className="text-xl font-bold text-[#242424]">
              1. Introduction
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              Welcome to ADADI. ADADI is a marketplace platform that connects
              customers with businesses by allowing businesses to showcase
              their products and services online.
            </p>

          </section>



          <section>
            <h2 className="text-xl font-bold text-[#242424]">
              2. Account Registration
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              Users must provide accurate information when creating an account.
              You are responsible for maintaining the security of your account
              credentials and all activities carried out under your account.
            </p>

          </section>



          <section>
            <h2 className="text-xl font-bold text-[#242424]">
              3. Business Accounts
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              Businesses using ADADI are responsible for ensuring that their
              business information, product descriptions, images, pricing, and
              availability details are accurate and up to date.
            </p>

          </section>



          <section>
            <h2 className="text-xl font-bold text-[#242424]">
              4. Products and Transactions
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              ADADI provides a platform for businesses and customers to
              connect. Businesses remain responsible for their products,
              fulfilment, customer service, and compliance with applicable
              laws.
            </p>

          </section>



          <section>
            <h2 className="text-xl font-bold text-[#242424]">
              5. Payments
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              Payments processed through ADADI may be handled by third-party
              payment providers. Users agree to provide accurate payment
              information and comply with payment provider requirements.
            </p>

          </section>



          <section>
            <h2 className="text-xl font-bold text-[#242424]">
              6. Prohibited Activities
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              Users must not use ADADI for fraudulent activities, illegal
              transactions, misleading advertisements, or activities that
              harm other users or businesses.
            </p>

          </section>



          <section>
            <h2 className="text-xl font-bold text-[#242424]">
              7. Account Suspension
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              ADADI reserves the right to suspend or remove accounts that
              violate these terms, misuse the platform, or create risks for
              customers and businesses.
            </p>

          </section>



          <section>
            <h2 className="text-xl font-bold text-[#242424]">
              8. Changes to These Terms
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              ADADI may update these terms from time to time. Continued use of
              the platform after changes are published means you accept the
              updated terms.
            </p>

          </section>



          <section>
            <h2 className="text-xl font-bold text-[#242424]">
              9. Contact Information
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              If you have questions about these Terms and Conditions, please
              contact the ADADI support team through our contact page.
            </p>

          </section>



          <div className="border-t border-gray-100 pt-6 text-sm text-gray-500">
            Last updated: July 2026
          </div>


        </div>


      </section>

            </main>
            <Footer/>
            </>
  );
}