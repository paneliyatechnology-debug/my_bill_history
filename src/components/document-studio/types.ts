import React from "react";

export type DocumentStatus = "Draft" | "Issued" | "Paid" | "Partially Paid" | "Unpaid" | "Pending" | "Closed" | "Cancelled";

export interface DocumentHeaderCardProps {
  title: string;
  subtitle?: string;
  status?: DocumentStatus | string;
  documentNumber?: string;
  onPreview?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
  onSaveAsDraft?: () => void;
  isSaving?: boolean;
  moreMenuItems?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    danger?: boolean;
  }>;
  saveButtonLabel?: string;
}

export interface DocumentInfoField {
  id: string;
  label: string;
  required?: boolean;
  type: "text" | "date" | "select" | "custom";
  value?: string | number;
  onChange?: (val: any) => void;
  options?: Array<{ label: string; value: string | number }>;
  placeholder?: string;
  customRender?: React.ReactNode;
}

export interface DocumentInfoStripProps {
  fields: DocumentInfoField[];
}

export interface DocumentItemColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
}

export interface DocumentItemsCardProps {
  title?: string;
  itemsCount: number;
  totalQty?: number | string;
  itemsTotal?: number | string;
  onScanItem?: () => void;
  onImportItems?: () => void;
  onAddItem?: () => void;
  onAddBlankRow?: () => void;
  addItemLabel?: string;
  children: React.ReactNode; // Table or custom items editor
}

export interface DocumentNotesAndTermsProps {
  activeTab: "notes" | "terms";
  onTabChange: (tab: "notes" | "terms") => void;
  notes: string;
  onNotesChange: (val: string) => void;
  terms: string;
  onTermsChange: (val: string) => void;
  onAttachFiles?: (files: FileList | null) => void;
  attachedFilesCount?: number;
}

export interface AdditionalInfoFields {
  transportMode?: string;
  onTransportModeChange?: (val: string) => void;
  vehicleNo?: string;
  onVehicleNoChange?: (val: string) => void;
  ewayBillNo?: string;
  onEwayBillNoChange?: (val: string) => void;
  dispatchDate?: string;
  onDispatchDateChange?: (val: string) => void;
  customFields?: React.ReactNode;
}

export interface SummaryRow {
  label: string;
  value: string | number;
  isDeduction?: boolean;
  isBold?: boolean;
  className?: string;
}

export interface DocumentSummaryCardProps {
  title?: string;
  subtotal: number | string;
  discount?: number | string;
  cgst?: number | string;
  sgst?: number | string;
  igst?: number | string;
  roundOff?: number | string;
  grandTotal: number | string;
  amountInWords?: string;
  customRows?: SummaryRow[];
}

export interface DocumentPaymentCardProps {
  amountReceived: number | string;
  onAmountReceivedChange: (val: number | "") => void;
  paymentMode: string;
  onPaymentModeChange: (val: string) => void;
  balanceDue: number | string;
  onPaidInFull?: () => void;
  isPaid?: boolean;
}

export interface DocumentBottomBarProps {
  totalItems: number;
  totalAmount: number | string;
  onSaveAsDraft?: () => void;
  onSave: () => void;
  isSaving?: boolean;
  saveButtonLabel?: string;
  backHref?: string;
}
