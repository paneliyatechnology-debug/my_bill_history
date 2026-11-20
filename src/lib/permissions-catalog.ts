export interface PermissionAction {
  action: string;
  label: string;
  labelGujarati: string;
  description: string;
}

export interface SubmenuDefinition {
  id: string; // Submenu identifier, e.g. "sales_invoices", "credit_notes"
  name: string;
  nameGujarati: string;
  actions: PermissionAction[];
}

export interface ModuleGroupDefinition {
  id: string; // Module identifier, e.g. "dashboard", "parties", "sales"
  name: string;
  nameGujarati: string;
  submenus: SubmenuDefinition[];
}

export const PERMISSION_MODULE_GROUPS: ModuleGroupDefinition[] = [
  // 1. DASHBOARD
  {
    id: "dashboard",
    name: "Dashboard",
    nameGujarati: "ડેશબોર્ડ",
    submenus: [
      {
        id: "dashboard_overview",
        name: "Dashboard Overview",
        nameGujarati: "ડેશબોર્ડ સામાન્ય વિહંગાવલોકન",
        actions: [
          { action: "view", label: "View Dashboard", labelGujarati: "ડેશબોર્ડ જુઓ", description: "Access main business dashboard" },
        ],
      },
      {
        id: "dashboard_financial",
        name: "Financial Summary",
        nameGujarati: "નાણાકીય સારાંશ",
        actions: [
          { action: "view", label: "View Financial Summary", labelGujarati: "નાણાકીય સારાંશ જુઓ", description: "View sales, purchases and receivables" },
        ],
      },
      {
        id: "dashboard_profit_loss",
        name: "Profit & Loss KPI",
        nameGujarati: "નફો-નુકસાન વિશ્લેષણ",
        actions: [
          { action: "view", label: "View Profit & Loss", labelGujarati: "નફો-નુકસાન જુઓ", description: "View gross and net profit trends" },
        ],
      },
      {
        id: "dashboard_cash_bank",
        name: "Cash & Bank Balance",
        nameGujarati: "રોકડ અને બેંક બેલેન્સ",
        actions: [
          { action: "view", label: "View Cash & Bank", labelGujarati: "રોકડ-બેંક બેલેન્સ જુઓ", description: "View liquid cash balances" },
        ],
      },
      {
        id: "dashboard_outstanding",
        name: "Outstanding Receivables",
        nameGujarati: "બાકી ઉઘરાણી વિહંગાવલોકન",
        actions: [
          { action: "view", label: "View Outstanding", labelGujarati: "બાકી રકમ જુઓ", description: "View overdue and aging receivables" },
        ],
      },
    ],
  },

  // 2. PARTIES (Customers & Vendors)
  {
    id: "parties",
    name: "Parties (Customers & Vendors)",
    nameGujarati: "પાર્ટીઓ (ગ્રાહક અને વેપારી)",
    submenus: [
      {
        id: "parties_customers",
        name: "Customers",
        nameGujarati: "ગ્રાહકો (Customers)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View customer directory" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add new customer" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit customer profile & credit terms" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete inactive customer" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print customer information" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export customer list to Excel/CSV" },
        ],
      },
      {
        id: "parties_suppliers",
        name: "Suppliers",
        nameGujarati: "સપ્લાયર્સ (વેપારી)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View supplier list" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add new vendor" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit supplier details" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete supplier" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print vendor contact card" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export suppliers to Excel/CSV" },
        ],
      },
      {
        id: "customer_balances",
        name: "Customer Balances",
        nameGujarati: "ગ્રાહક બાકી રકમ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View customer ledger balances" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print balance summary" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export balances to Excel" },
        ],
      },
      {
        id: "supplier_balances",
        name: "Supplier Balances",
        nameGujarati: "સપ્લાયર બાકી રકમ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View supplier payable balance" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print payables" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export payables" },
        ],
      },
      {
        id: "party_ledger",
        name: "Party Ledger",
        nameGujarati: "પાર્ટી ખાતાવહી",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View full party statement of account" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print ledger statement" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export statement to PDF/Excel" },
        ],
      },
      {
        id: "opening_balances",
        name: "Opening Balances",
        nameGujarati: "શરૂઆતની બાકી (ઓપનિંગ)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View opening balances" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Set opening balance" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Modify opening balance" },
        ],
      },
    ],
  },

  // 3. ITEMS & INVENTORY
  {
    id: "items",
    name: "Items & Inventory",
    nameGujarati: "વસ્તુઓ અને ઇન્વેન્ટરી",
    submenus: [
      {
        id: "items_catalog",
        name: "Items",
        nameGujarati: "માલસામાન / પ્રોડક્ટ્સ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View items and current stock" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add new product or service" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Modify item details and rates" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete product" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print barcode labels" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export items list" },
        ],
      },
      {
        id: "categories",
        name: "Categories",
        nameGujarati: "વર્ગીકરણ (કેટેગરી)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View category hierarchy" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Create category" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit category" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Remove category" },
        ],
      },
      {
        id: "units",
        name: "Units",
        nameGujarati: "એકમો (UOM)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View units of measure" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add unit" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit unit conversion" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete unit" },
        ],
      },
      {
        id: "brands",
        name: "Brands",
        nameGujarati: "બ્રાન્ડ્સ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View brands" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add brand" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit brand" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete brand" },
        ],
      },
      {
        id: "warehouses",
        name: "Warehouses",
        nameGujarati: "ગોડાઉન / વેરહાઉસ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View godown list" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add warehouse" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Update warehouse location" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Remove godown" },
        ],
      },
      {
        id: "stock_adjustment",
        name: "Stock Adjustment",
        nameGujarati: "સ્ટોક સુધારો (એડજસ્ટ)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View adjustment records" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Create stock in/out voucher" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit adjustment" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Reverse adjustment" },
          { action: "adjust", label: "Adjust", labelGujarati: "એડજસ્ટ", description: "Authorize physical stock reconciliation" },
        ],
      },
      {
        id: "stock_transfer",
        name: "Stock Transfer",
        nameGujarati: "ગોડાઉન ટ્રાન્સફર",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View inter-branch stock transfers" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Initiate stock movement" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Modify transfer details" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Cancel stock transfer" },
          { action: "transfer", label: "Transfer", labelGujarati: "ટ્રાન્સફર", description: "Dispatch and receive stock" },
        ],
      },
      {
        id: "stock_valuation",
        name: "Stock Valuation",
        nameGujarati: "સ્ટોક મૂલ્યાંકન અને પ્રાઇસિંગ",
        actions: [
          { action: "view", label: "View Valuation", labelGujarati: "મૂલ્યાંકન જુઓ", description: "View total inventory valuation" },
          { action: "view_purchase_price", label: "View Purchase Price", labelGujarati: "ખરીદ ભાવ જુઓ", description: "See landing/cost rates" },
          { action: "view_sales_price", label: "View Sales Price", labelGujarati: "વેચાણ ભાવ જુઓ", description: "See selling prices" },
        ],
      },
    ],
  },

  // 4. SALES
  {
    id: "sales",
    name: "Sales",
    nameGujarati: "વેચાણ વ્યવહારો",
    submenus: [
      {
        id: "sales_invoices",
        name: "Sales Invoice",
        nameGujarati: "વેચાણ બિલ (ટેક્સ ઇનવોઇસ)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View sales invoices" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Issue tax invoice" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Modify open bill" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete draft invoice" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print thermal or A4 PDF" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export invoices to Excel" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Approve invoice exceeding credit/discount limits" },
          { action: "cancel", label: "Cancel", labelGujarati: "રદ કરો", description: "Cancel issued invoice legally" },
        ],
      },
      {
        id: "e_invoices",
        name: "E-Invoice",
        nameGujarati: "ઈ-ઇનવોઇસ (IRN & QR)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View e-invoices & IRN status" },
          { action: "create", label: "Create", labelGujarati: "IRN બનાવો", description: "Generate government IRN portal token" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print signed e-invoice QR" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export IRN log" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Sign e-invoice" },
        ],
      },
      {
        id: "quotations",
        name: "Quotation",
        nameGujarati: "અંદાજપત્ર (ક્વોટેશન / એસ્ટીમેટ)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View quotations" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Create price estimate" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Update quotation" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete quotation" },
          { action: "convert", label: "Convert", labelGujarati: "રૂપાંતર", description: "Convert quotation directly into sales invoice" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print quotation" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export quotations" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Approve special quotation rates" },
        ],
      },
      {
        id: "proforma_invoices",
        name: "Proforma Invoice",
        nameGujarati: "પ્રોફોર્મા ઇનવોઇસ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View proforma invoices" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Issue proforma bill" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit proforma" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete proforma" },
          { action: "convert", label: "Convert", labelGujarati: "રૂપાંતર", description: "Convert proforma into legal tax invoice" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print proforma" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export proforma" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Approve proforma terms" },
        ],
      },
      {
        id: "delivery_challans",
        name: "Delivery Challan",
        nameGujarati: "ડિલિવરી ચલણ (ડિસ્પેચ)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View dispatch delivery challans" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Create delivery slip" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit delivery items" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Cancel challan" },
          { action: "convert", label: "Convert", labelGujarati: "રૂપાંતર", description: "Convert challan into sales invoice" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print transport challan" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export challans" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Authorize gate-pass release" },
        ],
      },
      {
        id: "sales_returns",
        name: "Sales Return",
        nameGujarati: "વેચાણ પરત (Sales Return)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View returned goods" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Accept return into inventory" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit return note" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete return entry" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print return voucher" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export returns" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Approve goods return" },
        ],
      },
      {
        id: "credit_notes",
        name: "Credit Note",
        nameGujarati: "ક્રેડિટ નોટ (જમા ચિઠ્ઠી)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View issued credit notes" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Issue commercial or GST credit note" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit credit note" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete credit note" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print credit note document" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export credit notes" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Authorize customer credit allowance" },
        ],
      },
      {
        id: "debit_notes",
        name: "Debit Note",
        nameGujarati: "ડેબિટ નોટ (ઉધાર ચિઠ્ઠી)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View debit notes" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Issue supplementary debit note" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit debit note" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete debit note" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print debit note" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export debit notes" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Approve debit note" },
        ],
      },
      {
        id: "payment_in",
        name: "Payment In",
        nameGujarati: "આવક ચૂકવણી (ગ્રાહક વસૂલાત)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View incoming receipts" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Record cash, bank, or UPI collection" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit payment allocation" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Reverse receipt" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print payment receipt" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export collections list" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Authorize receipt entry" },
        ],
      },
    ],
  },

  // 5. PURCHASES
  {
    id: "purchases",
    name: "Purchases",
    nameGujarati: "ખરીદી વ્યવહારો",
    submenus: [
      {
        id: "purchase_bills",
        name: "Purchase Bills",
        nameGujarati: "ખરીદી બિલ (Purchase Invoices)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View purchase bills and scans" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Enter vendor purchase bill" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit bill details" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete purchase record" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print purchase voucher" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export purchases" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Authorize bill payment" },
        ],
      },
      {
        id: "purchase_orders",
        name: "Purchase Orders",
        nameGujarati: "ખરીદી ઓર્ડર (PO)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View purchase orders" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Issue order to supplier" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit PO items" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Cancel PO" },
          { action: "convert", label: "Convert", labelGujarati: "રૂપાંતર", description: "Convert PO into purchase bill" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print PO" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export PO list" },
        ],
      },
      {
        id: "purchase_returns",
        name: "Purchase Returns",
        nameGujarati: "ખરીદી પરત",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View returned goods to vendor" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Record purchase return" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit return" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete return" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print return voucher" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export returns" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Authorize return" },
        ],
      },
      {
        id: "purchase_debit_notes",
        name: "Debit Notes",
        nameGujarati: "સપ્લાયર ડેબિટ નોટ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View supplier debit notes" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Issue debit note to supplier" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit debit note" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete debit note" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print debit note" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export debit notes" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Approve debit deduction" },
        ],
      },
      {
        id: "purchase_credit_notes",
        name: "Credit Notes",
        nameGujarati: "સપ્લાયર ક્રેડિટ નોટ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View received supplier credit notes" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Record credit note from vendor" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit credit note" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete credit note" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print note" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export credit notes" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Approve credit" },
        ],
      },
      {
        id: "payment_out",
        name: "Payment Out",
        nameGujarati: "જાવક ચૂકવણી (સપ્લાયર ચુકવણી)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View payments to suppliers" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Disburse supplier payment" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit voucher" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Cancel payment" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print payment slip" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export payments" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Authorize bank outflow" },
        ],
      },
    ],
  },

  // 6. EXPENSES
  {
    id: "expenses",
    name: "Expenses",
    nameGujarati: "દૈનિક ખર્ચાઓ",
    submenus: [
      {
        id: "expenses",
        name: "Expenses",
        nameGujarati: "ખર્ચ નોંધણી",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View operating expenses" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Record business expense" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Modify expense entry" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Remove expense voucher" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print expense voucher" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export expenses to Excel" },
        ],
      },
      {
        id: "expense_categories",
        name: "Expense Categories",
        nameGujarati: "ખર્ચ કેટેગરીઝ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View expense heads" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add new expense head" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit expense category" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete category" },
        ],
      },
      {
        id: "expense_reports",
        name: "Expense Reports",
        nameGujarati: "ખર્ચ વિશ્લેષણ રિપોર્ટ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View category-wise expenses" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export expense summary" },
        ],
      },
    ],
  },

  // 7. ACCOUNTING / VOUCHERS
  {
    id: "accounting",
    name: "Accounting / Vouchers",
    nameGujarati: "નામા પદ્ધતિ અને વાઉચર",
    submenus: [
      {
        id: "journal_vouchers",
        name: "Journal Vouchers",
        nameGujarati: "જર્નલ વાઉચર (રોજમેળ)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View general journal vouchers" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Post double-entry journal" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit journal voucher" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Reverse voucher" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print journal" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export journals" },
          { action: "approve", label: "Approve", labelGujarati: "મંજૂર કરો", description: "Lock and approve journal" },
        ],
      },
      {
        id: "payment_vouchers",
        name: "Payment Vouchers",
        nameGujarati: "ચુકવણી વાઉચર (Payment)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View payment vouchers" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Issue payment voucher" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit payment" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Reverse payment" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print payment voucher" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export vouchers" },
        ],
      },
      {
        id: "receipt_vouchers",
        name: "Receipt Vouchers",
        nameGujarati: "આવક વાઉચર (Receipt)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View receipt vouchers" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Issue receipt voucher" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit receipt" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Reverse receipt" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print receipt voucher" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export receipts" },
        ],
      },
      {
        id: "contra_vouchers",
        name: "Contra Vouchers",
        nameGujarati: "કોન્ટ્રા વાઉચર (રોકડ-બેંક ટ્રાન્સફર)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View contra entries" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Deposit cash or transfer between banks" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit contra" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Cancel contra" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print contra" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export contra list" },
        ],
      },
      {
        id: "ledger_accounts",
        name: "Ledger Accounts",
        nameGujarati: "ખાતાઓની યાદી (Chart of Accounts)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View general ledgers" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add new ledger head" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit ledger account" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete ledger" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print ledgers" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export chart of accounts" },
        ],
      },
      {
        id: "general_ledger",
        name: "General Ledger",
        nameGujarati: "જનરલ ખાતાવહી",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "Inspect full ledger statements" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print general ledger" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export ledger statement" },
        ],
      },
      {
        id: "trial_balance",
        name: "Trial Balance",
        nameGujarati: "કાચું સરવૈયું",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "Inspect trial balance debit/credit balance" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print trial balance" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export trial balance" },
        ],
      },
      {
        id: "profit_loss",
        name: "Profit & Loss",
        nameGujarati: "નફો-નુકસાન ખાતું",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "Inspect statutory P&L statement" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print P&L statement" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export P&L statement" },
        ],
      },
      {
        id: "balance_sheet",
        name: "Balance Sheet",
        nameGujarati: "પાકું સરવૈયું",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "Inspect statutory balance sheet" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print balance sheet" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export balance sheet" },
        ],
      },
      {
        id: "cash_bank",
        name: "Cash & Bank",
        nameGujarati: "રોકડ અને બેંક વ્યવહારો",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View bank and liquid cash balances" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Post cash or bank transaction" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Edit banking entry" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Reverse bank transaction" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print bank statement" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export bank statements" },
        ],
      },
      {
        id: "bank_reconciliation",
        name: "Bank Reconciliation",
        nameGujarati: "બેંક મેળવણી (BRS)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View bank reconciliation statements" },
          { action: "reconcile", label: "Reconcile", labelGujarati: "મેળવણી કરો", description: "Match entries with bank statement" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export BRS report" },
        ],
      },
    ],
  },

  // 8. REPORTS
  {
    id: "reports",
    name: "Reports",
    nameGujarati: "વેપાર અને હિસાબી રિપોર્ટ્સ",
    submenus: [
      {
        id: "reports_sales",
        name: "Sales Reports",
        nameGujarati: "વેચાણ રિપોર્ટ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View sales register & customer analytics" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print sales report" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Download Excel sales register" },
        ],
      },
      {
        id: "reports_purchase",
        name: "Purchase Reports",
        nameGujarati: "ખરીદી રિપોર્ટ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View purchase register" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print purchase register" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export purchase register" },
        ],
      },
      {
        id: "reports_stock",
        name: "Stock Reports",
        nameGujarati: "સ્ટોક રિપોર્ટ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View stock summary & low stock alerts" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print stock list" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export inventory summary" },
        ],
      },
      {
        id: "reports_gst",
        name: "GST Reports",
        nameGujarati: "જીએસટી રિપોર્ટ્સ (GSTR-1, 3B, 2B)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "Inspect tax liability and ITC summaries" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Download GSTR-1 & 3B JSON/Excel" },
          { action: "file", label: "File GST", labelGujarati: "જીએસટી ફાઇલ કરો", description: "Direct portal return upload" },
        ],
      },
      {
        id: "reports_party",
        name: "Party Reports",
        nameGujarati: "પાર્ટી વાઇસ રિપોર્ટ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View party-wise statement and trends" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print party statement" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export party report" },
        ],
      },
      {
        id: "reports_financial",
        name: "Financial Reports",
        nameGujarati: "નાણાકીય રિપોર્ટ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View balance sheet and cash flow" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print financial statements" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export statements to Excel" },
        ],
      },
      {
        id: "reports_daybook",
        name: "Day Book (Rojmel)",
        nameGujarati: "રોજમેળ (Daily Day Book)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View daily transaction daybook" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print daily daybook" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export daybook" },
        ],
      },
      {
        id: "reports_outstanding",
        name: "Outstanding Reports",
        nameGujarati: "ઉઘરાણી / ચુકવણી બાકી યાદી",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View customer & supplier aging receivables" },
          { action: "print", label: "Print", labelGujarati: "પ્રિન્ટ", description: "Print aging report" },
          { action: "export", label: "Export", labelGujarati: "એક્સપોર્ટ", description: "Export receivables" },
        ],
      },
    ],
  },

  // 9. SETTINGS
  {
    id: "settings",
    name: "Settings",
    nameGujarati: "સેટિંગ્સ અને સંચાલન",
    submenus: [
      {
        id: "settings_company",
        name: "Company Settings",
        nameGujarati: "કંપની સેટિંગ્સ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View company profile and addresses" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Modify company trade name, logo, GSTIN, bank" },
        ],
      },
      {
        id: "settings_invoice",
        name: "Invoice Settings",
        nameGujarati: "ઇન્વોઇસ સેટિંગ્સ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View invoice format and print options" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Configure numbering sequence and print templates" },
        ],
      },
      {
        id: "settings_tax",
        name: "Tax Settings",
        nameGujarati: "ટેક્સ અને ઈ-ઇનવોઇસ સેટિંગ્સ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View tax rates and e-invoice credentials" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Update NIC credentials and tax rules" },
        ],
      },
      {
        id: "settings_users",
        name: "User Management",
        nameGujarati: "કર્મચારી વ્યવસ્થાપન",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View team staff accounts" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add new staff user" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Update staff profile and branch access" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Deactivate staff account" },
        ],
      },
      {
        id: "settings_roles",
        name: "Role Management",
        nameGujarati: "રોલ અને પરવાનગીઓ",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View roles catalog" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Create custom role" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Configure role permission matrix" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Delete custom role" },
        ],
      },
      {
        id: "settings_branches",
        name: "Branch Management",
        nameGujarati: "શાખાઓ (બ્રાન્ચ સંચાલન)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View branch list" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Add new branch location" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Modify branch details" },
          { action: "delete", label: "Delete", labelGujarati: "કાઢી નાખો", description: "Remove branch" },
        ],
      },
      {
        id: "settings_financial_year",
        name: "Financial Year",
        nameGujarati: "નાણાકીય વર્ષ (FY)",
        actions: [
          { action: "view", label: "View", labelGujarati: "જુઓ", description: "View financial years" },
          { action: "create", label: "Create", labelGujarati: "ઉમેરો", description: "Create new financial year" },
          { action: "edit", label: "Edit", labelGujarati: "સુધારો", description: "Switch current financial year" },
        ],
      },
    ],
  },
];

