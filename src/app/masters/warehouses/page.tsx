"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface Warehouse {
  id: string;
  name: string;
  isDefault: boolean;
  address?: string;
  branchId?: string;
  createdAt: string;
}

export default function WarehousesPage() {
  const { lang, tenantContext, branches } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    address: "",
    isDefault: false,
  });

  // Delete Modal
  const [whToDelete, setWhToDelete] = useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    branchId: "",
    isDefault: false,
  });

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/masters/warehouses");
      setWarehouses(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || "Failed to load warehouses.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchWarehouses();
    }
  }, [tenantContext.companyId, fetchWarehouses]);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/masters/warehouses", {
        name: formData.name,
        address: formData.address || undefined,
        branchId: formData.branchId || undefined,
        isDefault: formData.isDefault,
      });

      setIsModalOpen(false);
      await fetchWarehouses();
    } catch (err: any) {
      setFormError(err.message || "Failed to create warehouse.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (w: Warehouse) => {
    setEditingWh(w);
    setEditFormData({
      name: w.name,
      address: w.address || "",
      isDefault: w.isDefault,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWh) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.put(`/masters/warehouses/${editingWh.id}`, {
        name: editFormData.name,
        address: editFormData.address || undefined,
        isDefault: editFormData.isDefault,
      });

      setIsEditModalOpen(false);
      setEditingWh(null);
      await fetchWarehouses();
    } catch (err: any) {
      setFormError(err.message || "Failed to update warehouse.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!whToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/masters/warehouses/${whToDelete.id}`);
      setWhToDelete(null);
      await fetchWarehouses();
    } catch (err: any) {
      setError(err.message || "Failed to delete warehouse.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "ગોડાઉન વ્યવસ્થા (Warehouses & Godowns)"
              : "Warehouses & Storage Locations"}
          </h1>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "મુખ્ય ગોડાઉન, શાખા સ્ટોક અને ડીસ્પેચ લોકેશન"
              : "Manage multi-location stock points and dispatch godowns"}
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: "",
              address: "",
              branchId: branches[0]?.id || "",
              isDefault: false,
            });
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs sm:text-sm font-bold rounded-xl shadow-card hover:shadow-hover transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{lang === "gu" ? "નવું ગોડાઉન ઉમેરો" : "Add Warehouse"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Main DataTable */}
      <DataTable<Warehouse>
        data={warehouses}
        columns={[
          {
            header: lang === "gu" ? "ગોડાઉનનું નામ" : "Warehouse Name",
            accessorKey: "name",
            sortable: true,
            cell: (w) => (
              <span className="font-semibold text-slate-900">{w.name}</span>
            ),
          },
          {
            header: lang === "gu" ? "સરનામું" : "Address",
            accessorKey: "address",
            sortable: true,
            cell: (w) => (
              <span className="text-slate-600">{w.address || "Main Branch Premises"}</span>
            ),
          },
          {
            header: lang === "gu" ? "ડીફોલ્ટ" : "Default Dispatch",
            accessorKey: "isDefault",
            sortable: true,
            cell: (w) =>
              w.isDefault ? (
                <Badge variant="success">Primary Default</Badge>
              ) : (
                <span className="text-slate-400">Secondary</span>
              ),
          },
          {
            header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
            className: "text-center",
            cell: (w) => (
              <div className="inline-flex items-center justify-center gap-1.5">
                <button
                  onClick={() => handleOpenEditModal(w)}
                  className="px-2.5 py-1 text-xs font-semibold text-[#F47721] bg-[#FFF3E8] hover:bg-[#F47721] hover:text-white border border-[#F47721]/30 rounded transition-colors inline-flex items-center gap-1"
                  title="Edit Warehouse"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>{lang === "gu" ? "સુધારો" : "Edit"}</span>
                </button>
                <button
                  onClick={() => setWhToDelete(w)}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors inline-flex items-center gap-1"
                  title="Delete Warehouse"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>{lang === "gu" ? "કાઢી નાખો" : "Delete"}</span>
                </button>
              </div>
            ),
          },
        ]}
        keyExtractor={(w) => w.id}
        searchPlaceholder={
          lang === "gu"
            ? "ગોડાઉનનું નામ અથવા સરનામું શોધો..."
            : "Search warehouses by name or address..."
        }
        searchKeys={["name", "address"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ ગોડાઉન મળ્યા નથી. ઉપર 'નવું ગોડાઉન ઉમેરો' પર ક્લિક કરો."
            : "No warehouses found. Click 'Add Warehouse' to register your godown."
        }
        exportFilename="warehouses_master"
        themeColor="saffron"
        mobileCardRender={(w) => (
          <div key={w.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{w.name}</span>
              {w.isDefault ? (
                <Badge variant="success">Primary Default</Badge>
              ) : (
                <span className="text-xs text-slate-400">Secondary</span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {w.address || "Main Branch Premises"}
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => handleOpenEditModal(w)}
                className="text-xs text-[#F47721] font-semibold"
              >
                {lang === "gu" ? "સુધારો" : "Edit"}
              </button>
              <button
                onClick={() => setWhToDelete(w)}
                className="text-xs text-rose-600 font-semibold"
              >
                {lang === "gu" ? "કાઢી નાખો" : "Delete"}
              </button>
            </div>
          </div>
        )}
      />

      {/* Create Warehouse Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === "gu" ? "નવું ગોડાઉન ઉમેરો" : "Add Warehouse Location"}
        titleGujarati="સ્ટોરેજ અને ડિસ્પેચ સેન્ટર"
        maxWidth="md"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Warehouse / Godown Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Central Godown Unit 1"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Address / Location
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Plot No. 12, GIDC"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefaultWh"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="isDefaultWh"
              className="text-xs font-medium text-slate-700 cursor-pointer"
            >
              Set as Default Dispatch Warehouse
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#F47721] hover:bg-[#D95F12] disabled:bg-[#F47721]/50 rounded-lg shadow-sm"
            >
              {isSubmitting ? "Saving..." : "Save Warehouse"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Warehouse Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingWh(null);
        }}
        title={lang === "gu" ? "ગોડાઉન સુધારો (Edit Warehouse)" : "Edit Warehouse Location"}
        titleGujarati={editingWh ? editingWh.name : ""}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateWarehouse} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Warehouse / Godown Name *
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              placeholder="e.g. Central Godown Unit 1"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Address / Location
            </label>
            <input
              type="text"
              value={editFormData.address}
              onChange={(e) =>
                setEditFormData({ ...editFormData, address: e.target.value })
              }
              placeholder="Plot No. 12, GIDC"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="editIsDefaultWh"
              checked={editFormData.isDefault}
              onChange={(e) =>
                setEditFormData({ ...editFormData, isDefault: e.target.checked })
              }
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="editIsDefaultWh"
              className="text-xs font-medium text-slate-700 cursor-pointer"
            >
              Set as Default Dispatch Warehouse
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingWh(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#F47721] hover:bg-[#D95F12] disabled:bg-[#F47721]/50 rounded-lg shadow-sm"
            >
              {isSubmitting ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!whToDelete}
        onClose={() => setWhToDelete(null)}
        title={lang === "gu" ? "ગોડાઉન કાઢી નાખવાની ખાતરી" : "Confirm Delete Warehouse"}
        titleGujarati={whToDelete ? whToDelete.name : ""}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? `શું તમે ખરેખર "${whToDelete?.name}" ગોડાઉનને કાઢી નાખવા માંગો છો?`
              : `Are you sure you want to delete warehouse "${whToDelete?.name}"?`}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setWhToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteWarehouse}
              disabled={isDeleting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
