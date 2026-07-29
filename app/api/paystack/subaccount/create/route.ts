import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // =========================================
    // 1. GET REQUEST DATA
    // =========================================

    const body = await request.json();

    const {
      businessId,
      businessName,
      accountNumber,
      bankCode,
      accountName,
    } = body as {
      businessId?: string;
      businessName?: string;
      accountNumber?: string;
      bankCode?: string;
      accountName?: string;
    };

    // =========================================
    // 2. VALIDATE REQUEST DATA
    // =========================================

    if (!businessId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Business ID is required.",
        },
        { status: 400 }
      );
    }

    if (!businessName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Business name is required.",
        },
        { status: 400 }
      );
    }

    if (!accountNumber?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Bank account number is required.",
        },
        { status: 400 }
      );
    }

    if (!bankCode?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Bank code is required.",
        },
        { status: 400 }
      );
    }

    if (!accountName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Bank account name is required.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 3. GET PAYSTACK SECRET KEY
    // =========================================

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY IS NOT CONFIGURED"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 4. CREATE NORMAL SUPABASE CLIENT
    // =========================================
    //
    // This client is used only to authenticate
    // the currently logged-in business owner.
    //
    // =========================================

    const supabase =
      await createClient();

    // =========================================
    // 5. GET AUTHENTICATED USER
    // =========================================

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "BUSINESS OWNER AUTHENTICATION ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in to connect a bank account.",
        },
        { status: 401 }
      );
    }

    console.log(
      "AUTHENTICATED BUSINESS OWNER:",
      {
        userId: user.id,
        email: user.email,
      }
    );

    // =========================================
    // 6. CREATE ADMIN SUPABASE CLIENT
    // =========================================
    //
    // The service-role client is used for the
    // trusted server-side database operations.
    //
    // IMPORTANT:
    //
    // Never expose the service-role key to the
    // browser.
    //
    // =========================================

    const adminSupabase =
      createAdminClient();

    // =========================================
    // 7. GET BUSINESS
    // =========================================

    const {
      data: business,
      error: businessError,
    } =
      await adminSupabase
        .from("businesses")
        .select(
          `
            id,
            owner_id,
            name,
            status,
            paystack_subaccount_code,
            paystack_subaccount_id,
            paystack_subaccount_active
          `
        )
        .eq(
          "id",
          businessId.trim()
        )
        .single();

    // =========================================
    // 8. VERIFY BUSINESS EXISTS
    // =========================================

    if (
      businessError ||
      !business
    ) {
      console.error(
        "BUSINESS NOT FOUND:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Business account could not be found.",
        },
        { status: 404 }
      );
    }

    console.log(
      "BUSINESS FOUND:",
      {
        businessId:
          business.id,

        businessName:
          business.name,

        ownerId:
          business.owner_id,

        status:
          business.status,

        existingSubaccount:
          business.paystack_subaccount_code,
      }
    );

    // =========================================
    // 9. VERIFY BUSINESS OWNERSHIP
    // =========================================
    //
    // A business owner can only connect the bank
    // account belonging to their own business.
    //
    // We NEVER trust owner information sent
    // from the browser.
    //
    // =========================================

    if (
      business.owner_id !==
      user.id
    ) {
      console.error(
        "UNAUTHORIZED PAYSTACK SUBACCOUNT CREATION:",
        {
          businessId:
            business.id,

          authenticatedUserId:
            user.id,

          businessOwnerId:
            business.owner_id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to connect a bank account to this business.",
        },
        { status: 403 }
      );
    }

    // =========================================
    // 10. CHECK IF BUSINESS ALREADY HAS
    //     A PAYSTACK SUBACCOUNT
    // =========================================

    if (
      business.paystack_subaccount_code
    ) {
      console.log(
        "PAYSTACK SUBACCOUNT ALREADY EXISTS:",
        {
          businessId:
            business.id,

          subaccountCode:
            business.paystack_subaccount_code,

          subaccountId:
            business.paystack_subaccount_id,

          active:
            business.paystack_subaccount_active,
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Paystack subaccount already exists.",

        businessId:
          business.id,

        subaccountCode:
          business.paystack_subaccount_code,

        subaccountId:
          business.paystack_subaccount_id,

        active:
          business.paystack_subaccount_active,
      });
    }

    // =========================================
    // 11. PREPARE BUSINESS INFORMATION
    // =========================================

    const cleanBusinessName =
      businessName.trim();

    const cleanAccountNumber =
      accountNumber.trim();

    const cleanBankCode =
      bankCode.trim();

    const cleanAccountName =
      accountName.trim();

    // =========================================
    // 12. CREATE PAYSTACK SUBACCOUNT
    // =========================================
    //
    // IMPORTANT PAYMENT STRUCTURE:
    //
    // The subaccount represents the business
    // bank account that receives the business
    // portion of customer payments.
    //
    // ADADI's 5% commission is handled in the
    // customer order payment initialization
    // route.
    //
    // Therefore, we do NOT create an additional
    // ADADI commission calculation here.
    //
    // percentage_charge: 95
    //
    // This tells Paystack that the business
    // subaccount's share is 95%.
    //
    // =========================================

    console.log(
      "CREATING PAYSTACK SUBACCOUNT:",
      {
        businessId:
          business.id,

        businessName:
          cleanBusinessName,

        accountNumber:
          cleanAccountNumber,

        bankCode:
          cleanBankCode,

        accountName:
          cleanAccountName,

        businessPercentage:
          95,
      }
    );

    const paystackResponse =
      await fetch(
        "https://api.paystack.co/subaccount",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${paystackSecretKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            business_name:
              cleanBusinessName,

            settlement_bank:
              cleanBankCode,

            account_number:
              cleanAccountNumber,

            percentage_charge:
              95,

            description:
              `ADADI business payment account for ${cleanBusinessName}`,

            primary_contact_email:
              user.email ||
              undefined,

            primary_contact_name:
              cleanAccountName,
          }),
        }
      );

    // =========================================
    // 13. PARSE PAYSTACK RESPONSE
    // =========================================

    let paystackData: any;

    try {
      paystackData =
        await paystackResponse.json();
    } catch (parseError) {
      console.error(
        "PAYSTACK RESPONSE PARSE ERROR:",
        parseError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to read the response from Paystack.",
        },
        { status: 502 }
      );
    }

    console.log(
      "PAYSTACK SUBACCOUNT RESPONSE:",
      paystackData
    );

    // =========================================
    // 14. HANDLE PAYSTACK CREATION ERROR
    // =========================================

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      console.error(
        "PAYSTACK SUBACCOUNT CREATION FAILED:",
        {
          httpStatus:
            paystackResponse.status,

          response:
            paystackData,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Unable to create Paystack subaccount.",
        },
        {
          status:
            paystackResponse.status >= 400 &&
            paystackResponse.status < 500
              ? 400
              : 502,
        }
      );
    }

    // =========================================
    // 15. GET SUBACCOUNT DATA
    // =========================================

    const subaccount =
      paystackData.data;

    const subaccountCode =
      subaccount.subaccount_code;

    const subaccountId =
      subaccount.id;

    // =========================================
    // 16. VERIFY SUBACCOUNT CODE
    // =========================================

    if (!subaccountCode) {
      console.error(
        "PAYSTACK DID NOT RETURN A SUBACCOUNT CODE:",
        subaccount
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack did not return a valid subaccount code.",
        },
        { status: 502 }
      );
    }

    console.log(
      "PAYSTACK SUBACCOUNT CREATED:",
      {
        subaccountCode,

        subaccountId,

        businessId:
          business.id,
      }
    );

    // =========================================
    // 17. SAVE SUBACCOUNT DETAILS TO BUSINESS
    // =========================================

    const {
      data: updatedBusiness,
      error:
        updateBusinessError,
    } =
      await adminSupabase
        .from("businesses")
        .update({
          paystack_subaccount_code:
            subaccountCode,

          paystack_subaccount_id:
            subaccountId,

          paystack_subaccount_active:
            true,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          business.id
        )
        .eq(
          "owner_id",
          user.id
        )
        .select(
          `
            id,
            name,
            paystack_subaccount_code,
            paystack_subaccount_id,
            paystack_subaccount_active
          `
        )
        .single();

    // =========================================
    // 18. HANDLE DATABASE UPDATE ERROR
    // =========================================

    if (
      updateBusinessError ||
      !updatedBusiness
    ) {
      console.error(
        "FAILED TO SAVE PAYSTACK SUBACCOUNT:",
        updateBusinessError
      );

      // =========================================
      // IMPORTANT:
      //
      // The Paystack subaccount has already been
      // created successfully.
      //
      // However, we could not save its details
      // to the ADADI database.
      //
      // We do NOT pretend the operation succeeded.
      // =========================================

      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack subaccount was created, but we could not save it to your business account. Please contact support before trying again.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 19. SUCCESS
    // =========================================

    console.log(
      "=========================================="
    );

    console.log(
      "PAYSTACK SUBACCOUNT CREATED SUCCESSFULLY"
    );

    console.log({
      businessId:
        updatedBusiness.id,

      businessName:
        updatedBusiness.name,

      subaccountCode:
        updatedBusiness.paystack_subaccount_code,

      subaccountId:
        updatedBusiness.paystack_subaccount_id,

      active:
        updatedBusiness.paystack_subaccount_active,
    });

    console.log(
      "=========================================="
    );

    // =========================================
    // 20. RETURN SUCCESS RESPONSE
    // =========================================

    return NextResponse.json({
      success: true,

      message:
        "Your business payment account has been connected successfully.",

      businessId:
        updatedBusiness.id,

      businessName:
        updatedBusiness.name,

      subaccountCode:
        updatedBusiness.paystack_subaccount_code,

      subaccountId:
        updatedBusiness.paystack_subaccount_id,

      active:
        updatedBusiness.paystack_subaccount_active,
    });

  } catch (error) {
    // =========================================
    // GLOBAL ERROR HANDLER
    // =========================================

    console.error(
      "PAYSTACK SUBACCOUNT CREATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while connecting your business payment account.",
      },
      { status: 500 }
    );
  }
}