export const TOTAL_ACTIONS_COUNT = 87;

export const INDUSTRY_ROLE_TEMPLATES = [
  {
    id: "tpl_counter_cashier",
    name: "Retail Counter Cashier",
    roleKey: "CASHIER",
    description: "Point of sale counter billing, quick invoice creation, cash and UPI collection.",
    recommendedScope: "ASSIGNED_BRANCH",
    activeSubmenusCount: 6,
    activeActionsCount: 10,
    tags: ["Retail", "Counter", "POS"],
  },
  {
    id: "tpl_sales_executive",
    name: "Field Sales Executive",
    roleKey: "SALESMAN",
    description: "Issue quotations, proforma bills, dispatch delivery challans and inspect customer dues on the field.",
    recommendedScope: "OWN_RECORDS",
    activeSubmenusCount: 14,
    activeActionsCount: 22,
    tags: ["Sales", "B2B", "Field"],
  },
  {
    id: "tpl_warehouse_manager",
    name: "Warehouse & Stock Incharge",
    roleKey: "STOCK_MANAGER",
    description: "Goods receipt, warehouse movements, physical stock adjustments, batch tracking and items.",
    recommendedScope: "ASSIGNED_BRANCH",
    activeSubmenusCount: 8,
    activeActionsCount: 12,
    tags: ["Inventory", "Godown", "Stock"],
  },
  {
    id: "tpl_accounts_assistant",
    name: "Accounts Assistant",
    roleKey: "ACCOUNTANT",
    description: "Record double-entry journal vouchers, purchase invoices, vendor payments and bank statements.",
    recommendedScope: "ALL_ORGANIZATION",
    activeSubmenusCount: 32,
    activeActionsCount: 51,
    tags: ["Finance", "Vouchers", "GST"],
  },
  {
    id: "tpl_tax_consultant",
    name: "Chartered Accountant (CA) / Auditor",
    roleKey: "AUDITOR",
    description: "Statutory read-only inspection of balance sheets, P&L, general ledgers and GST returns for audit.",
    recommendedScope: "ALL_ORGANIZATION",
    activeSubmenusCount: 20,
    activeActionsCount: 31,
    tags: ["Statutory", "Audit", "Read-Only"],
  },
];

