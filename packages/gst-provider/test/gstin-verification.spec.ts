import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GstinCloudProvider,
  GstinProviderFactory,
  MockGstVerificationProvider,
} from "../src/gstin-verification";

describe("GSTIN Verification Providers", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("GstinCloudProvider", () => {
    it("should throw a clear configuration error when API key is missing", async () => {
      const provider = new GstinCloudProvider({ apiKey: "" });
      await expect(provider.verifyGstin("27AAAAA0000A1Z5")).rejects.toThrow(
        "GSTIN.cloud API key is unconfigured",
      );
    });

    it("should parse and normalize a successful GSTIN.cloud response", async () => {
      const mockGstinCloudResponse = {
        success: true,
        sandbox: false,
        cached: false,
        credits_remaining: 499,
        data: {
          gstin: "27AAAAA0000A1Z5",
          legal_name: "EXAMPLE COMPANY PRIVATE LIMITED",
          trade_name: "Example Co",
          status: "Active",
          constitution: "Private Limited Company",
          taxpayer_type: "Regular",
          registration_date: "01/07/2017",
          last_updated: "12/10/2026",
          state: "Maharashtra",
          state_code: "27",
          pan: "AAAAA0000A",
          tan: null,
          address: "123 Business Park, Andheri East, Mumbai, 400001",
          district: "Mumbai",
          pincode: "400001",
          nature_of_business: ["Supplier of Services"],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGstinCloudResponse,
      });

      const provider = new GstinCloudProvider({
        apiKey: "test_key_123",
        baseUrl: "https://gstin.cloud/api/v1",
      });

      const res = await provider.verifyGstin("27aaaaa0000a1z5");

      expect(res.success).toBe(true);
      expect(res.isValid).toBe(true);
      expect(res.gstin).toBe("27AAAAA0000A1Z5");
      expect(res.legalName).toBe("EXAMPLE COMPANY PRIVATE LIMITED");
      expect(res.tradeName).toBe("Example Co");
      expect(res.registrationStatus).toBe("ACTIVE");
      expect(res.taxpayerType).toBe("Regular");
      expect(res.constitutionOfBusiness).toBe("Private Limited Company");
      expect(res.pan).toBe("AAAAA0000A");
      expect(res.stateCode).toBe("27");
      expect(res.address.line1).toBe(
        "123 Business Park, Andheri East, Mumbai, 400001",
      );
      expect(res.address.pincode).toBe("400001");
      expect(res.creditsRemaining).toBe(499);

      // Verify request headers
      expect(global.fetch).toHaveBeenCalledWith(
        "https://gstin.cloud/api/v1/verify/27AAAAA0000A1Z5",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": "test_key_123",
            Accept: "application/json",
          }),
        }),
      );
    });

    it("should accurately flag CANCELLED GSTIN and produce a warning", async () => {
      const mockCancelledResponse = {
        success: true,
        data: {
          gstin: "24CANCEL1234A1Z",
          legal_name: "Defunct Traders",
          status: "Cancelled",
          state_code: "24",
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCancelledResponse,
      });

      const provider = new GstinCloudProvider({ apiKey: "test_key" });
      const res = await provider.verifyGstin("24CANCEL1234A1Z");

      expect(res.success).toBe(true);
      expect(res.registrationStatus).toBe("CANCELLED");
      expect(res.message).toContain("CANCELLED");
      expect(res.messageGujarati).toContain("રદ");
    });

    it("should accurately flag SUSPENDED GSTIN and produce a warning", async () => {
      const mockSuspendedResponse = {
        success: true,
        data: {
          gstin: "24SUSPEN1234A1Z",
          legal_name: "Suspended Vendor",
          status: "Suspended",
          state_code: "24",
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSuspendedResponse,
      });

      const provider = new GstinCloudProvider({ apiKey: "test_key" });
      const res = await provider.verifyGstin("24SUSPEN1234A1Z");

      expect(res.success).toBe(true);
      expect(res.registrationStatus).toBe("SUSPENDED");
      expect(res.message).toContain("SUSPENDED");
    });

    it("should handle 404 Taxpayer Not Found gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: "GSTIN not found" }),
      });

      const provider = new GstinCloudProvider({ apiKey: "test_key" });
      const res = await provider.verifyGstin("27NOTFND0000A1Z5");

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("GSTIN_NOT_FOUND");
      expect(res.message).toContain("not found");
    });

    it("should throw on 401 Unauthorized with PROVIDER_AUTH_FAILED", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: "Invalid API key." }),
      });

      const provider = new GstinCloudProvider({ apiKey: "bad_key" });
      await expect(provider.verifyGstin("27AAAAA0000A1Z5")).rejects.toThrow(
        "GST provider authentication failed",
      );
    });

    it("should throw on 429 Rate Limit Exceeded", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ success: false, error: "Rate limit exceeded" }),
      });

      const provider = new GstinCloudProvider({ apiKey: "test_key" });
      await expect(provider.verifyGstin("27AAAAA0000A1Z5")).rejects.toThrow(
        "rate limit exceeded",
      );
    });
  });

  describe("GstinProviderFactory", () => {
    it("should instantiate GstinCloudProvider by default", () => {
      const provider = GstinProviderFactory.create("gstin_cloud", {
        apiKey: "k",
      });
      expect(provider.providerName).toBe("gstin_cloud");
    });

    it("should instantiate MockGstVerificationProvider when configured", () => {
      const provider = GstinProviderFactory.create("mock");
      expect(provider.providerName).toBe("mock");
    });
  });

  describe("MockGstVerificationProvider", () => {
    it("should return known business details for test GSTINs", async () => {
      const mock = new MockGstVerificationProvider();
      const res = await mock.verifyGstin("27AAAAA0000A1Z5");

      expect(res.success).toBe(true);
      expect(res.legalName).toBe("EXAMPLE COMPANY PRIVATE LIMITED");
      expect(res.registrationStatus).toBe("ACTIVE");
      expect(res.address.city).toBe("Mumbai");
    });

    it("should return GSTIN_NOT_FOUND for unknown mock GSTIN", async () => {
      const mock = new MockGstVerificationProvider();
      const res = await mock.verifyGstin("99UNKNOWN000A1Z5");

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("GSTIN_NOT_FOUND");
    });
  });
});
