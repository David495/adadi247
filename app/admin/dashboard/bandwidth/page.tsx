import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  ShieldCheck,
  Target,
  AlertTriangle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const MONTHLY_TARGET_BYTES = 3 * 1024 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default async function AdminBandwidthPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard/customer");
  }

  const adminSupabase = createAdminClient();

  async function getBucketStats(bucket: string) {
    let offset = 0;
    let totalBytes = 0;
    let objectCount = 0;

    while (true) {
      const { data, error } = await adminSupabase.storage
        .from(bucket)
        .list("", {
          limit: 1000,
          offset,
          sortBy: {
            column: "name",
            order: "asc",
          },
        });

      if (error) {
        return { bytes: 0, count: 0, error };
      }

      const objects = data ?? [];
      objectCount += objects.length;

      for (const object of objects) {
        totalBytes += Number(object.metadata?.size ?? 0);
      }

      if (objects.length < 1000) {
        break;
      }

      offset += objects.length;
    }

    return {
      bytes: totalBytes,
      count: objectCount,
      error: null,
    };
  }

  const bucketNames = [
    "product-images",
    "business-covers",
    "business-logos",
    "category-images",
  ];

  const bucketResults = await Promise.all(
    bucketNames.map((bucket) => getBucketStats(bucket))
  );

  const bucketStats = new Map(
    bucketNames.map((bucket, index) => [bucket, bucketResults[index]])
  );

  const productImagesBytes =
    bucketStats.get("product-images")?.bytes ?? 0;
  const businessCoversBytes =
    bucketStats.get("business-covers")?.bytes ?? 0;
  const businessLogosBytes =
    bucketStats.get("business-logos")?.bytes ?? 0;
  const categoryImagesBytes =
    bucketStats.get("category-images")?.bytes ?? 0;

  const totalStorageBytes =
    productImagesBytes +
    businessCoversBytes +
    businessLogosBytes +
    categoryImagesBytes;

  const storageError =
    bucketResults.find((result) => result.error)?.error ?? null;

  const optimizationChecks = [
    {
      label: "Public image transformations",
      value: "Enabled in app URLs",
      ok: true,
      detail: "Public marketplace images are requested through the Supabase render endpoint.",
    },
    {
      label: "Lazy loading",
      value: "Enabled",
      ok: true,
      detail: "Public directory, business, and product images load lazily.",
    },
    {
      label: "Long browser caching",
      value: "31536000s",
      ok: true,
      detail: "Newly uploaded product and business images receive a one-year cache policy.",
    },
    {
      label: "Monthly ADADI target",
      value: "3 GB",
      ok: true,
      detail: "This is our internal target, not a change to Supabase's plan quota.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF8F6]">
      <div className="mb-8">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
              Performance
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#242424]">
              Bandwidth Guard
            </h1>

            <p className="mt-2 max-w-2xl text-gray-500">
              A small control panel for keeping ADADI's public image delivery
              within our 3 GB monthly target.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            <ShieldCheck size={17} />
            Optimization active
          </div>
        </div>
      </div>

      {storageError && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertTriangle size={19} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Storage statistics unavailable</p>
            <p className="mt-1">
              The optimization controls are still active, but storage totals
              could not be loaded.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Monthly target
              </p>
              <p className="mt-3 text-3xl font-bold text-[#242424]">3 GB</p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <Target size={24} />
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Internal ADADI bandwidth budget.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Daily budget
              </p>
              <p className="mt-3 text-3xl font-bold text-[#242424]">
                102.4 MB
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <Gauge size={24} />
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            3 GB divided across a 30-day month.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Stored images
              </p>
              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {formatBytes(totalStorageBytes)}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <HardDrive size={24} />
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Current Storage footprint across image buckets.
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Delivery status
              </p>
              <p className="mt-3 text-2xl font-bold text-green-700">
                Optimized
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle2 size={24} />
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Transformations + lazy loading + long cache headers.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <ImageIcon size={22} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#242424]">
                Image storage footprint
              </h2>
              <p className="text-sm text-gray-500">
                Storage size is not the same as bandwidth, but it helps us
                identify heavy asset buckets.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              ["Product images", productImagesBytes],
              ["Business covers", businessCoversBytes],
              ["Business logos", businessLogosBytes],
              ["Category images", categoryImagesBytes],
            ].map(([label, bytes]) => {
              const numericBytes = Number(bytes);
              const percentage =
                totalStorageBytes > 0
                  ? Math.max(
                      1,
                      Math.round(
                        (numericBytes / totalStorageBytes) * 100
                      )
                    )
                  : 0;

              return (
                <div key={String(label)}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-[#242424]">
                      {label}
                    </span>
                    <span className="text-gray-500">
                      {formatBytes(numericBytes)}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#8B1E3F]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Database size={22} className="text-[#8B1E3F]" />
            <h2 className="text-xl font-bold text-[#242424]">
              Guardrails
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            {optimizationChecks.map((check) => (
              <div
                key={check.label}
                className="rounded-xl border border-gray-100 bg-[#FCFAF9] p-4"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <div className="min-w-0">
                    <p className="font-semibold text-[#242424]">
                      {check.label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#8B1E3F]">
                      {check.value}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {check.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#242424]">
              Important: 3 GB is our target, not Supabase's quota
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Supabase measures actual egress separately. This page monitors
              ADADI's optimization guardrails and storage footprint; it does
              not replace the live billing meter in Supabase.
            </p>
          </div>

          <Link
            href="https://supabase.com/dashboard/project/jlrengogaquvztdryzkh/settings/billing"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#64152E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7A1B38]"
          >
            Open Supabase billing
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
