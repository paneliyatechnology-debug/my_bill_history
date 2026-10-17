const { PrismaClient } = require("../packages/database");
const prisma = new PrismaClient();

const COMPANY_ID = "92967a06-d488-4794-bae1-e6188e8fb47d";
const ORG_ID = "3127cc52-2797-4dc2-a9d3-55ba236c8d55";
const BRANCH_ID = "96ceb02c-5439-4144-b323-e0d7748c3db0";
const WAREHOUSE_ID = "875f6113-ca48-413f-a4e5-8fb9fcd8a77e";
const FY_ID = "2f51002e-26c2-4a5b-8bae-bfab1a42b4c8";

async function main() {
  console.log("=== 1. Clearing all existing company records ===");

  await prisma.gstr2bAdjustment.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.gstr2bReconciliation.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.gstr2bLine.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.gstr2bImport.deleteMany({ where: { companyId: COMPANY_ID } });

  await prisma.purchaseBillScan.deleteMany({ where: { companyId: COMPANY_ID } });

  await prisma.deliveryChallanItem.deleteMany({ where: { challan: { companyId: COMPANY_ID } } });
  await prisma.deliveryChallan.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.stockTransferItem.deleteMany({ where: { transfer: { companyId: COMPANY_ID } } });
  await prisma.stockTransfer.deleteMany({ where: { companyId: COMPANY_ID } });

  await prisma.bomItem.deleteMany({ where: { bom: { companyId: COMPANY_ID } } });
  await prisma.productionBatch.deleteMany({ where: { productionOrder: { companyId: COMPANY_ID } } });
  await prisma.productionOrder.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.billOfMaterial.deleteMany({ where: { companyId: COMPANY_ID } });

  await prisma.advanceAdjustment.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.advanceReceipt.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.paymentAllocation.deleteMany({ where: { voucher: { companyId: COMPANY_ID } } });
  await prisma.journalEntry.deleteMany({ where: { voucher: { companyId: COMPANY_ID } } });
  await prisma.voucher.deleteMany({ where: { companyId: COMPANY_ID } });

  await prisma.salesReturnItem.deleteMany({ where: { returnDoc: { companyId: COMPANY_ID } } });
  await prisma.salesReturn.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.purchaseReturnItem.deleteMany({ where: { returnDoc: { companyId: COMPANY_ID } } });
  await prisma.purchaseReturn.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.outwardDebitNoteItem.deleteMany({ where: { note: { companyId: COMPANY_ID } } });
  await prisma.outwardDebitNote.deleteMany({ where: { companyId: COMPANY_ID } });

  await prisma.salesInvoiceItem.deleteMany({ where: { invoice: { companyId: COMPANY_ID } } });
  await prisma.salesInvoice.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.purchaseInvoiceItem.deleteMany({ where: { invoice: { companyId: COMPANY_ID } } });
  await prisma.purchaseInvoice.deleteMany({ where: { companyId: COMPANY_ID } });

  await prisma.stockTransaction.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.itemBatch.deleteMany({ where: { item: { companyId: COMPANY_ID } } });

  await prisma.item.deleteMany({ where: { companyId: COMPANY_ID } });

  await prisma.ledgerAccount.updateMany({
    where: { companyId: COMPANY_ID, partyId: { not: null } },
    data: { partyId: null }
  });

  await prisma.party.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.invoiceSequence.deleteMany({ where: { companyId: COMPANY_ID } });

  console.log("=== Old records cleared successfully! ===");

  console.log("=== 2. Creating / Ensuring Standard UOMs ===");
  const uomConfigs = [
    { name: "Pieces", symbol: "PCS", uqcCode: "PCS" },
    { name: "Kilograms", symbol: "KGS", uqcCode: "KGS" },
    { name: "Litres", symbol: "LTR", uqcCode: "LTR" },
    { name: "Packets", symbol: "PKT", uqcCode: "PAC" },
    { name: "Boxes", symbol: "BOX", uqcCode: "BOX" },
  ];

  const uomMap = {};
  for (const u of uomConfigs) {
    let existing = await prisma.unitOfMeasure.findFirst({
      where: { companyId: COMPANY_ID, uqcCode: u.uqcCode }
    });
    if (!existing) {
      existing = await prisma.unitOfMeasure.create({
        data: {
          organizationId: ORG_ID,
          companyId: COMPANY_ID,
          name: u.name,
          symbol: u.symbol,
          uqcCode: u.uqcCode,
          decimalPlaces: u.uqcCode === "KGS" || u.uqcCode === "LTR" ? 3 : 0,
        }
      });
    }
    uomMap[u.uqcCode] = existing.id;
  }
  console.log("UOMs ready:", Object.keys(uomMap));

  console.log("=== 3. Creating / Ensuring Standard Categories ===");
  const catConfigs = [
    { name: "Dairy & Edible Oils", nameGujarati: "ડેરી અને ખાદ્ય તેલ" },
    { name: "Grocery & Food Staples", nameGujarati: "કરિયાણું અને અનાજ" },
    { name: "Snacks & Beverages", nameGujarati: "નાસ્તો અને પીણાં" },
    { name: "Personal Care & Hygiene", nameGujarati: "પર્સનલ કેર અને સ્વચ્છતા" },
    { name: "Home & Cleaning Care", nameGujarati: "ઘર વપરાશ અને સફાઈ" },
  ];

  const catMap = {};
  for (const c of catConfigs) {
    let existing = await prisma.itemCategory.findFirst({
      where: { companyId: COMPANY_ID, name: c.name }
    });
    if (!existing) {
      existing = await prisma.itemCategory.create({
        data: {
          organizationId: ORG_ID,
          companyId: COMPANY_ID,
          name: c.name,
          nameGujarati: c.nameGujarati,
        }
      });
    }
    catMap[c.name] = existing.id;
  }
  console.log("Categories ready:", Object.keys(catMap));

  console.log("=== 4. Creating 10 REAL Products ===");
  const productDefs = [
    {
      name: "Amul Butter 500g",
      nameGujarati: "અમૂલ માખણ ૫૦૦ ગ્રામ",
      category: "Dairy & Edible Oils",
      hsnCode: "04051000",
      sku: "AMUL-BUTTER-500G",
      barcode: "8901262010053",
      taxRate: 12.0,
      purchaseRate: 245.0,
      retailPrice: 275.0,
      wholesalePrice: 255.0,
      mrp: 275.0,
      uom: "PAC",
      initialStock: 120,
    },
    {
      name: "Fortune Sunlite Refined Sunflower Oil 1L",
      nameGujarati: "ફોર્ચ્યુન સૂર્યમુખી રિફાઈન્ડ તેલ ૧ લીટર",
      category: "Dairy & Edible Oils",
      hsnCode: "15121910",
      sku: "FORT-SUN-1LTR",
      barcode: "8906007280014",
      taxRate: 5.0,
      purchaseRate: 125.0,
      retailPrice: 145.0,
      wholesalePrice: 132.0,
      mrp: 145.0,
      uom: "LTR",
      initialStock: 150,
    },
    {
      name: "Aashirvaad Shudh Chakki Atta 10kg",
      nameGujarati: "આશીર્વાદ શુદ્ધ ચક્કી ઘઉંનો લોટ ૧૦ કિગ્રા",
      category: "Grocery & Food Staples",
      hsnCode: "11010000",
      sku: "AASH-ATTA-10KG",
      barcode: "8901725134106",
      taxRate: 5.0,
      purchaseRate: 410.0,
      retailPrice: 460.0,
      wholesalePrice: 425.0,
      mrp: 460.0,
      uom: "KGS",
      initialStock: 80,
    },
    {
      name: "India Gate Basmati Rice Feast Rozzana 5kg",
      nameGujarati: "ઇન્ડિયા ગેટ બાસમતી ચોખા ૫ કિગ્રા",
      category: "Grocery & Food Staples",
      hsnCode: "10063020",
      sku: "IG-BASMATI-5KG",
      barcode: "8901149010022",
      taxRate: 5.0,
      purchaseRate: 395.0,
      retailPrice: 475.0,
      wholesalePrice: 420.0,
      mrp: 475.0,
      uom: "PAC",
      initialStock: 75,
    },
    {
      name: "Tata Salt Vacuum Evaporated Iodised 1kg",
      nameGujarati: "ટાટા નમક શુદ્ધ મીઠું ૧ કિગ્રા",
      category: "Grocery & Food Staples",
      hsnCode: "25010010",
      sku: "TATA-SALT-1KG",
      barcode: "8901030010012",
      taxRate: 0.0,
      purchaseRate: 22.5,
      retailPrice: 28.0,
      wholesalePrice: 24.0,
      mrp: 28.0,
      uom: "PAC",
      initialStock: 250,
    },
    {
      name: "Wagh Bakri Premium CTC Tea 500g",
      nameGujarati: "વાઘ બકરી પ્રીમિયમ ચા ૫૦૦ ગ્રામ",
      category: "Snacks & Beverages",
      hsnCode: "09024020",
      sku: "WB-TEA-500G",
      barcode: "8901242000012",
      taxRate: 5.0,
      purchaseRate: 240.0,
      retailPrice: 280.0,
      wholesalePrice: 252.0,
      mrp: 280.0,
      uom: "PAC",
      initialStock: 110,
    },
    {
      name: "Parle-G Gold Glucose Biscuits 1kg",
      nameGujarati: "પારલે-જી ગોલ્ડ બિસ્કિટ ૧ કિગ્રા",
      category: "Snacks & Beverages",
      hsnCode: "19053100",
      sku: "PARLE-G-1KG",
      barcode: "8901719101015",
      taxRate: 18.0,
      purchaseRate: 105.0,
      retailPrice: 130.0,
      wholesalePrice: 112.0,
      mrp: 130.0,
      uom: "PAC",
      initialStock: 140,
    },
    {
      name: "Surf Excel Easy Wash Detergent Powder 1kg",
      nameGujarati: "સર્ફ એક્સેલ વોશિંગ પાવડર ૧ કિગ્રા",
      category: "Home & Cleaning Care",
      hsnCode: "34029019",
      sku: "SURF-EXCEL-1KG",
      barcode: "8901030700012",
      taxRate: 18.0,
      purchaseRate: 130.0,
      retailPrice: 155.0,
      wholesalePrice: 138.0,
      mrp: 155.0,
      uom: "PAC",
      initialStock: 95,
    },
    {
      name: "Dettol Original Bathing Soap 125g Pack of 4",
      nameGujarati: "ડેટોલ સાબુ ૧૨૫ ગ્રામ (૪ નંગ પેક)",
      category: "Personal Care & Hygiene",
      hsnCode: "34011110",
      sku: "DETTOL-SOAP-4X",
      barcode: "8901396112224",
      taxRate: 18.0,
      purchaseRate: 160.0,
      retailPrice: 195.0,
      wholesalePrice: 170.0,
      mrp: 195.0,
      uom: "PAC",
      initialStock: 115,
    },
    {
      name: "Colgate Strong Teeth Dental Cream 200g",
      nameGujarati: "કોલગેટ સ્ટ્રોંગ ટીથ ટૂથપેસ્ટ ૨૦૦ ગ્રામ",
      category: "Personal Care & Hygiene",
      hsnCode: "33061020",
      sku: "COLGATE-ST-200G",
      barcode: "8901314010502",
      taxRate: 18.0,
      purchaseRate: 98.0,
      retailPrice: 125.0,
      wholesalePrice: 105.0,
      mrp: 125.0,
      uom: "PCS",
      initialStock: 130,
    },
  ];

  const createdItems = [];
  for (const p of productDefs) {
    const item = await prisma.item.create({
      data: {
        organizationId: ORG_ID,
        companyId: COMPANY_ID,
        categoryId: catMap[p.category],
        type: "PRODUCT",
        name: p.name,
        nameGujarati: p.nameGujarati,
        sku: p.sku,
        barcode: p.barcode,
        hsnCode: p.hsnCode,
        primaryUomId: uomMap[p.uom],
        taxRate: p.taxRate,
        purchaseRate: p.purchaseRate,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
        mrp: p.mrp,
        minStockLevel: 15,
        reorderQuantity: 50,
        isActive: true,
      }
    });

    // Record Opening Stock Transaction
    await prisma.stockTransaction.create({
      data: {
        organizationId: ORG_ID,
        companyId: COMPANY_ID,
        warehouseId: WAREHOUSE_ID,
        itemId: item.id,
        transactionType: "OPENING",
        transactionDate: new Date("2026-04-01"),
        quantity: p.initialStock,
        valuationRate: p.purchaseRate,
        totalValuation: p.initialStock * p.purchaseRate,
        referenceDocType: "OPENING_STOCK",
        referenceDocId: item.id,
      }
    });

    createdItems.push(item);
    console.log(`✓ Product created: ${p.name} (Stock: ${p.initialStock} ${p.uom})`);
  }

  console.log("=== 5. Creating 10 REAL Parties (5 Suppliers, 5 Customers) ===");
  const partyDefs = [
    // 5 Suppliers
    {
      type: "SUPPLIER",
      name: "Gujarat Co-operative Milk Marketing Federation Ltd (GCMMF - Amul)",
      nameGujarati: "ગુજરાત કો-ઓપરેટિવ મિલ્ક માર્કેટિંગ ફેડરેશન લી. (અમૂલ)",
      contactPerson: "Rajeshbhai Patel",
      phone: "9825012345",
      email: "supply.anand@amul.coop",
      gstin: "24AAACG1234F1Z5",
      pan: "AAACG1234F",
      gstType: "REGULAR",
      stateCode: "24",
      billingAddress: {
        line1: "Amul Dairy Road",
        city: "Anand",
        state: "Gujarat",
        pincode: "388001"
      }
    },
    {
      type: "SUPPLIER",
      name: "Adani Wilmar Limited",
      nameGujarati: "અદાણી વિલ્મર લિમિટેડ",
      contactPerson: "Dhiren Shah",
      phone: "9825123456",
      email: "sales.wilmar@adaniwilmar.in",
      gstin: "24AABCA5678G1Z2",
      pan: "AABCA5678G",
      gstType: "REGULAR",
      stateCode: "24",
      billingAddress: {
        line1: "Fortune House, Near Navrangpura Railway Crossing",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380009"
      }
    },
    {
      type: "SUPPLIER",
      name: "Tata Consumer Products Distribution Hub",
      nameGujarati: "ટાટા કન્ઝ્યુમર પ્રોડક્ટ્સ ડિસ્ટ્રિબ્યુશન હબ",
      contactPerson: "Sunil Verma",
      phone: "9825234567",
      email: "orders.gujarat@tataconsumer.com",
      gstin: "24AAACT9012H1Z9",
      pan: "AAACT9012H",
      gstType: "REGULAR",
      stateCode: "24",
      billingAddress: {
        line1: "Changodar Industrial Area, Sanand Road",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "382213"
      }
    },
    {
      type: "SUPPLIER",
      name: "Hindustan Unilever Wholesale Agency",
      nameGujarati: "હિન્દુસ્તાન યુનિલિવર હોલસેલ એજન્સી",
      contactPerson: "Mahesh Desai",
      phone: "9825345678",
      email: "wholesale.surat@hulagency.com",
      gstin: "24AAACH3456J1Z6",
      pan: "AAACH3456J",
      gstType: "REGULAR",
      stateCode: "24",
      billingAddress: {
        line1: "Ring Road Logistics Park",
        city: "Surat",
        state: "Gujarat",
        pincode: "395002"
      }
    },
    {
      type: "SUPPLIER",
      name: "Parle Agro & Biscuits C&F Agency",
      nameGujarati: "પારલે એગ્રો એન્ડ બિસ્કિટ્સ સી એન્ડ એફ એજન્સી",
      contactPerson: "Kamlesh Mehta",
      phone: "9825456789",
      email: "rajkot.supply@parlebiscuit.in",
      gstin: "24AAACP7890K1Z3",
      pan: "AAACP7890K",
      gstType: "REGULAR",
      stateCode: "24",
      billingAddress: {
        line1: "Aji Industrial Estate Phase-2",
        city: "Rajkot",
        state: "Gujarat",
        pincode: "360003"
      }
    },

    // 5 Customers
    {
      type: "CUSTOMER",
      name: "Shree Mahalakshmi Provision & General Store",
      nameGujarati: "શ્રી મહાલક્ષ્મી પ્રોવિઝન એન્ડ જનરલ સ્ટોર",
      contactPerson: "Ghanshyambhai Prajapati",
      phone: "9898011223",
      email: "mahalakshmi.kirana@gmail.com",
      gstin: "24AABCM1122L1Z4",
      pan: "AABCM1122L",
      gstType: "COMPOSITION",
      stateCode: "24",
      billingAddress: {
        line1: "Shop No. 12, Swastik Cross Road, Navrangpura",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380009"
      }
    },
    {
      type: "CUSTOMER",
      name: "Jay Ambe Supermarket & Departmental Store",
      nameGujarati: "જય અંબે સુપરમાર્કેટ એન્ડ ડિપાર્ટમેન્ટલ સ્ટોર",
      contactPerson: "Kiritbhai Somani",
      phone: "9898122334",
      email: "jayambemart@gmail.com",
      gstin: "24AABCJ3344M1Z1",
      pan: "AABCJ3344M",
      gstType: "REGULAR",
      stateCode: "24",
      billingAddress: {
        line1: "Rambaug Main Road, Maninagar",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380008"
      }
    },
    {
      type: "CUSTOMER",
      name: "Patel Kirana & Wholesale Mart",
      nameGujarati: "પટેલ કિરાણા એન્ડ હોલસેલ માર્ટ",
      contactPerson: "Hareshbhai Patel",
      phone: "9898233445",
      email: "patelkirana.bopal@gmail.com",
      gstin: "24AABCP5566N1Z8",
      pan: "AABCP5566N",
      gstType: "REGULAR",
      stateCode: "24",
      billingAddress: {
        line1: "Sun City Commercial Complex, South Bopal",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380058"
      }
    },
    {
      type: "CUSTOMER",
      name: "Radhe Krishna Retail Mall",
      nameGujarati: "રાધે કૃષ્ણ રિટેલ મોલ",
      contactPerson: "Bharatbhai Dave",
      phone: "9898344556",
      email: "radhekrishna.retail@gmail.com",
      gstin: "24AABCR7788P1Z5",
      pan: "AABCR7788P",
      gstType: "REGULAR",
      stateCode: "24",
      billingAddress: {
        line1: "Prernatirth Derasar Road, Satellite",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380015"
      }
    },
    {
      type: "CUSTOMER",
      name: "Tirupati Wholesale Cash & Carry",
      nameGujarati: "તિરુપતિ હોલસેલ કેશ એન્ડ કેરી",
      contactPerson: "Jayeshbhai Agarwal",
      phone: "9898455667",
      email: "tirupati.cashcarry@gmail.com",
      gstin: "24AABCT9900Q1Z2",
      pan: "AABCT9900Q",
      gstType: "REGULAR",
      stateCode: "24",
      billingAddress: {
        line1: "GIDC Phase-1, Naroda Road",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "382330"
      }
    },
  ];

  const createdParties = [];
  for (const p of partyDefs) {
    const party = await prisma.party.create({
      data: {
        organizationId: ORG_ID,
        companyId: COMPANY_ID,
        type: p.type,
        name: p.name,
        nameGujarati: p.nameGujarati,
        contactPerson: p.contactPerson,
        phone: p.phone,
        email: p.email,
        gstin: p.gstin,
        pan: p.pan,
        gstType: p.gstType,
        stateCode: p.stateCode,
        billingAddress: p.billingAddress,
        shippingAddress: p.billingAddress,
        creditLimit: 500000,
        creditDays: 30,
        isActive: true,
      }
    });
    createdParties.push(party);
    console.log(`✓ Party created: [${p.type}] ${p.name}`);
  }

  const suppliers = createdParties.filter(p => p.type === "SUPPLIER");
  const customers = createdParties.filter(p => p.type === "CUSTOMER");

  console.log("=== 6. Creating 10 REAL Purchase Invoices / Bills ===");
  const purchaseBillsData = [
    {
      supplier: suppliers[0], // GCMMF
      billNo: "GCMMF/26-27/0891",
      date: new Date("2026-09-02"),
      items: [
        { item: createdItems[0], qty: 40, rate: 245.0, taxRate: 12.0 }, // Amul butter
      ],
      paid: true,
    },
    {
      supplier: suppliers[1], // Adani Wilmar
      billNo: "AWL/AHM/2026/1104",
      date: new Date("2026-09-05"),
      items: [
        { item: createdItems[1], qty: 80, rate: 125.0, taxRate: 5.0 }, // Fortune oil
      ],
      paid: true,
    },
    {
      supplier: suppliers[2], // Tata Consumer
      billNo: "TCP/GUJ/04822",
      date: new Date("2026-09-10"),
      items: [
        { item: createdItems[4], qty: 150, rate: 22.5, taxRate: 0.0 }, // Tata salt
        { item: createdItems[5], qty: 40, rate: 240.0, taxRate: 5.0 }, // Wagh Bakri tea
      ],
      paid: true,
    },
    {
      supplier: suppliers[3], // HUL
      billNo: "HUL/SRT/98214",
      date: new Date("2026-09-14"),
      items: [
        { item: createdItems[7], qty: 50, rate: 130.0, taxRate: 18.0 }, // Surf excel
        { item: createdItems[8], qty: 45, rate: 160.0, taxRate: 18.0 }, // Dettol soap
      ],
      paid: true,
    },
    {
      supplier: suppliers[4], // Parle
      billNo: "PARLE/RJK/4412",
      date: new Date("2026-09-18"),
      items: [
        { item: createdItems[6], qty: 90, rate: 105.0, taxRate: 18.0 }, // Parle G
      ],
      paid: true,
    },
    {
      supplier: suppliers[0], // GCMMF
      billNo: "GCMMF/26-27/0942",
      date: new Date("2026-09-22"),
      items: [
        { item: createdItems[0], qty: 35, rate: 245.0, taxRate: 12.0 }, // Amul butter
      ],
      paid: false,
    },
    {
      supplier: suppliers[1], // Adani Wilmar
      billNo: "AWL/AHM/2026/1250",
      date: new Date("2026-09-26"),
      items: [
        { item: createdItems[2], qty: 50, rate: 410.0, taxRate: 5.0 }, // Aashirvaad Atta
      ],
      paid: true,
    },
    {
      supplier: suppliers[2], // Tata Consumer
      billNo: "TCP/GUJ/05118",
      date: new Date("2026-10-01"),
      items: [
        { item: createdItems[3], qty: 45, rate: 395.0, taxRate: 5.0 }, // Basmati Rice
      ],
      paid: true,
    },
    {
      supplier: suppliers[3], // HUL
      billNo: "HUL/SRT/99401",
      date: new Date("2026-10-08"),
      items: [
        { item: createdItems[9], qty: 60, rate: 98.0, taxRate: 18.0 }, // Colgate
      ],
      paid: true,
    },
    {
      supplier: suppliers[4], // Parle
      billNo: "PARLE/RJK/4580",
      date: new Date("2026-10-14"),
      items: [
        { item: createdItems[6], qty: 60, rate: 105.0, taxRate: 18.0 }, // Parle-G
      ],
      paid: false,
    },
  ];

  for (const b of purchaseBillsData) {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    const itemsData = [];

    for (const line of b.items) {
      const lineTaxable = line.qty * line.rate;
      const lineTax = (lineTaxable * line.taxRate) / 100;
      const halfTax = lineTax / 2;

      taxable += lineTaxable;
      cgst += halfTax;
      sgst += halfTax;

      itemsData.push({
        itemId: line.item.id,
        hsnCode: line.item.hsnCode,
        quantity: line.qty,
        unitPrice: line.rate,
        taxableAmount: lineTaxable,
        taxRate: line.taxRate,
        cgstAmount: halfTax,
        sgstAmount: halfTax,
        igstAmount: 0,
        totalAmount: lineTaxable + lineTax,
      });
    }

    const grandTotal = Math.round((taxable + cgst + sgst) * 100) / 100;
    const paidAmount = b.paid ? grandTotal : 0;
    const balanceAmount = grandTotal - paidAmount;

    const purchaseInv = await prisma.purchaseInvoice.create({
      data: {
        organizationId: ORG_ID,
        companyId: COMPANY_ID,
        branchId: BRANCH_ID,
        financialYearId: FY_ID,
        partyId: b.supplier.id,
        vendorInvoiceNumber: b.billNo,
        invoiceDate: b.date,
        placeOfSupply: "24",
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: 0,
        cessAmount: 0,
        grandTotal,
        paidAmount,
        balanceAmount,
        itcEligibility: "ELIGIBLE",
        items: {
          create: itemsData
        }
      }
    });

    // Stock transaction for purchase
    for (const line of b.items) {
      await prisma.stockTransaction.create({
        data: {
          organizationId: ORG_ID,
          companyId: COMPANY_ID,
          warehouseId: WAREHOUSE_ID,
          itemId: line.item.id,
          transactionType: "PURCHASE_RECEIPT",
          transactionDate: b.date,
          quantity: line.qty,
          valuationRate: line.rate,
          totalValuation: line.qty * line.rate,
          referenceDocType: "PURCHASE_INVOICE",
          referenceDocId: purchaseInv.id,
        }
      });
    }

    console.log(`✓ Purchase Bill created: ${b.billNo} from ${b.supplier.name} (₹${grandTotal.toFixed(2)})`);
  }

  console.log("=== 7. Creating 10 REAL Sales Invoices ===");
  const salesInvoicesData = [
    {
      customer: customers[0], // Shree Mahalakshmi
      invNo: "INV/26-27/0001",
      date: new Date("2026-09-06"),
      status: "PAID",
      items: [
        { item: createdItems[0], qty: 10, rate: 275.0, taxRate: 12.0 }, // Amul butter
        { item: createdItems[4], qty: 25, rate: 28.0, taxRate: 0.0 },   // Tata salt
        { item: createdItems[1], qty: 15, rate: 145.0, taxRate: 5.0 },  // Fortune oil
      ],
    },
    {
      customer: customers[1], // Jay Ambe Supermarket
      invNo: "INV/26-27/0002",
      date: new Date("2026-09-12"),
      status: "PAID",
      items: [
        { item: createdItems[2], qty: 12, rate: 460.0, taxRate: 5.0 },  // Atta
        { item: createdItems[3], qty: 10, rate: 475.0, taxRate: 5.0 },  // Basmati
        { item: createdItems[5], qty: 15, rate: 280.0, taxRate: 5.0 },  // Wagh Bakri Tea
      ],
    },
    {
      customer: customers[2], // Patel Kirana
      invNo: "INV/26-27/0003",
      date: new Date("2026-09-16"),
      status: "PAID",
      items: [
        { item: createdItems[7], qty: 20, rate: 155.0, taxRate: 18.0 }, // Surf Excel
        { item: createdItems[8], qty: 15, rate: 195.0, taxRate: 18.0 }, // Dettol Soap
        { item: createdItems[9], qty: 25, rate: 125.0, taxRate: 18.0 }, // Colgate
      ],
    },
    {
      customer: customers[3], // Radhe Krishna
      invNo: "INV/26-27/0004",
      date: new Date("2026-09-20"),
      status: "PAID",
      items: [
        { item: createdItems[6], qty: 30, rate: 130.0, taxRate: 18.0 }, // Parle-G
        { item: createdItems[4], qty: 30, rate: 28.0, taxRate: 0.0 },   // Tata Salt
        { item: createdItems[0], qty: 8, rate: 275.0, taxRate: 12.0 },  // Amul butter
      ],
    },
    {
      customer: customers[4], // Tirupati Wholesale
      invNo: "INV/26-27/0005",
      date: new Date("2026-09-25"),
      status: "PARTIALLY_PAID",
      items: [
        { item: createdItems[1], qty: 30, rate: 135.0, taxRate: 5.0 },  // Fortune oil
        { item: createdItems[3], qty: 20, rate: 430.0, taxRate: 5.0 },  // Basmati
        { item: createdItems[2], qty: 15, rate: 430.0, taxRate: 5.0 },  // Atta
      ],
    },
    {
      customer: customers[0], // Shree Mahalakshmi
      invNo: "INV/26-27/0006",
      date: new Date("2026-09-28"),
      status: "PAID",
      items: [
        { item: createdItems[7], qty: 18, rate: 155.0, taxRate: 18.0 }, // Surf Excel
        { item: createdItems[8], qty: 12, rate: 195.0, taxRate: 18.0 }, // Dettol
        { item: createdItems[6], qty: 25, rate: 130.0, taxRate: 18.0 }, // Parle G
      ],
    },
    {
      customer: customers[1], // Jay Ambe
      invNo: "INV/26-27/0007",
      date: new Date("2026-10-03"),
      status: "PAID",
      items: [
        { item: createdItems[5], qty: 20, rate: 280.0, taxRate: 5.0 },  // Tea
        { item: createdItems[9], qty: 30, rate: 125.0, taxRate: 18.0 }, // Colgate
        { item: createdItems[0], qty: 12, rate: 275.0, taxRate: 12.0 }, // Amul butter
      ],
    },
    {
      customer: customers[2], // Patel Kirana
      invNo: "INV/26-27/0008",
      date: new Date("2026-10-07"),
      status: "PAID",
      items: [
        { item: createdItems[3], qty: 14, rate: 475.0, taxRate: 5.0 },  // Basmati
        { item: createdItems[1], qty: 20, rate: 145.0, taxRate: 5.0 },  // Fortune oil
        { item: createdItems[4], qty: 40, rate: 28.0, taxRate: 0.0 },   // Tata Salt
      ],
    },
    {
      customer: customers[3], // Radhe Krishna
      invNo: "INV/26-27/0009",
      date: new Date("2026-10-11"),
      status: "ISSUED",
      items: [
        { item: createdItems[2], qty: 10, rate: 460.0, taxRate: 5.0 },  // Atta
        { item: createdItems[6], qty: 35, rate: 130.0, taxRate: 18.0 }, // Parle G
        { item: createdItems[8], qty: 10, rate: 195.0, taxRate: 18.0 }, // Dettol
      ],
    },
    {
      customer: customers[4], // Tirupati Wholesale
      invNo: "INV/26-27/0010",
      date: new Date("2026-10-15"),
      status: "PAID",
      items: [
        { item: createdItems[0], qty: 25, rate: 260.0, taxRate: 12.0 }, // Amul butter
        { item: createdItems[7], qty: 30, rate: 140.0, taxRate: 18.0 }, // Surf Excel
        { item: createdItems[9], qty: 40, rate: 110.0, taxRate: 18.0 }, // Colgate
      ],
    },
  ];

  for (const s of salesInvoicesData) {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    const itemsData = [];

    for (const line of s.items) {
      const lineTaxable = line.qty * line.rate;
      const lineTax = (lineTaxable * line.taxRate) / 100;
      const halfTax = lineTax / 2;

      taxable += lineTaxable;
      cgst += halfTax;
      sgst += halfTax;

      itemsData.push({
        itemId: line.item.id,
        hsnCode: line.item.hsnCode,
        quantity: line.qty,
        unitPrice: line.rate,
        taxableAmount: lineTaxable,
        taxRate: line.taxRate,
        cgstAmount: halfTax,
        sgstAmount: halfTax,
        igstAmount: 0,
        totalAmount: lineTaxable + lineTax,
      });
    }

    const grandTotal = Math.round((taxable + cgst + sgst) * 100) / 100;
    const paidAmount = s.status === "PAID" ? grandTotal : s.status === "PARTIALLY_PAID" ? Math.round(grandTotal * 0.5) : 0;
    const balanceAmount = grandTotal - paidAmount;

    const salesInv = await prisma.salesInvoice.create({
      data: {
        organizationId: ORG_ID,
        companyId: COMPANY_ID,
        branchId: BRANCH_ID,
        financialYearId: FY_ID,
        partyId: s.customer.id,
        category: "TAX_INVOICE",
        invoiceNumber: s.invNo,
        invoiceDate: s.date,
        placeOfSupply: "24",
        status: s.status,
        paymentMode: s.status === "PAID" ? "BANK_TRANSFER" : s.status === "PARTIALLY_PAID" ? "CASH" : "UNPAID_CREDIT",
        isB2B: Boolean(s.customer.gstin),
        billingAddress: s.customer.billingAddress,
        shippingAddress: s.customer.shippingAddress || s.customer.billingAddress,
        subTotal: taxable,
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: 0,
        cessAmount: 0,
        grandTotal,
        paidAmount,
        balanceAmount,
        items: {
          create: itemsData
        }
      }
    });

    // Stock transaction for sales issue
    for (const line of s.items) {
      await prisma.stockTransaction.create({
        data: {
          organizationId: ORG_ID,
          companyId: COMPANY_ID,
          warehouseId: WAREHOUSE_ID,
          itemId: line.item.id,
          transactionType: "SALES_DISPATCH",
          transactionDate: s.date,
          quantity: -line.qty,
          valuationRate: Number(line.item.purchaseRate),
          totalValuation: -(line.qty * Number(line.item.purchaseRate)),
          referenceDocType: "SALES_INVOICE",
          referenceDocId: salesInv.id,
        }
      });
    }

    console.log(`✓ Sales Invoice created: ${s.invNo} to ${s.customer.name} (₹${grandTotal.toFixed(2)} - ${s.status})`);
  }

  // Ensure invoice sequence is at 10
  const existingSeq = await prisma.invoiceSequence.findFirst({
    where: {
      companyId: COMPANY_ID,
      financialYearId: FY_ID,
      category: "TAX_INVOICE",
      prefix: "INV/26-27/",
    }
  });
  if (existingSeq) {
    await prisma.invoiceSequence.update({
      where: { id: existingSeq.id },
      data: { currentNumber: 10 }
    });
  } else {
    await prisma.invoiceSequence.create({
      data: {
        companyId: COMPANY_ID,
        financialYearId: FY_ID,
        branchId: BRANCH_ID,
        category: "TAX_INVOICE",
        prefix: "INV/26-27/",
        currentNumber: 10,
        padding: 4,
      }
    });
  }

  console.log("\n========================================================");
  console.log("🎉 ALL REAL DATA POPULATED SUCCESSFULLY!");
  console.log("• 10 Real Products with English + Gujarati names & barcodes");
  console.log("• 10 Real Parties (5 Suppliers + 5 Customers)");
  console.log("• 10 Real Purchase Bills with proper taxes and vendors");
  console.log("• 10 Real Sales Invoices with real items and stock tracking");
  console.log("========================================================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
