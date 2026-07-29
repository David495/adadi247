"use client";

import { LogOut } from "lucide-react";

import { logout } from "./action";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
      >
        <LogOut size={19} />

        Logout
      </button>
    </form>
  );
}