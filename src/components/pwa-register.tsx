"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Service worker successfully registered
          })
          .catch((err) => {
            // Ignore registration errors in restricted development modes
          });
      });
    }
  }, []);

  return null;
}
