import { createAdminClient } from "@/app/lib/supabase/admin";

type SendPaidOrderNotificationParams = {
  orderId: string;
  orderNumber: string | null;
  businessId: string | null;
  total: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendPaidOrderNotification({
  orderId,
  orderNumber,
  businessId,
  total,
}: SendPaidOrderNotificationParams) {
  try {
    if (!businessId) {
      console.error(
        "ORDER EMAIL: Business ID is missing."
      );
      return;
    }

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const resendFromEmail =
      process.env.RESEND_FROM_EMAIL;

    if (!resendApiKey) {
      console.error(
        "ORDER EMAIL: RESEND_API_KEY is missing."
      );
      return;
    }

    if (!resendFromEmail) {
      console.error(
        "ORDER EMAIL: RESEND_FROM_EMAIL is missing."
      );
      return;
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: business,
      error: businessError,
    } = await adminSupabase
      .from("businesses")
      .select(
        `
          id,
          name,
          owner_id
        `
      )
      .eq("id", businessId)
      .maybeSingle();

    if (businessError) {
      console.error(
        "ORDER EMAIL: Business lookup failed:",
        businessError
      );
      return;
    }

    if (!business) {
      console.error(
        "ORDER EMAIL: Business was not found.",
        {
          businessId,
          orderId,
        }
      );
      return;
    }

    if (!business.owner_id) {
      console.error(
        "ORDER EMAIL: Business owner ID is missing.",
        {
          businessId,
          orderId,
        }
      );
      return;
    }

    const {
      data: owner,
      error: ownerError,
    } = await adminSupabase
      .from("profiles")
      .select(
        `
          id,
          full_name,
          email
        `
      )
      .eq("id", business.owner_id)
      .maybeSingle();

    if (ownerError) {
      console.error(
        "ORDER EMAIL: Business owner lookup failed:",
        ownerError
      );
      return;
    }

    if (!owner?.email) {
      console.error(
        "ORDER EMAIL: Business owner email was not found.",
        {
          businessId,
          ownerId: business.owner_id,
          orderId,
        }
      );
      return;
    }

    const safeBusinessName = escapeHtml(
      business.name || "Business"
    );

    const safeOwnerName = escapeHtml(
      owner.full_name || "Business Owner"
    );

    const safeOrderNumber = escapeHtml(
      orderNumber || orderId
    );

    const formattedTotal =
      new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(total);

    const subject =
      `New Paid Order Received — ${orderNumber || orderId}`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>${escapeHtml(subject)}</title>
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background: #faf8f6;
            font-family: Arial, Helvetica, sans-serif;
            color: #222222;
          "
        >
          <div
            style="
              max-width: 600px;
              margin: 0 auto;
              padding: 32px 20px;
            "
          >
            <div
              style="
                background: #ffffff;
                border-radius: 12px;
                padding: 32px;
                border: 1px solid #eeeeee;
              "
            >
              <div
                style="
                  font-size: 26px;
                  font-weight: 700;
                  color: #8b1e3f;
                  margin-bottom: 24px;
                "
              >
                ADADI
              </div>

              <h1
                style="
                  margin: 0 0 16px;
                  font-size: 24px;
                  line-height: 1.3;
                  color: #222222;
                "
              >
                New Paid Order Received
              </h1>

              <p
                style="
                  margin: 0 0 20px;
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Hello ${safeOwnerName},
              </p>

              <p
                style="
                  margin: 0 0 20px;
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                A customer has successfully completed payment
                for an order placed with
                <strong>${safeBusinessName}</strong>.
              </p>

              <div
                style="
                  background: #faf8f6;
                  border-radius: 10px;
                  padding: 20px;
                  margin: 24px 0;
                "
              >
                <p
                  style="
                    margin: 0 0 10px;
                    font-size: 14px;
                    color: #666666;
                  "
                >
                  Order Number
                </p>

                <p
                  style="
                    margin: 0 0 18px;
                    font-size: 17px;
                    font-weight: 700;
                    color: #222222;
                  "
                >
                  ${safeOrderNumber}
                </p>

                <p
                  style="
                    margin: 0 0 10px;
                    font-size: 14px;
                    color: #666666;
                  "
                >
                  Amount Paid
                </p>

                <p
                  style="
                    margin: 0;
                    font-size: 20px;
                    font-weight: 700;
                    color: #8b1e3f;
                  "
                >
                  ${escapeHtml(formattedTotal)}
                </p>
              </div>

              <div
                style="
                  background: #f7f7f7;
                  border-left: 4px solid #8b1e3f;
                  padding: 16px;
                  margin: 24px 0;
                "
              >
                <p
                  style="
                    margin: 0;
                    font-size: 15px;
                    line-height: 1.6;
                  "
                >
                  <strong>Action required:</strong>
                  Please log in to your ADADI business dashboard,
                  review the order details, and confirm whether
                  you can fulfil the order.
                </p>
              </div>

              <p
                style="
                  margin: 24px 0 0;
                  font-size: 15px;
                  line-height: 1.6;
                  color: #555555;
                "
              >
                The customer's payment has been received.
                The order will remain pending until you confirm it.
              </p>

              <p
                style="
                  margin: 28px 0 0;
                  font-size: 14px;
                  line-height: 1.6;
                  color: #777777;
                "
              >
                This is an automated notification from ADADI.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
ADADI — New Paid Order Received

Hello ${owner.full_name || "Business Owner"},

A customer has successfully completed payment for an order placed with ${
      business.name || "your business"
    }.

Order Number: ${orderNumber || orderId}
Amount Paid: ${formattedTotal}

ACTION REQUIRED:
Please log in to your ADADI business dashboard, review the order details, and confirm whether you can fulfil the order.

The customer's payment has been received. The order will remain pending until you confirm it.

This is an automated notification from ADADI.
    `.trim();

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `customer-order-paid/${orderId}`,
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [owner.email],
          subject,
          html,
          text,
        }),
      }
    );

    const resendData =
      await resendResponse.json().catch(
        () => null
      );

    if (!resendResponse.ok) {
      console.error(
        "ORDER EMAIL: Resend failed:",
        resendData
      );
      return;
    }

    console.log(
      "ORDER EMAIL: Paid order notification sent successfully.",
      {
        orderId,
        orderNumber,
        businessId,
        recipient: owner.email,
        resendId: resendData?.id,
      }
    );
  } catch (error) {
    console.error(
      "ORDER EMAIL: Unexpected error:",
      error
    );
  }
}