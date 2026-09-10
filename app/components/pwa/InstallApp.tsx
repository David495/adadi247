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
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone
      );

    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setIsStandalone(standalone);
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      const installEvent = event as BeforeInstallPromptEvent;

      window.deferredPrompt = installEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      window.deferredPrompt = undefined;
      setCanInstall(false);
      setShowIOSInstructions(false);
      setIsStandalone(true);
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
      if (isIOS) {
        setShowIOSInstructions(true);
      }

      return;
    }

    setIsInstalling(true);

    try {
      await window.deferredPrompt.prompt();

      const choice = await window.deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        window.deferredPrompt = undefined;
        setCanInstall(false);
      }
    } catch (error) {
      console.error("ADADI installation failed:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (isStandalone) {
    return null;
  }

  if (isIOS) {
    return (
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B1E3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#64152E] active:scale-[0.98]"
        >
          <span aria-hidden="true">📱</span>
          Install ADADI
        </button>

        {showIOSInstructions && (
          <div className="mt-4 max-w-sm rounded-xl border border-white/15 bg-white/10 p-4 text-left text-sm text-white backdrop-blur">
            <p className="font-semibold">
              Add ADADI to your Home Screen
            </p>

            <p className="mt-2 leading-6 text-white/75">
              Tap the <strong>Share</strong> button in Safari, then
              select <strong>Add to Home Screen</strong>.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={isInstalling}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B1E3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#64152E] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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