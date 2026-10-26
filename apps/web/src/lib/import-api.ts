import { apiClient } from "./api-client";
import {
  ImportErrorPolicy,
  ImportJobDto,
  ImportMode,
  ImportModuleSchema,
  ImportParseResult,
  ImportPreviewResult,
} from "@billing/shared-types";

export const importApi = {
  /**
   * Get all supported importable modules
   */
  async getModules(): Promise<ImportModuleSchema[]> {
    return apiClient.get<ImportModuleSchema[]>("/imports/modules");
  },

  /**
   * Get schema definition for a module
   */
  async getModuleSchema(moduleName: string): Promise<ImportModuleSchema> {
    return apiClient.get<ImportModuleSchema>(`/imports/${moduleName}/schema`);
  },

  /**
   * Download Excel or CSV template
   */
  async downloadTemplate(moduleName: string, format: "xlsx" | "csv" = "xlsx"): Promise<void> {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("billing_auth_token") || localStorage.getItem("billing_access_token")
        : null;

    let tenantHeaders: Record<string, string> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("billing_tenant_context");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.companyId) tenantHeaders["x-company-id"] = parsed.companyId;
          if (parsed.organizationId) tenantHeaders["x-organization-id"] = parsed.organizationId;
        }
      } catch {}
    }

    const response = await fetch(
      `${apiClient.getBaseUrl()}/imports/${moduleName}/template?format=${format}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...tenantHeaders,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${moduleName}-import-template.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Upload and parse file (base64 JSON payload for robust cross-environment reliability)
   */
  async parseFile(
    file: File,
    moduleName?: string,
    worksheetName?: string,
  ): Promise<ImportParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultStr = reader.result as string;
          const base64Content = resultStr.split(",")[1] || resultStr;

          const res = await apiClient.post<ImportParseResult>("/imports/parse", {
            fileBase64: base64Content,
            fileName: file.name,
            module: moduleName,
            worksheetName,
          });

          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Validate column mapping & generate preview diagnostics
   */
  async validateMapping(
    jobId: string,
    moduleName: string,
    mapping: Record<string, string>,
    mode: ImportMode = ImportMode.SKIP_DUPLICATES,
  ): Promise<ImportPreviewResult> {
    return apiClient.post<ImportPreviewResult>("/imports/validate", {
      jobId,
      module: moduleName,
      mapping,
      mode,
    });
  },

  /**
   * Confirm & execute the import
   */
  async executeImport(
    jobId: string,
    moduleName: string,
    mapping: Record<string, string>,
    mode: ImportMode = ImportMode.SKIP_DUPLICATES,
    errorPolicy: ImportErrorPolicy = ImportErrorPolicy.IMPORT_VALID_ONLY,
  ): Promise<ImportJobDto> {
    return apiClient.post<ImportJobDto>("/imports/execute", {
      jobId,
      module: moduleName,
      mapping,
      mode,
      errorPolicy,
    });
  },

  /**
   * List recent import jobs for current company
   */
  async getJobs(): Promise<ImportJobDto[]> {
    return apiClient.get<ImportJobDto[]>("/imports/jobs");
  },

  /**
   * Get single job details
   */
  async getJobById(jobId: string): Promise<ImportJobDto> {
    return apiClient.get<ImportJobDto>(`/imports/jobs/${jobId}`);
  },

  /**
   * Download diagnostic error report
   */
  async downloadErrorReport(jobId: string, format: "xlsx" | "csv" = "xlsx"): Promise<void> {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("billing_auth_token") || localStorage.getItem("billing_access_token")
        : null;

    let tenantHeaders: Record<string, string> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("billing_tenant_context");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.companyId) tenantHeaders["x-company-id"] = parsed.companyId;
          if (parsed.organizationId) tenantHeaders["x-organization-id"] = parsed.organizationId;
        }
      } catch {}
    }

    const response = await fetch(
      `${apiClient.getBaseUrl()}/imports/jobs/${jobId}/errors?format=${format}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...tenantHeaders,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to download error report");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${jobId.slice(0, 8)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
