"use client";

import { useState } from "react";

import {
activateBusiness,
suspendBusiness,
} from "./action";

type BusinessActionsProps = {
businessId: string;
status: string | null;
};

export default function BusinessActions({
businessId,
status,
}: BusinessActionsProps) {
const [loading, setLoading] =
useState<"activate" | "suspend" | null>(null);

const [error, setError] =
useState("");

const [success, setSuccess] =
useState("");

async function handleActivate() {
setLoading("activate");
setError("");
setSuccess("");

try {
  const result =
    await activateBusiness(businessId);

  if (!result.success) {
    setError(
      result.error ||
        "Unable to activate this business."
    );

    return;
  }

  setSuccess(
    "Business activated successfully."
  );

  window.location.reload();
} catch (error) {
  console.error(
    "ACTIVATE BUSINESS ERROR:",
    error
  );

  setError(
    "Something went wrong while activating this business."
  );
} finally {
  setLoading(null);
}
}

async function handleSuspend() {
setLoading("suspend");
setError("");
setSuccess("");

try {
  const result =
    await suspendBusiness(businessId);

  if (!result.success) {
    setError(
      result.error ||
        "Unable to suspend this business."
    );

    return;
  }

  setSuccess(
    "Business suspended successfully."
  );

  window.location.reload();
} catch (error) {
  console.error(
    "SUSPEND BUSINESS ERROR:",
    error
  );

  setError(
    "Something went wrong while suspending this business."
  );
} finally {
  setLoading(null);
}

}

return ( <div className="space-y-4">

  {error && (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {error}
    </div>
  )}


  {success && (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
      {success}
    </div>
  )}

  <div className="flex flex-wrap gap-3">


    {status !== "active" && (
      <button
        type="button"
        onClick={handleActivate}
        disabled={loading !== null}
        className="rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading === "activate"
          ? "Activating..."
          : "Activate Business"}
      </button>
    )}

    {status !== "suspended" && (
      <button
        type="button"
        onClick={handleSuspend}
        disabled={loading !== null}
        className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading === "suspend"
          ? "Suspending..."
          : "Suspend Business"}
      </button>
    )}

  </div>

</div>

);
}
