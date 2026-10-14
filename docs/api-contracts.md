# REST API Contracts & Integration Specification

> [!IMPORTANT]
> **Repository Implementation Status Notice**:
> This document specifies the **target REST API design**. As verified by repository inspection on 12-Oct-2026, the current repository contains only design specifications; no NestJS controllers, routes, DTOs, or server listeners have been implemented yet.
>
> **Statutory Compliance Disclaimer**:
> E-Invoice payload structures, tax classifications, and cancellation time-limits (e.g. 24-hour NIC IRP cancellation window) must be formally validated with current GST rules and a qualified Indian Chartered Accountant.

---

## 1. API Standards & Conventions

The backend API follows REST architectural principles implemented using NestJS with Fastify. All endpoints are versioned under `/api/v1`.

### 1.1 HTTP Headers & Context Propagation

Every authenticated request requires the following headers:

| Header Name           | Type   | Description                                                                                          |
| :-------------------- | :----- | :--------------------------------------------------------------------------------------------------- |
| `Authorization`       | String | `Bearer <JWT_TOKEN>`                                                                                 |
| `X-Organization-Id`   | UUID   | Active organization context                                                                          |
| `X-Company-Id`        | UUID   | Active legal entity (PAN/GSTIN context)                                                              |
| `X-Branch-Id`         | UUID   | Active branch or warehouse location (validated against user's branch assignments)                    |
| `X-Financial-Year-Id` | UUID   | Active accounting financial year (server verifies that transaction date falls within an unlocked FY) |
| `Idempotency-Key`     | String | Unique UUIDv4/UUIDv7 for non-idempotent mutation operations (`POST`, `PUT`)                          |
| `Accept-Language`     | String | Language preference for validation messages: `en` (English) or `gu` (Gujarati)                       |

### 1.2 Unified Error Response (RFC 7807)

Errors return RFC 7807 Problem Details with bilingual error messages:

```json
{
  "type": "https://api.billing.in/errors/insufficient-credit-limit",
  "title": "Credit Limit Exceeded",
  "status": 422,
  "detail": "Party outstanding balance ₹1,25,000 exceeds sanctioned credit limit of ₹1,00,000.",
  "detailGujarati": "પાર્ટીની બાકી રકમ ₹1,25,000 મંજૂર કરેલ ક્રેડિટ મર્યાદા ₹1,00,000 કરતાં વધી ગઈ છે.",
  "instance": "/api/v1/invoices/sales",
  "invalidParams": [
    {
      "name": "partyId",
      "reason": "Credit limit breach of ₹25,000"
    }
  ],
  "timestamp": "2026-10-12T10:45:00.000Z"
}
```

---

## 2. Authentication & Tenant Session Endpoints

### 2.1 Staff / Cashier Login (Phone OTP or Password)

- **Endpoint**: `POST /api/v1/auth/login`
- **Request Body**:

```json
{
  "identifier": "9825012345",
  "authMethod": "PASSWORD",
  "password": "SecurePassword123#",
  "branchCode": "AHD01"
}
```

- **Success Response (200 OK)**:

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "d7a8e1b...",
  "expiresIn": 86400,
  "user": {
    "id": "c1f7b8a0-2f2b-4e12-87ad-7bf482d8d85b",
    "fullName": "Jaydeep Patel",
    "role": "COMPANY_ADMIN",
    "preferredLang": "gu"
  },
  "defaultContext": {
    "organizationId": "5f3a2c10-8b1b-4b10-86d1-443b79f97d51",
    "companyId": "2d9b1a03-7a91-49fa-9486-e789f1d07c08",
    "companyName": "Shree Ambica Traders",
    "gstin": "24AAAAA0000A1Z5",
    "branchId": "e30f140d-d421-4f36-b514-6ef26e5e40e6",
    "branchName": "Ahmedabad Main Godown",
    "financialYearId": "8b5f3a12-61d4-42b7-a3f2-892fcd620b72",
    "financialYear": "FY 2026-27"
  }
}
```

---

## 3. Master Data Endpoints

### 3.1 Fast Barcode Item Lookup (POS Optimized)

- **Endpoint**: `GET /api/v1/items/lookup?code=8901234567890`
- **Latency SLA**: < 15ms (Indexed query with in-memory Redis L1 cache)
- **Success Response (200 OK)**:

```json
{
  "id": "e9b2741d-4861-4648-936d-d128d5d4d3d1",
  "name": "Tata Tea Gold 500g",
  "nameGujarati": "ટાટા ટી ગોલ્ડ ૫૦૦ ગ્રામ",
  "sku": "TTG-500",
  "barcode": "8901234567890",
  "hsnCode": "0902",
  "uom": {
    "id": "uom-1",
    "symbol": "PKT",
    "uqcCode": "PKT"
  },
  "taxRate": 5.0,
  "cessRate": 0.0,
  "retailPrice": 320.0,
  "wholesalePrice": 295.0,
  "mrp": 340.0,
  "currentStock": 48.0,
  "isBatchTracked": false
}
```

### 3.2 Create Party (Customer / Vendor)

- **Endpoint**: `POST /api/v1/parties`
- **Request Body**:

```json
{
  "type": "CUSTOMER",
  "name": "Patel Provision Store",
  "nameGujarati": "પટેલ પ્રોવિઝન સ્ટોર",
  "contactPerson": "Rameshbhai Patel",
  "phone": "9898011223",
  "email": "patelstore@example.com",
  "gstin": "24ABCDE1234F1Z5",
  "gstType": "REGULAR",
  "stateCode": "24",
  "billingAddress": {
    "street": "14, Sardar Complex, Ring Road",
    "city": "Surat",
    "district": "Surat",
    "state": "Gujarat",
    "pincode": "395002"
  },
  "creditLimit": 150000.0,
  "creditDays": 30,
  "interestRate": 18.0,
  "defaultDiscount": 2.0
}
```

---

## 4. Sales Invoicing & POS Endpoints

### 4.1 Create Sales Invoice (B2B / B2C)

- **Endpoint**: `POST /api/v1/invoices/sales`
- **Headers**: `Idempotency-Key: e8c6c9a0-6b6f-4d37-97d2-7c3905cf783f`
- **Request Body**:

```json
{
  "category": "TAX_INVOICE",
  "partyId": "7a3038b5-5c02-4fc8-9f33-6cb2811a2f60",
  "invoiceDate": "2026-10-12",
  "dueDate": "2026-11-11",
  "paymentMode": "UNPAID_CREDIT",
  "placeOfSupply": "24",
  "isB2B": true,
  "isReverseCharge": false,
  "items": [
    {
      "itemId": "e9b2741d-4861-4648-936d-d128d5d4d3d1",
      "hsnCode": "0902",
      "quantity": 10,
      "unitPrice": 295.0,
      "discountPercent": 2.0,
      "taxRate": 5.0
    }
  ],
  "termsAndConditions": "Interest @ 18% p.a. charged after due date.",
  "autoGenerateEWayBill": false,
  "autoGenerateEInvoice": false
}
```

- **Success Response (201 Created)**:

```json
{
  "id": "93a6c4bc-a81d-4c3e-8c38-8c10e167576f",
  "invoiceNumber": "INV/26-27/0142",
  "financialYearId": "8b5f3a12-61d4-42b7-a3f2-892fcd620b72",
  "branchId": "e30f140d-d421-4f36-b514-6ef26e5e40e6",
  "invoiceDate": "2026-10-12",
  "dueDate": "2026-11-11",
  "status": "ISSUED",
  "subTotal": 2950.0,
  "discountTotal": 59.0,
  "taxableAmount": 2891.0,
  "cgstAmount": 72.28,
  "sgstAmount": 72.28,
  "igstAmount": 0.0,
  "cessAmount": 0.0,
  "roundOff": 0.44,
  "grandTotal": 3036.0,
  "grandTotalWords": "Three Thousand Thirty Six Rupees Only",
  "grandTotalWordsGujarati": "અક્ષરે રૂપિયા ત્રણ હજાર છત્રીસ પુરા",
  "balanceAmount": 3036.0,
  "voucher": {
    "id": "vch-0091",
    "voucherNumber": "SL/26-27/0142",
    "balanced": true
  }
}
```

### 4.2 Streamlined POS Checkout (Thermal Receipt Print Ready)

- **Endpoint**: `POST /api/v1/invoices/pos-checkout`
- **Request Body**:

```json
{
  "customerPhone": "9824055667",
  "customerName": "Walk-in Retail Cash Customer",
  "paymentMode": "SPLIT",
  "tenderedSplit": {
    "cash": 1000.0,
    "upiQr": 536.0
  },
  "items": [
    {
      "itemId": "e9b2741d-4861-4648-936d-d128d5d4d3d1",
      "quantity": 5,
      "unitPrice": 320.0,
      "discountAmount": 100.0,
      "taxRate": 5.0
    }
  ]
}
```

### 4.3 Batch Sync for Offline POS (IndexedDB Synchronization)

- **Endpoint**: `POST /api/v1/invoices/pos-sync`
- **Request Body**:

```json
{
  "terminalId": "POS_TERMINAL_01",
  "syncTimestamp": "2026-10-12T10:55:00.000Z",
  "invoices": [
    {
      "clientOfflineUuid": "01925b6e-1d54-7128-874b-ef479e0a6d10",
      "offlineBillNumber": "POS01-OFF-0004",
      "createdAt": "2026-10-12T10:20:15.000Z",
      "customerPhone": "9909012345",
      "grandTotal": 850.0,
      "paymentMode": "CASH",
      "items": [
        {
          "itemId": "item-uuid-1",
          "quantity": 2,
          "unitPrice": 425.0,
          "taxRate": 18.0
        }
      ]
    }
  ]
}
```

- **Success Response (200 OK)**:

```json
{
  "processedCount": 1,
  "failedCount": 0,
  "results": [
    {
      "clientOfflineUuid": "01925b6e-1d54-7128-874b-ef479e0a6d10",
      "status": "SYNCED",
      "serverInvoiceId": "inv-9921",
      "assignedInvoiceNumber": "POS/26-27/0894"
    }
  ]
}
```

### 4.4 Cancel Sales Invoice (with Statutory Time Limit)

- **Endpoint**: `POST /api/v1/invoices/sales/:id/cancel`
- **Request Body**:

```json
{
  "cancellationReason": "Customer requested order cancellation before dispatch",
  "remarks": "Order cancelled"
}
```

- **Error if IRN older than 24 hours (422 Unprocessable Entity)**:

```json
{
  "type": "https://api.billing.in/errors/irn-cancel-window-expired",
  "title": "IRN Cancellation Window Expired",
  "status": 422,
  "detail": "E-Invoices can only be cancelled on the IRP within 24 hours of generation. Please issue a Credit Note instead.",
  "detailGujarati": "IRP પોર્ટલ પર ઈ-ઈનવોઈસ ફક્ત ૨૪ કલાકમાં જ રદ થઈ શકે છે. મહેરબાની કરીને ક્રેડિટ નોટ (જમા ચિઠ્ઠી) બનાવો."
}
```

---

## 5. Payments, Receipts & Bill-by-Bill Allocation

### 5.1 Post Receipt Voucher with Bill Matching (_Jama / ઉધાર પતાવટ_)

- **Endpoint**: `POST /api/v1/vouchers/receipt`
- **Request Body**:

```json
{
  "partyId": "7a3038b5-5c02-4fc8-9f33-6cb2811a2f60",
  "voucherDate": "2026-10-12",
  "depositToAccountId": "ledger-bank-hdfc-01",
  "receivedAmount": 50000.0,
  "paymentReference": "NEFT/HDFC/20261012/99812",
  "narration": "Full settlement against Diwali dispatch bills",
  "narrationGujarati": "દિવાળી માલના બિલ પેટે રકમ જમા",
  "allocations": [
    {
      "invoiceId": "93a6c4bc-a81d-4c3e-8c38-8c10e167576f",
      "settledAmount": 3000.0,
      "cashDiscountGiven": 36.0
    },
    {
      "invoiceId": "another-invoice-uuid",
      "settledAmount": 46964.0,
      "cashDiscountGiven": 0.0
    }
  ]
}
```

---

## 6. GST Compliance & Reporting Endpoints

### 6.1 Generate E-Invoice (IRN via GSP)

- **Endpoint**: `POST /api/v1/gst/einvoice/generate/:invoiceId`
- **Response (200 OK)**:

```json
{
  "invoiceId": "93a6c4bc-a81d-4c3e-8c38-8c10e167576f",
  "irn": "3b29c5e2195f3b7b301c220f17e0892095f95f4c40b7987251787c8d92be8d12",
  "ackNo": "11261029384",
  "ackDate": "2026-10-12T10:48:12.000Z",
  "signedQrCode": "eyJrZXkiOiAiZGVtbyJ9...",
  "status": "ACT"
}
```

### 6.2 Generate E-Way Bill

- **Endpoint**: `POST /api/v1/gst/eway-bill/generate/:invoiceId`
- **Request Body**:

```json
{
  "transporterId": "24AAACG1234F1Z1",
  "transporterName": "Gujarat Roadlines",
  "transDistanceKm": 280,
  "vehicleNo": "GJ01AB1234",
  "vehicleType": "REGULAR"
}
```

- **Response (200 OK)**:

```json
{
  "ewbNumber": "241098765432",
  "ewbDate": "2026-10-12T10:50:00.000Z",
  "validUpto": "2026-10-14T23:59:00.000Z",
  "status": "ACT"
}
```

### 6.3 Export GSTR-1 Summary Data

- **Endpoint**: `GET /api/v1/gst/reports/gstr-1?financialYearId=...&month=10&year=2026`
- **Response (200 OK)**:

```json
{
  "gstin": "24AAAAA0000A1Z5",
  "fp": "102026",
  "grossTurnover": 1542890.0,
  "b2b": [
    {
      "ctin": "24ABCDE1234F1Z5",
      "inv": [
        {
          "inum": "INV/26-27/0142",
          "idt": "12-10-2026",
          "val": 3036.0,
          "pos": "24",
          "rchrg": "N",
          "itms": [
            {
              "num": 1,
              "itm_det": {
                "txval": 2891.0,
                "rt": 5.0,
                "camt": 72.28,
                "samt": 72.28,
                "csamt": 0.0
              }
            }
          ]
        }
      ]
    }
  ],
  "b2cs": [
    {
      "sply_ty": "INTRA",
      "pos": "24",
      "rt": 5.0,
      "txval": 45000.0,
      "camt": 1125.0,
      "samt": 1125.0
    }
  ],
  "hsn": {
    "data": [
      {
        "num": 1,
        "hsn_sc": "0902",
        "desc": "Tea",
        "uqc": "PKT",
        "qty": 10.0,
        "val": 3036.0,
        "txval": 2891.0,
        "camt": 72.28,
        "samt": 72.28
      }
    ]
  }
}
```

---

## 7. Financial Statements & MIS Reports

### 7.1 Day Book (_Rojmel / Aavad / રોજમેળ_)

- **Endpoint**: `GET /api/v1/reports/daybook?date=2026-10-12`
- **Response Format**:

```json
{
  "date": "2026-10-12",
  "openingCashBalance": 12450.0,
  "entries": [
    {
      "voucherNumber": "RC/26-27/0034",
      "voucherType": "RECEIPT",
      "partyName": "Patel Provision Store",
      "partyNameGujarati": "પટેલ પ્રોવિઝન સ્ટોર",
      "debit": 0.0,
      "credit": 50000.0,
      "type": "JAMA",
      "narration": "NEFT Received"
    },
    {
      "voucherNumber": "SL/26-27/0142",
      "voucherType": "SALES",
      "partyName": "Patel Provision Store",
      "partyNameGujarati": "પટેલ પ્રોવિઝન સ્ટોર",
      "debit": 3036.0,
      "credit": 0.0,
      "type": "UDHAR",
      "narration": "Tax Invoice goods dispatch"
    }
  ],
  "totalUdhar": 3036.0,
  "totalJama": 50000.0,
  "closingCashBalance": 59414.0
}
```

### 7.2 Party Outstanding Aging (_Ughrani Yadi / ઉઘરાણી યાદી_)

- **Endpoint**: `GET /api/v1/reports/party-aging?bucketDays=30`
- **Response**:

```json
{
  "summary": {
    "totalReceivable": 1850000.0,
    "notDue": 950000.0,
    "overdue0to30": 450000.0,
    "overdue31to60": 300000.0,
    "overdue60Plus": 150000.0
  },
  "parties": [
    {
      "partyId": "7a3038b5-5c02-4fc8-9f33-6cb2811a2f60",
      "partyName": "Patel Provision Store",
      "partyNameGujarati": "પટેલ પ્રોવિઝન સ્ટોર",
      "phone": "9898011223",
      "creditLimit": 150000.0,
      "totalDue": 84500.0,
      "overdueDays": 42,
      "accruedInterest": 1740.0
    }
  ]
}
```
