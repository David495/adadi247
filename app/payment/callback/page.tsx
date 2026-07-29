import { Suspense } from "react";
import PaymentCallbackClient from "./PaymentCallbackClient";

function LoadingPayment() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f7]">
      <div className="text-center">
        <p className="text-lg font-semibold text-[#6b1224]">
          Loading payment verification...
        </p>
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<LoadingPayment />}>
      <PaymentCallbackClient />
    </Suspense>
  );
}