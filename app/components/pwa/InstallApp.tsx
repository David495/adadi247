"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent;
  }
}

export default function InstallApp() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      const installEvent = event as BeforeInstallPromptEvent;

      window.deferredPrompt = installEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      window.deferredPrompt = undefined;
      setCanInstall(false);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!window.deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    try {
      await window.deferredPrompt.prompt();

      await window.deferredPrompt.userChoice;

      window.deferredPrompt = undefined;
      setCanInstall(false);
    } catch (error) {
      console.error("ADADI installation failed:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!canInstall) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={isInstalling}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B1E3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isInstalling ? (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            aria-hidden="true"
          />
          Installing...
        </>
      ) : (
        <>
          <span aria-hidden="true">📱</span>
          Install ADADI
        </>
      )}
    </button>
  );
}