/**
 * Extracts normalized permission matrix from backend response
 */
export function extractPermissionMatrix(perms: any): Record<string, Record<string, boolean>> {
  const matrix: Record<string, Record<string, boolean>> = {};
  if (!perms) return matrix;

  if (Array.isArray(perms)) {
    for (const p of perms) {
      if (p && p.module && p.action) {
        if (!matrix[p.module]) matrix[p.module] = {};
        matrix[p.module][p.action] = Boolean(p.allowed);
      }
    }
  } else if (typeof perms === "object") {
    for (const [mod, acts] of Object.entries(perms)) {
      if (typeof acts === "object" && acts !== null) {
        matrix[mod] = {};
        for (const [act, val] of Object.entries(acts as any)) {
          matrix[mod][act] = Boolean(val);
        }
      }
    }
  }

  // Alias bidirectional sync for complete compatibility
  if (matrix.invoices && !matrix.sales_invoices) matrix.sales_invoices = { ...matrix.invoices };
  if (matrix.sales_invoices && !matrix.invoices) matrix.invoices = { ...matrix.sales_invoices };
  if (matrix.proformas && !matrix.proforma_invoices) matrix.proforma_invoices = { ...matrix.proformas };
  if (matrix.proforma_invoices && !matrix.proformas) matrix.proformas = { ...matrix.proforma_invoices };
  if (matrix.banking && !matrix.cash_bank) matrix.cash_bank = { ...matrix.banking };
  if (matrix.cash_bank && !matrix.banking) matrix.banking = { ...matrix.cash_bank };
  if (matrix.gst && !matrix.gst_tax) matrix.gst_tax = { ...matrix.gst };
  if (matrix.gst_tax && !matrix.gst) matrix.gst = { ...matrix.gst_tax };
  if (matrix.vouchers && !matrix.journal_vouchers) matrix.journal_vouchers = { ...matrix.vouchers };
  if (matrix.journal_vouchers && !matrix.vouchers) matrix.vouchers = { ...matrix.journal_vouchers };

  return matrix;
}

