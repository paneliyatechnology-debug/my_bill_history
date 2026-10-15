"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log technical error safely for developers
    console.error("[MyBill Critical Global Error]:", error);
  }, [error]);

  const handleClearAndLogin = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("billing_auth_token");
        localStorage.removeItem("billing_user_profile");
        localStorage.removeItem("billing_tenant_context");
        window.location.replace("/login");
      }
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          backgroundColor: "#F8F9FB",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#202124",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            width: "90%",
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #E5E7EB",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 16px auto",
              borderRadius: "16px",
              backgroundColor: "#FFF3E8",
              border: "1px solid #FED7AA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              color: "#F47721",
            }}
          >
            ⚠️
          </div>

          <h1
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#202124",
              margin: "0 0 8px 0",
              letterSpacing: "-0.025em",
            }}
          >
            Application Encountered an Error
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#667085",
              margin: "0 0 16px 0",
              lineHeight: 1.5,
            }}
          >
            A critical system error interrupted normal execution. You can try restarting the application or returning to the login screen.
          </p>

          {error?.message && (
            <div
              style={{
                backgroundColor: "#F8F9FB",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "20px",
                textAlign: "left",
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#DC3545",
                wordBreak: "break-all",
                maxHeight: "100px",
                overflowY: "auto",
              }}
            >
              {error.message}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                backgroundColor: "#F47721",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(244, 119, 33, 0.3)",
              }}
            >
              Restart Application
            </button>

            <button
              onClick={handleClearAndLogin}
              style={{
                padding: "10px 20px",
                backgroundColor: "#FFFFFF",
                color: "#344054",
                border: "1px solid #D0D5DD",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Return to Login
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
