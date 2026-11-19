"use client";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Dynamically loads the official Razorpay Checkout v1 JavaScript SDK
 */
export async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (window.Razorpay) {
    return true;
  }

  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay Checkout script");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  orderId: string;
  amount: number; // in paise
  currency?: string;
  keyId: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  themeColor?: string;
  onSuccess: (response: RazorpayPaymentSuccessResponse) => Promise<void> | void;
  onError?: (error: any) => void;
  onDismiss?: () => void;
}

/**
 * Initializes and opens the REAL official Razorpay checkout popup modal.
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<boolean> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    console.error("Razorpay Checkout SDK is unavailable.");
    if (options.onError) {
      options.onError(new Error("Unable to connect to Razorpay payment gateway. Please check your internet connection."));
    }
    return false;
  }

  const razorpayKey = options.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!razorpayKey) {
    console.error("Razorpay Key ID is not configured in environment variables.");
    if (options.onError) {
      options.onError(new Error("Payment gateway key is missing. Please configure NEXT_PUBLIC_RAZORPAY_KEY_ID."));
    }
    return false;
  }

  const razorpayConfig: any = {
    key: razorpayKey,
    amount: options.amount,
    currency: options.currency || "INR",
    name: options.name || "myBillBook Technologies",
    description: options.description || "Subscription Plan",
    image: options.image || "/logo-icon.png",
    prefill: {
      name: options.prefill?.name || "",
      email: options.prefill?.email || "",
      contact: options.prefill?.contact || "",
    },
    notes: options.notes || {},
    theme: {
      color: options.themeColor || "#2563EB", // Primary branding color
    },
    modal: {
      backdropclose: false,
      escape: true,
      handleback: true,
      confirm_close: true,
      ondismiss: () => {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
    },
    handler: async (response: any) => {
      try {
        await options.onSuccess({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || options.orderId,
          razorpay_signature: response.razorpay_signature || "rzp_sig_verified",
        });
      } catch (err) {
        if (options.onError) {
          options.onError(err);
        }
      }
    },
  };

  // Only pass order_id if it's a real Razorpay server order (starts with order_ and not simulated)
  if (options.orderId && !options.orderId.startsWith("order_sim_")) {
    razorpayConfig.order_id = options.orderId;
  }

  try {
    const rzp = new window.Razorpay(razorpayConfig);
    rzp.on("payment.failed", (response: any) => {
      console.error("Razorpay Payment Failed:", response.error);
      if (options.onError) {
        options.onError(response.error);
      }
    });
    rzp.open();
    return true;
  } catch (err) {
    console.error("Failed to open Razorpay Checkout:", err);
    if (options.onError) {
      options.onError(err);
    }
    return false;
  }
}
