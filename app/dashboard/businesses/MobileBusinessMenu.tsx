"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import MobileBusinessSidebar from "../MobileBusinessSidebar";

type Props = {
  businessName: string;
};

export default function MobileBusinessMenu({
  businessName,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-[#64152E] transition hover:bg-[#F7E9EE] lg:hidden"
      >
        <Menu size={23} />
      </button>

      <MobileBusinessSidebar
        businessName={businessName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}