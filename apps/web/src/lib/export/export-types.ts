export type ExportFormat = "xlsx" | "csv" | "pdf";

export interface ExportColumn {
  header: string;
  key?: string;
  type?: "string" | "number" | "currency" | "date" | "boolean";
  width?: number; // width in characters (Excel) or mm (PDF)
  align?: "left" | "center" | "right";
  format?: (value: any, row?: any) => string | number;
}

export interface ExportMetadata {
  title: string;
  titleGu?: string;
  subtitle?: string;
  companyName?: string;
  companyGstin?: string;
  companyAddress?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  filterDescription?: string;
  generatedAt?: string;
  fileName: string;
  sheetName?: string;
  orientation?: "portrait" | "landscape";
  totals?: Record<string, string | number>;
  selectedCount?: number;
  totalCount?: number;
  summaryCards?: {
    label: string;
    value: string | number;
    color?: "default" | "success" | "danger" | "warning";
  }[];
}

export interface ExportSheetData {
  sheetName: string;
  columns: ExportColumn[];
  data: any[];
  totals?: Record<string, string | number>;
}

export interface MultiSheetExportOptions {
  fileName: string;
  companyName?: string;
  companyGstin?: string;
  title: string;
  sheets: ExportSheetData[];
}
