"use client";

import React, { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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

  const handleCopyDiagnostics = () => {
    const details = [
      `Error Message: ${error?.message || "Critical Error"}`,
      `Digest: ${error?.digest || "N/A"}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "16px",
          minHeight: "100vh",
          backgroundColor: "#F8FAFC",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "500px",
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "36px 32px",
            boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(226, 232, 240, 0.8)",
            textAlign: "center",
          }}
        >
          {/* Modern Visual Icon */}
          <div
            style={{
              width: "72px",
              height: "72px",
              margin: "0 auto 20px auto",
              borderRadius: "20px",
              background: "linear-gradient(180deg, #FFFDF7 0%, #FEF3C7 100%)",
              border: "1px solid #FDE68A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 6px -1px rgba(245, 158, 11, 0.1)",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D97706"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="2.5" />
              <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="2.5" />
              <circle cx="16" cy="18" r="2.5" fill="#EF4444" stroke="#EF4444" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#0F172A",
              margin: "0 0 8px 0",
              letterSpacing: "-0.025em",
            }}
          >
            Application Encountered an Issue
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#475569",
              margin: "0 0 20px 0",
              lineHeight: 1.6,
            }}
          >
            A critical system interrupt occurred. You can restart the session or return to login to refresh your credentials.
          </p>

          {error?.message && (
            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "10px",
                padding: "10px 14px",
                marginBottom: "20px",
                textAlign: "left",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#B91C1C",
                wordBreak: "break-all",
              }}
            >
              <strong>Error:</strong> {error.message}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                padding: "11px 22px",
                background: "linear-gradient(135deg, #174B43 0%, #26A58A 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(23, 75, 67, 0.2)",
              }}
            >
              Restart Application
            </button>

            <button
              onClick={handleClearAndLogin}
              style={{
                padding: "11px 20px",
                backgroundColor: "#FFFFFF",
                color: "#334155",
                border: "1px solid #CBD5E1",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Return to Login
            </button>
          </div>

          {/* Diagnostic Details Accordion */}
          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #F1F5F9" }}>
            <button
              type="button"
              onClick={() => setShowDetails((p) => !p)}
              style={{
                background: "none",
                border: "none",
                color: "#64748B",
                fontSize: "12px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {showDetails ? "Hide technical diagnostic details" : "Show technical diagnostic details"}
            </button>

            {showDetails && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                  textAlign: "left",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "#334155",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 700, color: "#64748B" }}>TECHNICAL LOG</span>
                  <button
                    onClick={handleCopyDiagnostics}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#059669",
                      fontSize: "11px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div>Digest: {error?.digest || "N/A"}</div>
                <div>Timestamp: {new Date().toLocaleTimeString()}</div>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
