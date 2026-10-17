const { PrismaClient } = require("./packages/database");
const prisma = new PrismaClient();

const COMPANY_ID = "92967a06-d488-4794-bae1-e6188e8fb47d";
const ORG_ID = "3127cc52-2797-4dc2-a9d3-55ba236c8d55";
const BRANCH_ID = "96ceb02c-5439-4144-b323-e0d7748c3db0";
const WAREHOUSE_ID = "875f6113-ca48-413f-a4e5-8fb9fcd8a77e";
const FY_ID = "2f51002e-26c2-4a5b-8bae-bfab1a42b4c8";

async function main() {
  console.log("=== Step 1: Clearing all existing transactional and master test records ===");

  // 1. Delete GSTR-2B reconciliations
  await prisma.gstr2bAdjustment.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.gstr2bReconciliation.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.gstr2bLine.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.gstr2bImport.deleteMany({ where: { companyId: COMPANY_ID } });

  // 2. Delete scans
  await prisma.purchaseBillScan.deleteMany({ where: { companyId: COMPANY_ID } });

  // 3. Delete delivery challans & stock transfers
  await prisma.deliveryChallanItem.deleteMany({ where: { challan: { companyId: COMPANY_ID } } });
  await prisma.deliveryChallan.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.stockTransferItem.deleteMany({ where: { transfer: { companyId: COMPANY_ID } } });
  await prisma.stockTransfer.deleteMany({ where: { companyId: COMPANY_ID } });

  // 4. Delete BOM & production
  await prisma.bomItem.deleteMany({ where: { bom: { companyId: COMPANY_ID } } });
  await prisma.productionOrder.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.billOfMaterial.deleteMany({ where: { companyId: COMPANY_ID } });

  // 5. Delete voucher allocations and vouchers
  await prisma.voucherAllocation.deleteMany({ where: { voucher: { companyId: COMPANY_ID } } });
  await prisma.paymentAllocation.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.advanceReceipt.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.voucher.deleteMany({ where: { companyId: COMPANY_ID } });

  // 6. Delete Returns and Debit notes
  await prisma.salesReturnItem.deleteMany({ where: { return: { companyId: COMPANY_ID } } });
  await prisma.salesReturn.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.purchaseReturnItem.deleteMany({ where: { return: { companyId: COMPANY_ID } } });
  await prisma.purchaseReturn.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.outwardDebitNoteItem.deleteMany({ where: { note: { companyId: COMPANY_ID } } });
  await prisma.outwardDebitNote.deleteMany({ where: { companyId: COMPANY_ID } });

  // 7. Delete Invoices & Items
  await prisma.salesInvoiceItem.deleteMany({ where: { invoice: { companyId: COMPANY_ID } } });
  await prisma.salesInvoice.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.purchaseInvoiceItem.deleteMany({ where: { invoice: { companyId: COMPANY_ID } } });
  await prisma.purchaseInvoice.deleteMany({ where: { companyId: COMPANY_ID } });

  // 8. Delete stock transactions & batches
  await prisma.stockTransaction.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.itemBatch.deleteMany({ where: { item: { companyId: COMPANY_ID } } });

  // 9. Delete items
  await prisma.item.deleteMany({ where: { companyId: COMPANY_ID } });

  // 10. Unlink ledger accounts from parties before deleting parties
  await prisma.ledgerAccount.updateMany({
    where: { companyId: COMPANY_ID, partyId: { not: null } },
    data: { partyId: null }
  });

  // Delete parties
  await prisma.party.deleteMany({ where: { companyId: COMPANY_ID } });

  // Reset invoice sequence
  await prisma.invoiceSequence.deleteMany({ where: { companyId: COMPANY_ID } });

  console.log("All records cleared successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
