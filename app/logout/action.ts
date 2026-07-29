"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("LOGOUT ERROR:", error);
  }

  redirect("/business-login");
}