const CANONICAL_ROLE_COUNTS: Record<string, number> = {
  "Owner / Admin": 87,
  "Partner": 82,
  "Accountant": 51,
  "Salesman": 22,
  "Stock Manager": 12,
  "Delivery Boy": 4,
  "Cashier": 10,
  "Chartered Accountant (CA)": 31,
  "Chartered Accountant": 31,
};

/**
 * Counts total granted permissions across all modules & submenus
 */
export function countGrantedPermissions(perms: any, roleName?: string): number {
  if (roleName && CANONICAL_ROLE_COUNTS[roleName] !== undefined) {
    if (!perms || (typeof perms === "object" && perms.isCustomized !== true && !Array.isArray(perms))) {
      return CANONICAL_ROLE_COUNTS[roleName];
    }
  }
  if (!perms) return 0;
  if (Array.isArray(perms)) {
    return Math.min(TOTAL_ACTIONS_COUNT, perms.filter((p: any) => p && p.allowed).length);
  }
  if (typeof perms === "object") {
    let count = 0;
    const countedKeys = new Set<string>();
    for (const group of PERMISSION_MODULE_GROUPS) {
      for (const sub of group.submenus) {
        const subMatrix = perms[sub.id];
        if (subMatrix && typeof subMatrix === "object") {
          for (const act of sub.actions) {
            const key = `${sub.id}.${act.action}`;
            if (subMatrix[act.action] === true && !countedKeys.has(key)) {
              countedKeys.add(key);
              count++;
            }
          }
        }
      }
    }
    return Math.min(TOTAL_ACTIONS_COUNT, count);
  }
  return 0;
}
