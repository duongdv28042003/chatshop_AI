"use client";

import { useEffect } from "react";

export function MobileDevTools() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Tự động khởi tạo Eruda DevTools trên thiết bị di động
    import("eruda")
      .then((erudaModule) => {
        const eruda = (erudaModule as any).default || erudaModule;
        if (eruda && typeof eruda.init === "function") {
          try {
            eruda.init();
          } catch {}
        }
      })
      .catch(() => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/eruda";
        script.onload = () => {
          // @ts-expect-error global eruda
          if (window.eruda) window.eruda.init();
        };
        document.body.appendChild(script);
      });
  }, []);

  return null;
}
