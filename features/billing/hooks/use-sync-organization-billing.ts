"use client";

import { useEffect } from "react";

export function useSyncOrganizationBilling(orgId?: string | null) {
  useEffect(() => {
    if (!orgId) {
      return;
    }

    let controller: AbortController | null = null;

    const syncBilling = () => {
      controller?.abort();
      controller = new AbortController();

      void fetch("/api/billing/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orgId }),
        signal: controller.signal,
      }).catch(() => undefined);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncBilling();
      }
    };

    const handleFocus = () => {
      syncBilling();
    };

    syncBilling();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      controller?.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [orgId]);
}
