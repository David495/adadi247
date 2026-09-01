"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

type Business = {
  id: string;
  name: string;
  paystack_subaccount_code: string | null;
  paystack_subaccount_id: number | null;
  paystack_subaccount_active: boolean | null;
  paystack_subaccount_verified: boolean | null;
};

type Bank = {
  name: string;
  code: string;
};

export default function PaymentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [business, setBusiness] = useState<Business | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingCommission, setLoadingCommission] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");

  useEffect(() => {
    loadBusiness();
    loadBanks();
    loadCommissionRate();
  }, []);

  async function loadBusiness() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data, error: businessError } = await supabase
        .from("businesses")
        .select(
          `
            id,
            name,
            paystack_subaccount_code,
            paystack_subaccount_id,
            paystack_subaccount_active,
            paystack_subaccount_verified
          `
        )
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) {
        console.error("PAYMENTS PAGE BUSINESS ERROR:", businessError);
        throw new Error(
          businessError.message ||
            "Unable to load your business information."
        );
      }

      if (!data) {
        throw new Error(
          "No business account was found for your account."
        );
      }

      setBusiness(data as Business);
    } catch (err) {
      console.error("PAYMENTS PAGE LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load business information."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadBanks() {
    try {
      setLoadingBanks(true);

      const response = await fetch("/api/paystack/bank/resolve", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Unable to load Nigerian banks."
        );
      }

      setBanks(data.banks || []);
    } catch (err) {
      console.error("BANK LIST ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Nigerian banks."
      );
    } finally {
      setLoadingBanks(false);
    }
  }

  async function loadCommissionRate() {
    try {
      setLoadingCommission(true);

      const { data, error: settingsError } = await supabase
        .from("platform_settings")
        .select("commission_rate")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        console.error(
          "COMMISSION SETTINGS ERROR:",
          settingsError
        );
        return;
      }

      if (data?.commission_rate !== null && data?.commission_rate !== undefined) {
        setCommissionRate(Number(data.commission_rate));
      }
    } catch (err) {
      console.error("COMMISSION RATE LOAD ERROR:", err);
    } finally {
      setLoadingCommission(false);
    }
  }

  async function verifyBankAccount() {
    setError("");
    setSuccess("");
    setAccountName("");

    if (!accountNumber.trim()) {
      setError("Enter your bank account number.");
      return;
    }

    if (!/^\d{10}$/.test(accountNumber.trim())) {
      setError(
        "Bank account number must be exactly 10 digits."
      );
      return;
    }

    if (!bankCode) {
      setError("Select your bank.");
      return;
    }

    try {
      setVerifying(true);

      const response = await fetch(
        "/api/paystack/bank/resolve",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountNumber: accountNumber.trim(),
            bankCode: bankCode.trim(),
          }),
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Unable to verify this bank account."
        );
      }

      const verifiedName = data.accountName?.trim();

      if (!verifiedName) {
        throw new Error(
          "Paystack could not verify the account name."
        );
      }

      setAccountName(verifiedName);
      setSuccess("Bank account verified successfully.");
    } catch (err) {
      console.error(
        "ACCOUNT VERIFICATION ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify this bank account."
      );
    } finally {
      setVerifying(false);
    }
  }

  async function connectBankAccount() {
    if (!business) {
      setError("Business information is unavailable.");
      return;
    }

    setError("");
    setSuccess("");

    if (!accountNumber.trim()) {
      setError("Enter your bank account number.");
      return;
    }

    if (!/^\d{10}$/.test(accountNumber.trim())) {
      setError(
        "Bank account number must be exactly 10 digits."
      );
      return;
    }

    if (!bankCode) {
      setError("Select your bank.");
      return;
    }

    if (!accountName.trim()) {
      setError(
        "Please verify your bank account before connecting it."
      );
      return;
    }

    try {
      setConnecting(true);

      const selectedBank = banks.find(
        (bank) => bank.code === bankCode
      );

      const response = await fetch(
        "/api/paystack/subaccount/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId: business.id,
            businessName: business.name,
            accountNumber: accountNumber.trim(),
            bankCode: bankCode.trim(),
            accountName: accountName.trim(),
          }),
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Unable to connect your bank account."
        );
      }

      setSuccess(
        "Your bank account has been connected successfully."
      );

      setBusiness((current) =>
        current
          ? {
              ...current,
              paystack_subaccount_code:
                data.subaccountCode ||
                current.paystack_subaccount_code,
              paystack_subaccount_id:
                data.subaccountId ||
                current.paystack_subaccount_id,
              paystack_subaccount_active: true,
              paystack_subaccount_verified:
                data.verified ?? true,
            }
          : current
      );

      setAccountNumber("");
      setBankCode("");
      setAccountName("");
      setBankName(selectedBank?.name || "");

      await loadBusiness();
    } catch (err) {
      console.error(
        "CONNECT BANK ACCOUNT ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect your bank account."
      );
    } finally {
      setConnecting(false);
    }
  }

  function disconnectAccount() {
    setAccountNumber("");
    setBankCode("");
    setAccountName("");
    setBankName("");
    setSuccess("");
    setError("");
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#8B1E3F]" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <h2 className="font-semibold text-red-900">
                Unable to load business
              </h2>
              <p className="mt-1 text-sm text-red-700">
                {error ||
                  "Your business information could not be loaded."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const connected = Boolean(
    business.paystack_subaccount_code &&
      business.paystack_subaccount_active
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
            <CreditCard className="h-5 w-5 text-[#8B1E3F]" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Payments
            </h1>

            <p className="text-sm text-gray-500">
              Connect your bank account to receive customer payments.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <p className="text-sm text-green-700">
              {success}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-7">
            <h2 className="text-lg font-semibold text-gray-900">
              Bank account
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              This account will receive your share of customer payments.
            </p>
          </div>

          {connected ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-semibold text-green-900">
                      Bank account connected
                    </h3>

                    <p className="mt-1 text-sm text-green-700">
                      Your business is ready to receive its share of customer payments through Paystack.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-green-200 pt-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-green-700">
                      Payment connection
                    </span>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-green-700">
                      Paystack account
                    </span>

                    <span className="text-right text-sm font-semibold text-green-900">
                      Connected
                    </span>
                  </div>

                  {business.paystack_subaccount_code && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-green-700">
                        Subaccount
                      </span>

                      <span className="max-w-[180px] truncate text-right text-sm font-semibold text-green-900">
                        {business.paystack_subaccount_code}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={disconnectAccount}
                className="w-full rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Change bank account
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Bank
                </label>

                <select
                  value={bankCode}
                  onChange={(e) => {
                    const code = e.target.value;

                    const selectedBank = banks.find(
                      (bank) => bank.code === code
                    );

                    setBankCode(code);
                    setBankName(selectedBank?.name || "");
                    setAccountName("");
                    setSuccess("");
                    setError("");
                  }}
                  disabled={
                    loadingBanks ||
                    verifying ||
                    connecting
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10 disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingBanks
                      ? "Loading banks..."
                      : "Select your bank"}
                  </option>

                  {banks.map((bank) => (
                    <option
                      key={`${bank.code}-${bank.name}`}
                      value={bank.code}
                    >
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Account number
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(
                      e.target.value.replace(/\D/g, "")
                    );
                    setAccountName("");
                    setSuccess("");
                    setError("");
                  }}
                  disabled={verifying || connecting}
                  placeholder="Enter your 10-digit account number"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10 disabled:bg-gray-100"
                />
              </div>

              <button
                type="button"
                onClick={verifyBankAccount}
                disabled={
                  verifying ||
                  connecting ||
                  loadingBanks ||
                  accountNumber.length !== 10 ||
                  !bankCode
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#8B1E3F] bg-white px-5 py-3.5 text-sm font-semibold text-[#8B1E3F] transition hover:bg-[#8B1E3F]/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {verifying
                  ? "Verifying account..."
                  : "Verify bank account"}
              </button>

              {accountName && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

                    <div>
                      <p className="text-xs font-medium text-green-700">
                        Verified account name
                      </p>

                      <p className="mt-1 font-semibold text-green-900">
                        {accountName}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={connectBankAccount}
                disabled={
                  connecting ||
                  verifying ||
                  loadingBanks ||
                  !accountName
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connecting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {connecting
                  ? "Connecting account..."
                  : "Connect bank account"}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-[#8B1E3F]" />

              <h2 className="font-semibold text-gray-900">
                {business.name}
              </h2>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Payment status
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    connected
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {connected ? "Ready" : "Not connected"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#8B1E3F]" />

              <h3 className="font-semibold text-gray-900">
                Secure payouts
              </h3>
            </div>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Your bank account is verified through Paystack.
              ADADI does not handle or store your banking password or PIN.
            </p>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">
                ADADI platform commission
              </p>

              <p className="mt-1 text-lg font-bold text-gray-900">
                {loadingCommission
                  ? "..."
                  : commissionRate !== null
                    ? `${commissionRate}%`
                    : "Admin configured"}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Set by the ADADI administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}