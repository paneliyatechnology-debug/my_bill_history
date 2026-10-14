"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";

interface Party {
  id: string;
  type: "CUSTOMER" | "SUPPLIER" | "BOTH" | "BROKER";
  name: string;
  nameGujarati?: string;
  phone: string;
  email?: string;
  gstin?: string;
  stateCode: string;
  creditLimit?: number;
  creditDays?: number;
  isActive: boolean;
  billingAddress?: {
    line1: string;
    city: string;
    state?: string;
    pincode: string;
  };
}

export default function PartiesPage() {
  const { lang, tenantContext, currentCompany } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [editFormData, setEditFormData] = useState({
    type: "CUSTOMER" as "CUSTOMER" | "SUPPLIER" | "BOTH" | "BROKER",
    name: "",
    nameGujarati: "",
    phone: "",
    email: "",
    gstin: "",
    stateCode: "24",
    creditLimit: 0,
    creditDays: 30,
    line1: "",
    city: "Ahmedabad",
    pincode: "380001",
    isActive: true,
  });

  // Delete Confirmation Modal
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: "CUSTOMER" as "CUSTOMER" | "SUPPLIER" | "BOTH",
    name: "",
    nameGujarati: "",
    phone: "",
    email: "",
    gstin: "",
    stateCode: "24", // Default Gujarat
    creditLimit: 0,
    creditDays: 30,
    line1: "",
    city: "Ahmedabad",
    pincode: "380001",
  });

  const fetchParties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/parties", {
        search: searchTerm || undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
      });
      setParties(extractList(res));
    } catch (err: any) {
      setError(err.message || "Failed to load parties.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, typeFilter]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchParties();
    }
  }, [tenantContext.companyId, fetchParties]);

  const handleOpenCreateModal = () => {
    setFormData({
      type: "CUSTOMER",
      name: "",
      nameGujarati: "",
      phone: "",
      email: "",
      gstin: "",
      stateCode: "24",
      creditLimit: 0,
      creditDays: 30,
      line1: "",
      city: "Ahmedabad",
      pincode: "380001",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/parties", {
        type: formData.type,
        name: formData.name,
        nameGujarati: formData.nameGujarati || undefined,
        phone: formData.phone,
        email: formData.email || undefined,
        gstin: formData.gstin || undefined,
        stateCode: formData.stateCode,
        creditLimit: Number(formData.creditLimit) || 0,
        creditDays: Number(formData.creditDays) || 0,
        billingAddress: {
          line1: formData.line1 || "Main Market",
          city: formData.city || "Ahmedabad",
          pincode: formData.pincode || "380001",
        },
      });

      setIsModalOpen(false);
      await fetchParties();
    } catch (err: any) {
      setFormError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message ||
          "Failed to create party. Please verify GSTIN and state code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (party: Party) => {
    setEditingParty(party);
    setEditFormData({
      type: party.type,
      name: party.name,
      nameGujarati: party.nameGujarati || "",
      phone: party.phone || "",
      email: party.email || "",
      gstin: party.gstin || "",
      stateCode: party.stateCode || "24",
      creditLimit: Number(party.creditLimit) || 0,
      creditDays: Number(party.creditDays) || 30,
      line1: party.billingAddress?.line1 || "",
      city: party.billingAddress?.city || "Ahmedabad",
      pincode: party.billingAddress?.pincode || "380001",
      isActive: party.isActive !== false,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParty) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.put(`/parties/${editingParty.id}`, {
        type: editFormData.type,
        name: editFormData.name,
        nameGujarati: editFormData.nameGujarati || undefined,
        phone: editFormData.phone,
        email: editFormData.email || undefined,
        gstin: editFormData.gstin || undefined,
        stateCode: editFormData.stateCode,
        creditLimit: Number(editFormData.creditLimit) || 0,
        creditDays: Number(editFormData.creditDays) || 0,
        isActive: Boolean(editFormData.isActive),
        billingAddress: {
          line1: editFormData.line1 || "Main Market",
          city: editFormData.city || "Ahmedabad",
          pincode: editFormData.pincode || "380001",
        },
      });

      setIsEditModalOpen(false);
      setEditingParty(null);
      await fetchParties();
    } catch (err: any) {
      setFormError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to update party.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParty = async () => {
    if (!partyToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/parties/${partyToDelete.id}`);
      setPartyToDelete(null);
      await fetchParties();
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete party.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredParties = parties.filter((p) => {
    if (typeFilter !== "ALL" && p.type !== typeFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.phone && p.phone.includes(term)) ||
      (p.gstin && p.gstin.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu" ? "વેપારીઓ / ખાતાઓ" : "Parties (Khata)"}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === "gu"
              ? "ગ્રાહકો, સપ્લાયરો, જીએસટી નંબર અને ખાતાની માહિતી મેનેજ કરો"
              : "Manage customers, suppliers, GSTINs, and ledger limits"}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
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
          <span>{lang === "gu" ? "નવો વેપારી ઉમેરો" : "Add New Party"}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <svg
            className="w-4 h-4 absolute left-3 top-3 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === "gu"
                ? "નામ, ફોન નંબર અથવા જીએસટી દ્વારા શોધો..."
                : "Search by party name, phone, or GSTIN..."
            }
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">
              {lang === "gu" ? "તમામ પ્રકાર" : "All Types"}
            </option>
            <option value="CUSTOMER">
              {lang === "gu" ? "ગ્રાહક (Customers)" : "Customers"}
            </option>
            <option value="SUPPLIER">
              {lang === "gu" ? "સપ્લાયર (Suppliers)" : "Suppliers"}
            </option>
            <option value="BOTH">
              {lang === "gu" ? "બંને (Both)" : "Both"}
            </option>
          </select>
        </div>
      </div>

      {/* Table */}
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
                  {lang === "gu" ? "વેપારીનું નામ" : "Party Name"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "પ્રકાર" : "Type"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "મોબાઇલ" : "Phone"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "જીએસટી નંબર (GSTIN)" : "GSTIN"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "રાજ્ય કોડ" : "State"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "સ્થિતિ" : "Status"}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === "gu" ? "ક્રિયાઓ" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>
                      {lang === "gu"
                        ? "ખાતાઓ લોડ થઈ રહ્યા છે..."
                        : "Loading party records..."}
                    </p>
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600 mb-1">
                      {lang === "gu"
                        ? "કોઈ વેપારી મળ્યા નથી"
                        : "No party records found"}
                    </p>
                    <p className="text-[11px]">
                      {lang === "gu"
                        ? "નવો ગ્રાહક કે સપ્લાયર ઉમેરવા માટે ઉપર આપેલ બટન દબાવો."
                        : "Click 'Add New Party' above to create your first customer or supplier."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredParties.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{p.name}</div>
                      {p.nameGujarati && (
                        <div className="text-[11px] font-normal text-slate-500">
                          {p.nameGujarati}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          p.type === "CUSTOMER"
                            ? "info"
                            : p.type === "SUPPLIER"
                              ? "purple"
                              : "neutral"
                        }
                      >
                        {p.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {p.phone || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {p.gstin ? (
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {p.gstin}
                        </span>
                      ) : (
                        <span className="text-slate-400">Unregistered</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {p.stateCode}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={p.isActive ? "ACTIVE" : "INACTIVE"}
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        {p.phone && (
                          <button
                            onClick={() => {
                              const companyName =
                                currentCompany?.tradeName ||
                                currentCompany?.legalName ||
                                "MyBill History";
                              const text = `*Payment Reminder from ${companyName}*\nDear ${p.name},\nThis is a friendly reminder regarding your outstanding bill. Kindly arrange payment at your earliest convenience.\n\nThank you!`;
                              const cleanPhone = p.phone.replace(/[^0-9]/g, "");
                              const waUrl = cleanPhone
                                ? `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone}?text=${encodeURIComponent(text)}`
                                : `https://wa.me/?text=${encodeURIComponent(text)}`;
                              window.open(waUrl, "_blank");
                            }}
                            className="px-2 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium rounded inline-flex items-center gap-1"
                            title="Send payment reminder via WhatsApp"
                          >
                            <span>💬 Remind</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors inline-flex items-center gap-1"
                          title="Edit Party"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>{lang === "gu" ? "સુધારો" : "Edit"}</span>
                        </button>
                        <button
                          onClick={() => setPartyToDelete(p)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors inline-flex items-center gap-1"
                          title="Delete Party"
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

      {/* Create Party Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === "gu" ? "નવો વેપારી ઉમેરો" : "Add New Party"}
        titleGujarati="ગ્રાહક અથવા સપ્લાયરની વિગતો"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateParty} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "ખાતાનો પ્રકાર *" : "Party Type *"}
              </label>
              <select
                value={formData.type}
                onChange={(e: any) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
              >
                <option value="CUSTOMER">Customer (ગ્રાહક)</option>
                <option value="SUPPLIER">Supplier (વેપારી / સપ્લાયર)</option>
                <option value="BOTH">Both (ગ્રાહક અને સપ્લાયર)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "મોબાઇલ નંબર *" : "Mobile Phone *"}
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+919800000000"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu"
                ? "વેપારીનું નામ (અંગ્રેજી) *"
                : "Business / Party Name *"}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Shree Ganesh Provision Store"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu" ? "નામ ગુજરાતીમાં" : "Name in Gujarati (Optional)"}
            </label>
            <input
              type="text"
              value={formData.nameGujarati}
              onChange={(e) =>
                setFormData({ ...formData, nameGujarati: e.target.value })
              }
              placeholder="દા.ત. શ્રી ગણેશ પ્રોવિઝન સ્ટોર"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "જીએસટી નંબર (GSTIN)" : "GSTIN (15 Digits)"}
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gstin: e.target.value.toUpperCase(),
                  })
                }
                placeholder="24AAAAA0000A1Z5"
                maxLength={15}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "રાજ્ય કોડ *" : "State Code *"}
              </label>
              <input
                type="text"
                required
                value={formData.stateCode}
                onChange={(e) =>
                  setFormData({ ...formData, stateCode: e.target.value })
                }
                placeholder="24 (Gujarat)"
                maxLength={2}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "સરનામું" : "Address Line"}
              </label>
              <input
                type="text"
                value={formData.line1}
                onChange={(e) =>
                  setFormData({ ...formData, line1: e.target.value })
                }
                placeholder="Shop No. 4, Market"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "શહેર" : "City"}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="Ahmedabad"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "પીનકોડ" : "Pincode"}
              </label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value })
                }
                placeholder="380001"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg shadow-sm"
            >
              {isSubmitting
                ? "Saving..."
                : lang === "gu"
                  ? "ખાતું સાચવો"
                  : "Save Party"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Party Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingParty(null);
        }}
        title={lang === "gu" ? "વેપારીની વિગતો સુધારો (Edit Party)" : "Edit Party Details"}
        titleGujarati={editingParty ? `${editingParty.name}` : ""}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateParty} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "ખાતાનો પ્રકાર *" : "Party Type *"}
              </label>
              <select
                value={editFormData.type}
                onChange={(e: any) =>
                  setEditFormData({ ...editFormData, type: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
              >
                <option value="CUSTOMER">Customer (ગ્રાહક)</option>
                <option value="SUPPLIER">Supplier (વેપારી / સપ્લાયર)</option>
                <option value="BOTH">Both (ગ્રાહક અને સપ્લાયર)</option>
                <option value="BROKER">Broker (દલાલ / બ્રોકર)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "મોબાઇલ નંબર *" : "Mobile Phone *"}
              </label>
              <input
                type="text"
                required
                value={editFormData.phone}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, phone: e.target.value })
                }
                placeholder="+919800000000"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu"
                ? "વેપારીનું નામ (અંગ્રેજી) *"
                : "Business / Party Name *"}
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              placeholder="e.g. Shree Ganesh Provision Store"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu" ? "નામ ગુજરાતીમાં" : "Name in Gujarati (Optional)"}
            </label>
            <input
              type="text"
              value={editFormData.nameGujarati}
              onChange={(e) =>
                setEditFormData({ ...editFormData, nameGujarati: e.target.value })
              }
              placeholder="દા.ત. શ્રી ગણેશ પ્રોવિઝન સ્ટોર"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "જીએસટી નંબર (GSTIN)" : "GSTIN (15 Digits)"}
              </label>
              <input
                type="text"
                value={editFormData.gstin}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    gstin: e.target.value.toUpperCase(),
                  })
                }
                placeholder="24AAAAA0000A1Z5"
                maxLength={15}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "રાજ્ય કોડ *" : "State Code *"}
              </label>
              <input
                type="text"
                required
                value={editFormData.stateCode}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, stateCode: e.target.value })
                }
                placeholder="24 (Gujarat)"
                maxLength={2}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "સરનામું" : "Address Line"}
              </label>
              <input
                type="text"
                value={editFormData.line1}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, line1: e.target.value })
                }
                placeholder="Shop No. 4, Market"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "શહેર" : "City"}
              </label>
              <input
                type="text"
                value={editFormData.city}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, city: e.target.value })
                }
                placeholder="Ahmedabad"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "પીનકોડ" : "Pincode"}
              </label>
              <input
                type="text"
                value={editFormData.pincode}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, pincode: e.target.value })
                }
                placeholder="380001"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editFormData.isActive}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    isActive: e.target.checked,
                  })
                }
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                {lang === "gu" ? "સક્રિય ખાતું (Active Party)" : "Active Party"}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingParty(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg shadow-sm"
            >
              {isSubmitting
                ? "Updating..."
                : lang === "gu"
                  ? "ફેરફાર સાચવો"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Party Confirmation Modal */}
      <Modal
        isOpen={!!partyToDelete}
        onClose={() => setPartyToDelete(null)}
        title={lang === "gu" ? "વેપારી ખાતું કાઢી નાખવાની ખાતરી" : "Confirm Delete Party"}
        titleGujarati={partyToDelete ? `${partyToDelete.name}` : ""}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? `શું તમે ખરેખર "${partyToDelete?.name}" ખાતાને કાઢી નાખવા અથવા આર્કાઇવ કરવા માંગો છો?`
              : `Are you sure you want to delete / archive "${partyToDelete?.name}"?`}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPartyToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteParty}
              disabled={isDeleting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm"
            >
              {isDeleting
                ? "Deleting..."
                : lang === "gu"
                  ? "હા, કાઢી નાખો"
                  : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
