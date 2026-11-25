"use client";

import { useState } from "react";
import ProUpgradeDialog from "@/components/ProUpgradeDialog";

/** "Send me reminders" is a Pro feature: everyone else gets the upgrade prompt when they try it. */
export default function RemindersButton({ signedIn, isPro }: { signedIn: boolean; isPro: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={isPro}
        onClick={() => setOpen(true)}
        className="pt-btn pt-btn-solid h-11 px-4 text-[0.9375rem]"
      >
        Send me reminders
      </button>
      <ProUpgradeDialog open={open} onClose={() => setOpen(false)} feature="Reminders" title="Reminders come with Pro" signedIn={signedIn} />
    </>
  );
}
