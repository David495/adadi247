import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Get logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({
      success: false,
      step: "authentication",
      error: userError?.message || "No authenticated user",
    });
  }

  // Find business
  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id, name, owner_id")
    .eq("owner_id", user.id)
    .single();

  if (businessError || !business) {
    return NextResponse.json({
      success: false,
      step: "business",
      userId: user.id,
      error:
        businessError?.message ||
        "Business not found",
    });
  }

  // Test ownership function
  const {
    data: ownsBusiness,
    error: ownershipError,
  } = await supabase.rpc(
    "user_owns_business",
    {
      business_uuid: business.id,
    }
  );

  return NextResponse.json({
    success: true,

    user: {
      id: user.id,
      email: user.email,
    },

    business: {
      id: business.id,
      name: business.name,
      owner_id: business.owner_id,
    },

    ownershipCheck: {
      result: ownsBusiness,
      error: ownershipError,
    },
  });
}