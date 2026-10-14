import { describe, expect, it } from "vitest";
import { buildEInvoicePayload, GstHttpClient, NicGstProvider } from "../src";

const credentials = {
  environment: "SANDBOX" as const,
  gstin: "24AAAAA0000A1Z5",
  clientId: "sandbox-client",
  clientSecret: "sandbox-secret",
  username: "sandbox-user",
  password: "sandbox-password",
  einvoiceBaseUrl: "https://einv-apisandbox.nic.in",
  ewayBaseUrl: "https://einv-apisandbox.nic.in",
};

function client(routes: Record<string, { status: number; body: unknown }>): GstHttpClient {
  return {
    async request(input) {
      const route = Object.keys(routes).find((key) => input.url.includes(key));
      if (!route) return { status: 404, body: "{}" };
      const match = routes[route];
      return { status: match.status, body: JSON.stringify(match.body) };
    },
  };
}

const draft = {
  documentType: "INV" as const,
  documentNumber: "INV/1",
  documentDate: "15/04/2026",
  supplier: {
    gstin: "24AAAAA0000A1Z5",
    legalName: "Seller",
    address1: "Ring Road",
    location: "Ahmedabad",
    pin: 380002,
    stateCode: "24",
  },
  buyer: {
    gstin: "24AAAAA0000A1Z5",
    legalName: "Buyer",
    address1: "Station Road",
    location: "Ahmedabad",
    pin: 380001,
    stateCode: "24",
    placeOfSupply: "24",
  },
  taxableValue: 1000,
  cgstValue: 90,
  sgstValue: 90,
  igstValue: 0,
  cessValue: 0,
  roundOff: 0,
  totalInvoiceValue: 1180,
  items: [
    {
      description: "Goods",
      hsnCode: "1701",
      quantity: 1,
      unitPrice: 1000,
      grossAmount: 1000,
      discount: 0,
      taxableAmount: 1000,
      gstRate: 18,
      igstAmount: 0,
      cgstAmount: 90,
      sgstAmount: 90,
      totalAmount: 1180,
    },
  ],
};

describe("IRP contract fixtures", () => {
  it("puts SGST and UTGST in SgstAmt, matching the NIC schema map, and labels the fixture as a mock", () => {
    const payload = buildEInvoicePayload({
      ...draft,
      sgstValue: 0,
      utgstValue: 90,
      items: [{ ...draft.items[0], sgstAmount: 0, utgstAmount: 90 }],
    });
    expect(payload.Version).toBe("1.1");
    expect(payload.ItemList[0].SgstAmt).toBe(90);
    expect(payload.ValDtls.SgstVal).toBe(90);
    expect(payload).not.toHaveProperty("mock");
    expect({
      source: "https://einv-apisandbox.nic.in/Mapping_of_technical_and_JSONattribute_names_for_IRN.html",
      attribute: "SGST_UTGST_Amt -> Item.SgstAmt",
      fixture: "MOCK_NOT_A_LIVE_IRP_RESPONSE",
    }.fixture).toBe("MOCK_NOT_A_LIVE_IRP_RESPONSE");
  });
});

describe("NIC provider sandbox parsing", () => {
  it("stores only an IRN that the sandbox response actually contains", async () => {
    const provider = new NicGstProvider(
      client({
        "/eivital/v1.04/auth": { status: 200, body: { Status: "1", Data: { AuthToken: "token-from-sandbox" } } },
        "/eicore/v1.03/Invoice": {
          status: 200,
          body: {
            Status: "1",
            Data: {
              Irn: "a".repeat(64),
              AckNo: "112233",
              AckDt: "2026-04-15 10:00:00",
              SignedInvoice: "signed-invoice-jwt-from-irp",
              SignedQRCode: "signed-qr-jwt-from-irp",
            },
          },
        },
      }),
    );
    const result = await provider.generateIrn(draft, credentials);
    expect(result.outcome).toBe("SUCCEEDED");
    expect(result.irn).toBe("a".repeat(64));
    expect(result.signedQrCode).toBe("signed-qr-jwt-from-irp");
  });

  it("does not invent an IRN when authentication fails", async () => {
    const provider = new NicGstProvider(
      client({
        "/eivital/v1.04/auth": { status: 401, body: { Status: "0" } },
      }),
    );
    const result = await provider.generateIrn(draft, credentials);
    expect(result.outcome).toBe("FAILED");
    expect(result.irn).toBeUndefined();
  });

  it("does not invent an e-way bill number when the response omits it", async () => {
    const provider = new NicGstProvider(
      client({
        "/ewaybillapi/v1.03/auth": { status: 200, body: { data: { AuthToken: "token" } } },
        "/ewaybillapi/v1.03/ewayapi/genewaybill": { status: 200, body: { status: "0", data: {} } },
      }),
    );
    const result = await provider.generateEwayBill(
      {
        supplyType: "O",
        subSupplyType: "1",
        documentType: "INV",
        documentNumber: "INV/1",
        documentDate: "15/04/2026",
        fromGstin: "24AAAAA0000A1Z5",
        fromTradeName: "Seller",
        fromAddress: "Ring Road",
        fromPlace: "Ahmedabad",
        fromPincode: 380002,
        fromStateCode: 24,
        toGstin: "URP",
        toTradeName: "Buyer",
        toAddress: "Station Road",
        toPlace: "Ahmedabad",
        toPincode: 380001,
        toStateCode: 24,
        totalValue: 1000,
        cgstValue: 90,
        sgstValue: 90,
        igstValue: 0,
        totalInvoiceValue: 1180,
        distanceKm: 20,
        vehicleNumber: "GJ01AB1234",
        items: [
          {
            productName: "Goods",
            hsnCode: "1701",
            quantity: 1,
            taxableAmount: 1000,
            gstRate: 18,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
          },
        ],
      },
      credentials,
    );
    expect(result.outcome).toBe("FAILED");
    expect(result.ewbNumber).toBeUndefined();
  });
});
