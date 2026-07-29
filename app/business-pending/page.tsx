import Link from "next/link";

export default function BusinessPendingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] p-6">

      <div className="w-full max-w-lg">

        {/* ADADI BRAND */}

        <div className="text-center mb-8">

          <h1 className="text-4xl font-bold text-[#8B1E3F]">
            ADADI
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Grow your business with ADADI.
          </p>

        </div>

        {/* PENDING CARD */}

        <div className="bg-white rounded-2xl shadow-lg border border-[#ead6dd] p-8 text-center">

          {/* ICON */}

          <div className="w-16 h-16 mx-auto rounded-full bg-[#f7e9ee] flex items-center justify-center">

            <span className="text-3xl">
              ⏳
            </span>

          </div>

          {/* MESSAGE */}

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Your Business Is Pending Activation
          </h1>

          <p className="mt-4 text-gray-600 leading-relaxed">
            Your business account has been
            successfully created, but your
            business is not active yet.
          </p>

          <p className="mt-3 text-gray-600 leading-relaxed">
            Please complete the required payment
            and onboarding steps. Once your
            business is activated, you will be
            able to access your business dashboard.
          </p>

          {/* ACTIONS */}

          <div className="mt-8 space-y-3">

            <Link
              href="/dashboard/businesses/"
              className="block w-full bg-[#8B1E3F] text-white rounded-lg py-3 font-semibold hover:bg-[#64152E] transition"
            >
              Go to Business Dashboard
            </Link>

            <Link
              href="/business-login"
              className="block w-full border border-[#8B1E3F] text-[#8B1E3F] rounded-lg py-3 font-semibold hover:bg-[#f7e9ee] transition"
            >
              Back to Business Login
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}