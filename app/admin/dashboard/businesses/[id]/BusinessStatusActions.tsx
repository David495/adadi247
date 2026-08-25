"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  activateBusiness,
  suspendBusiness,
  deleteBusiness,
} from "./action";

type BusinessActionsProps = {
  businessId: string;
  status: string | null;
};

export default function BusinessActions({
  businessId,
  status,
}: BusinessActionsProps) {
  const [loading, setLoading] = useState<
    "activate" | "suspend" | "delete" | null
  >(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleActivate() {
    setLoading("activate");
    setError("");
    setSuccess("");

    try {
      const result = await activateBusiness(businessId);

      if (!result.success) {
        setError(
          result.error ||
            "Unable to approve this business."
        );
        return;
      }

      setSuccess("Business approved successfully.");
      window.location.reload();
    } catch (error) {
      console.error(
        "APPROVE BUSINESS ERROR:",
        error
      );

      setError(
        "Something went wrong while approving this business."
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
      const result = await suspendBusiness(businessId);

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

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this business?\n\nThis action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setLoading("delete");
    setError("");
    setSuccess("");

    try {
      const result = await deleteBusiness(businessId);

      if (!result.success) {
        setError(
          result.error ||
            "Unable to delete this business."
        );
        return;
      }

      setSuccess(
        "Business deleted successfully."
      );

      window.location.href =
        "/admin/dashboard/businesses";
    } catch (error) {
      console.error(
        "DELETE BUSINESS ERROR:",
        error
      );

      setError(
        "Something went wrong while deleting this business."
      );
    } finally {
      setLoading(null);
    }
  }

  const isApproved = status === "approved";
  const isSuspended = status === "suspended";
  const isLoading = loading !== null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {success}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!isApproved && (
          <button
            type="button"
            onClick={handleActivate}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === "activate" ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 size={17} />
                Approve Business
              </>
            )}
          </button>
        )}

        {!isSuspended && (
          <button
            type="button"
            onClick={handleSuspend}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === "suspend" ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Suspending...
              </>
            ) : (
              <>
                <ShieldAlert size={17} />
                Suspend Business
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "delete" ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 size={17} />
              Delete Business
            </>
          )}
        </button>
      </div>
    </div>
  );
}