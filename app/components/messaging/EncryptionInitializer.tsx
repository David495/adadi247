"use client";

import { useEffect } from "react";
import { ensureUserEncryptionKey } from "@/app/lib/e2ee/supabase";

export default function EncryptionInitializer() {
  useEffect(() => {
    let cancelled = false;

    async function initializeEncryption() {
      try {
        await ensureUserEncryptionKey();
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Unable to initialize secure messaging encryption:",
          error
        );
      }
    }

    initializeEncryption();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}