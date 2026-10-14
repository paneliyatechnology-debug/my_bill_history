"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";

interface Unit {
  id: string;
  name: string;
  code: string;
  symbol?: string;
  uqcCode?: string;
  decimalPlaces: number;
}

export default function UnitsPage() {
  const { lang, tenantContext } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    code: "",
    decimalPlaces: 2,
  });

  // Delete Modal
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    decimalPlaces: 2,
  });

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/units");
      setUnits(
        Array.isArray(res)
          ? res.map((u: any) => ({
              ...u,
              code: u.symbol || u.code || u.uqcCode,
            }))
          : [],
      );
    } catch (err: any) {
      setError(err.message || "Failed to load units.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchUnits();
    }
  }, [tenantContext.companyId, fetchUnits]);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/units", {
        name: formData.name,
        code: formData.code.toUpperCase(),
        symbol: formData.code.toUpperCase(),
        uqcCode: formData.code.toUpperCase(),
        decimalPlaces: Number(formData.decimalPlaces) || 0,
      });

      setIsModalOpen(false);
      await fetchUnits();
    } catch (err: any) {
      setFormError(err.message || "Failed to create unit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (u: Unit) => {
    setEditingUnit(u);
    setEditFormData({
      name: u.name,
      code: u.code,
      decimalPlaces: u.decimalPlaces,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.put(`/units/${editingUnit.id}`, {
        name: editFormData.name,
        symbol: editFormData.code.toUpperCase(),
        uqcCode: editFormData.code.toUpperCase(),
        decimalPlaces: Number(editFormData.decimalPlaces) || 0,
      });

      setIsEditModalOpen(false);
      setEditingUnit(null);
      await fetchUnits();
    } catch (err: any) {
      setFormError(err.message || "Failed to update unit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/units/${unitToDelete.id}`);
      setUnitToDelete(null);
      await fetchUnits();
    } catch (err: any) {
      setError(err.message || "Failed to delete unit.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "માપનના એકમો (Units of Measurement - UOM)"
              : "Units of Measurement (UOM)"}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === "gu"
              ? "જીએસટી માન્ય એકમો જેમ કે KGS, NOS, BOX, BAG વગેરે"
              : "Standard GST measurement units (BAG, BOX, KGS, NOS, PCS, MTR)"}
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({ name: "", code: "", decimalPlaces: 2 });
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#FF9933] hover:bg-[#E67E17] text-slate-950 text-sm font-bold rounded-lg shadow-sm transition-colors"
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
          <span>{lang === "gu" ? "નવો એકમ ઉમેરો" : "Add Unit"}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">
                  {lang === "gu" ? "એકમનું નામ" : "Unit Name"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "જીએસટી યુનિક કોડ (UQC)" : "UQC Code"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "દશાંશ સ્થાનો" : "Decimal Places"}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === "gu" ? "ક્રિયાઓ" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Loading units...</p>
                  </td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600 mb-1">
                      No units found
                    </p>
                    <p className="text-[11px]">
                      Click &apos;Add Unit&apos; to create standard units like
                      KGS, NOS, PCS.
                    </p>
                  </td>
                </tr>
              ) : (
                units.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {u.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {u.decimalPlaces}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors inline-flex items-center gap-1"
                          title="Edit Unit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>{lang === "gu" ? "સુધારો" : "Edit"}</span>
                        </button>
                        <button
                          onClick={() => setUnitToDelete(u)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors inline-flex items-center gap-1"
                          title="Delete Unit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>{lang === "gu" ? "કાઢી નાખો" : "Delete"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Unit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === "gu" ? "નવો માપન એકમ ઉમેરો" : "Add Measurement Unit"}
        titleGujarati="જીએસટી સ્ટાન્ડર્ડ યુનિટ કોડ"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUnit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Unit Name (e.g. Kilograms, Pieces) *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Kilograms"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              GST UQC Code (e.g. KGS, NOS, BOX) *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="KGS"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Decimal Precision (0 to 4)
            </label>
            <input
              type="number"
              min={0}
              max={4}
              value={formData.decimalPlaces}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  decimalPlaces: Number(e.target.value),
                })
              }
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
            />
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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg"
            >
              {isSubmitting ? "Saving..." : "Save Unit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Unit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUnit(null);
        }}
        title={lang === "gu" ? "માપન એકમ સુધારો (Edit Unit)" : "Edit Measurement Unit"}
        titleGujarati={editingUnit ? editingUnit.name : ""}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateUnit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Unit Name *
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              placeholder="Kilograms"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              GST UQC Code *
            </label>
            <input
              type="text"
              required
              value={editFormData.code}
              onChange={(e) =>
                setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })
              }
              placeholder="KGS"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Decimal Precision (0 to 4)
            </label>
            <input
              type="number"
              min={0}
              max={4}
              value={editFormData.decimalPlaces}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  decimalPlaces: Number(e.target.value),
                })
              }
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUnit(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg"
            >
              {isSubmitting ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!unitToDelete}
        onClose={() => setUnitToDelete(null)}
        title={lang === "gu" ? "એકમ કાઢી નાખવાની ખાતરી" : "Confirm Delete Unit"}
        titleGujarati={unitToDelete ? unitToDelete.name : ""}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? `શું તમે ખરેખર "${unitToDelete?.name}" એકમને કાઢી નાખવા માંગો છો?`
              : `Are you sure you want to delete unit "${unitToDelete?.name}"?`}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setUnitToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteUnit}
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
