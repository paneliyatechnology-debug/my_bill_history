"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";
import { ImportWizardModal } from "../../../components/imports/import-wizard-modal";
import { ImportModuleType } from "@billing/shared-types";
import {
  X,
  Phone,
  Link as LinkIcon,
  MessageSquare,
  Pencil,
  FileText,
  Calendar,
  Receipt,
  Trash2,
  Printer,
  BarChart3,
  Zap,
  Check,
  AlertTriangle,
} from "lucide-react";

export interface VerifiedGstinDetails {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  registrationStatus: "ACTIVE" | "CANCELLED" | "SUSPENDED" | "INACTIVE" | "UNKNOWN";
  registrationDate: string | null;
  taxpayerType: string | null;
  constitutionOfBusiness: string | null;
  pan: string | null;
  stateCode: string | null;
  stateName: string | null;
  stateNameGujarati?: string | null;
  address: {
    line1: string | null;
    city: string | null;
    district?: string | null;
    state?: string | null;
    stateCode?: string | null;
    pincode: string | null;
  };
  source: string;
  alreadyExistsInCompany?: boolean;
  message?: string;
  messageGujarati?: string;
}

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
  balance?: number;
  isActive: boolean;
  billingAddress?: {
    line1: string;
    city: string;
    state?: string;
    pincode: string;
  };
  notes?: Array<{
    id: string;
    title: string;
    description?: string;
    descriptions?: string;
    createdAt: string;
  }>;
  appointments?: Array<{
    id: string;
    title: string;
    description?: string;
    descriptions?: string;
    date: string;
    time: string;
    status: string;
    createdAt?: string;
  }>;
}

export default function PartiesPage() {
  const { lang, tenantContext, currentCompany } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // MyBillBook Master-Detail & Dashboard States
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partyDetailTab, setPartyDetailTab] = useState<"transactions" | "profile" | "notes" | "appointments" | "ledger" | "items">("transactions");
  const [partyNotes, setPartyNotes] = useState<any[]>([]);
  const [partyAppointments, setPartyAppointments] = useState<any[]>([]);
  const [isLoadingNotesAppts, setIsLoadingNotesAppts] = useState(false);

  // Notes Modal state
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Appointments Modal state
  const [isAddAppointmentModalOpen, setIsAddAppointmentModalOpen] = useState(false);
  const [apptTitle, setApptTitle] = useState("");
  const [apptDescription, setApptDescription] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("11:00 AM");
  const [isSavingAppt, setIsSavingAppt] = useState(false);
  const [partyTransactions, setPartyTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");
  const [showSharedLedgerBanner, setShowSharedLedgerBanner] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
    stateCode: "",
    creditLimit: 0,
    creditDays: 0,
    line1: "",
    city: "",
    pincode: "",
    isActive: true,
  });

  // Delete Confirmation Modal
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [singleForceDelete, setSingleForceDelete] = useState(false);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkForceDelete, setBulkForceDelete] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    type: "CUSTOMER" as "CUSTOMER" | "SUPPLIER" | "BOTH",
    name: "",
    nameGujarati: "",
    phone: "",
    email: "",
    gstin: "",
    stateCode: "",
    creditLimit: 0,
    creditDays: 0,
    line1: "",
    city: "",
    pincode: "",
  });

  // GSTIN Autofill & Verification state
  const [isGstinFetching, setIsGstinFetching] = useState(false);
  const [gstinAutofillSuccess, setGstinAutofillSuccess] = useState<string | null>(null);
  const [gstinCorrection, setGstinCorrection] = useState<{
    suggestedGstin: string;
    calculatedChecksum: string;
  } | null>(null);
  const [verifiedGstinData, setVerifiedGstinData] = useState<VerifiedGstinDetails | null>(null);
  const [editVerifiedGstinData, setEditVerifiedGstinData] = useState<VerifiedGstinDetails | null>(null);
  const [nameConflict, setNameConflict] = useState<{
    existing: string;
    verified: string;
    isEdit: boolean;
  } | null>(null);
  const activeGstinRequestRef = useRef<string>("");

  const handleGstinLookup = async (
    gstinValue: string,
    isEdit: boolean = false,
    forceRefresh: boolean = false,
  ) => {
    const clean = gstinValue.trim().toUpperCase();
    setGstinCorrection(null);
    setGstinAutofillSuccess(null);
    setNameConflict(null);

    if (isEdit) {
      setEditVerifiedGstinData(null);
    } else {
      setVerifiedGstinData(null);
    }

    if (clean.length < 15) return;

    // Fast statutory pattern validation before calling backend
    const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!GSTIN_REGEX.test(clean)) {
      setFormError(
        lang === "gu"
          ? `GSTIN ફોર્મેટ અમાન્ય છે (૧૫ અક્ષરો: ૨ રાજ્ય કોડ + ૧૦ પાન + ૧ એન્ટિટી + Z + ચકાસણી અક્ષર).`
          : `Invalid GSTIN format (15 characters: 2-digit State Code + 10-char PAN + Entity + 'Z' + Checksum).`
      );
      return;
    }

    activeGstinRequestRef.current = clean;
    setIsGstinFetching(true);
    setFormError(null);

    try {
      let res: any;
      try {
        res = await apiClient.post("/gst/verify-gstin", {
          gstin: clean,
          forceRefresh,
        });
      } catch {
        // Resilient fallback to legacy lookup endpoint if verify-gstin is unavailable
        res = await apiClient.get(`/parties/lookup/gstin/${clean}`);
      }

      // Ignore stale responses if the user changed the input while request was in flight
      if (activeGstinRequestRef.current !== clean) {
        return;
      }

      if (res && res.isValid && (res.success || res.legalName || res.tradeName || res.source)) {
        const autofillName = res.tradeName || res.legalName || "";
        const autofillAddressLine = res.address?.line1 || res.address?.line2 || "";
        const autofillCity = res.address?.city || res.address?.district || "";
        const autofillPincode = res.address?.pincode || "";
        const autofillStateCode = res.stateCode || (clean.length >= 2 ? clean.substring(0, 2) : "24");
        const currentFormName = isEdit ? editFormData.name : formData.name;

        const verifiedDetails: VerifiedGstinDetails = {
          gstin: res.gstin || clean,
          legalName: res.legalName || null,
          tradeName: res.tradeName || null,
          registrationStatus: (res.registrationStatus || res.status || "ACTIVE").toUpperCase() as any,
          registrationDate: res.registrationDate || null,
          taxpayerType: res.taxpayerType || res.gstType || "Regular",
          constitutionOfBusiness: res.constitutionOfBusiness || res.constitution || null,
          pan: res.pan || (clean.length >= 12 ? clean.substring(2, 12) : null),
          stateCode: autofillStateCode,
          stateName: res.stateName || null,
          stateNameGujarati: res.stateNameGujarati || null,
          address: {
            line1: autofillAddressLine || null,
            city: autofillCity || null,
            district: res.address?.district || null,
            state: res.address?.state || null,
            stateCode: autofillStateCode,
            pincode: autofillPincode || null,
          },
          source: res.source || "LIVE_API",
          alreadyExistsInCompany: Boolean(res.alreadyExistsInCompany),
          message: res.message,
          messageGujarati: res.messageGujarati,
        };

        if (isEdit) {
          setEditVerifiedGstinData(verifiedDetails);
        } else {
          setVerifiedGstinData(verifiedDetails);
        }

        // Conflict detection: If user already manually typed a conflicting name
        if (
          currentFormName &&
          currentFormName.trim() &&
          autofillName &&
          currentFormName.trim().toLowerCase() !== autofillName.trim().toLowerCase()
        ) {
          setNameConflict({
            existing: currentFormName,
            verified: autofillName,
            isEdit,
          });

          // Autofill address and state code, keep user-entered name intact until resolved
          if (isEdit) {
            setEditFormData((prev) => ({
              ...prev,
              gstin: clean,
              stateCode: autofillStateCode || prev.stateCode,
              line1: autofillAddressLine || prev.line1,
              city: autofillCity || prev.city,
              pincode: autofillPincode || prev.pincode,
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              gstin: clean,
              stateCode: autofillStateCode || prev.stateCode,
              line1: autofillAddressLine || prev.line1,
              city: autofillCity || prev.city,
              pincode: autofillPincode || prev.pincode,
            }));
          }
        } else {
          // No conflict: safe automatic fill of entire form
          if (isEdit) {
            setEditFormData((prev) => ({
              ...prev,
              gstin: clean,
              name: autofillName || prev.name,
              nameGujarati: res.nameGujarati || prev.nameGujarati,
              stateCode: autofillStateCode || prev.stateCode,
              line1: autofillAddressLine || prev.line1,
              city: autofillCity || prev.city,
              pincode: autofillPincode || prev.pincode,
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              gstin: clean,
              name: autofillName || prev.name,
              nameGujarati: res.nameGujarati || prev.nameGujarati,
              stateCode: autofillStateCode || prev.stateCode,
              line1: autofillAddressLine || prev.line1,
              city: autofillCity || prev.city,
              pincode: autofillPincode || prev.pincode,
            }));
          }
        }

        if (autofillName) {
          setGstinAutofillSuccess(
            `${autofillName} • ${res.stateName || res.stateCode} (${res.constitutionOfBusiness || res.constitution || "Verified Taxpayer"})`
          );
        } else {
          setGstinAutofillSuccess(
            lang === "gu"
              ? `માન્ય GSTIN (${res.stateNameGujarati || res.stateName}) • પાન: ${res.pan} • ${res.constitutionOfBusiness || res.constitution || "ચકાસાયેલ"}`
              : `Valid GSTIN (${res.stateName}) • PAN: ${res.pan} • ${res.constitutionOfBusiness || res.constitution || "Verified"}`
          );
        }
      } else if (res && !res.isValid && res.suggestedGstin) {
        setGstinCorrection({
          suggestedGstin: res.suggestedGstin,
          calculatedChecksum: res.calculatedChecksum,
        });
        setFormError(
          lang === "gu"
            ? `અમાન્ય ચેકસમ. સાચો ચકાસણી અક્ષર '${res.calculatedChecksum}' હોવો જોઈએ.`
            : `Invalid GSTIN checksum. Calculated check digit is '${res.calculatedChecksum}'.`
        );
      } else if (res && !res.isValid && res.error) {
        setFormError(lang === "gu" && res.errorGujarati ? res.errorGujarati : res.error);
      }
    } catch (err: any) {
      if (activeGstinRequestRef.current === clean) {
        setFormError(
          lang === "gu" && err.messageGujarati
            ? err.messageGujarati
            : err.message || "Failed to verify GSTIN with provider."
        );
      }
    } finally {
      if (activeGstinRequestRef.current === clean) {
        setIsGstinFetching(false);
      }
    }
  };

  const applySuggestedGstin = (suggestedGstin: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData((prev) => ({ ...prev, gstin: suggestedGstin }));
    } else {
      setFormData((prev) => ({ ...prev, gstin: suggestedGstin }));
    }
    setGstinCorrection(null);
    setFormError(null);
    handleGstinLookup(suggestedGstin, isEdit);
  };

  const fetchParties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/masters/parties", {
        search: searchTerm || undefined,
        isActive: true,
      });
      const list = extractList(res);
      setParties(list);

      // Keep selectedParty in sync with latest backend calculations without requiring page refresh
      setSelectedParty((curr) => {
        if (!curr) return null;
        const fresh = list.find((p: Party) => p.id === curr.id);
        if (fresh) {
          return { ...curr, ...fresh };
        }
        return curr;
      });
    } catch (err: any) {
      setError(err.message || "Failed to load parties.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchParties();
    }
  }, [tenantContext.companyId, fetchParties]);

  // Auto-select party and search term from URL query parameters (e.g. from Global Search navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const targetPartyId = urlParams.get("partyId");
    const targetSearch = urlParams.get("search");

    if (targetSearch && !searchTerm) {
      setSearchTerm(targetSearch);
    }

    if (targetPartyId) {
      if (selectedParty?.id === targetPartyId) return;
      const found = parties.find((p) => p.id === targetPartyId);
      if (found) {
        setSelectedParty(found);
      } else {
        apiClient
          .get(`/masters/parties/${targetPartyId}`)
          .then((res: any) => {
            const data = res?.data || res;
            if (data && data.id) {
              setSelectedParty(data);
            }
          })
          .catch(() => {});
      }
    }
  }, [parties, selectedParty?.id]);

  const totalCustomers = useMemo(() => {
    return parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH").length;
  }, [parties]);

  const totalSuppliers = useMemo(() => {
    return parties.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH").length;
  }, [parties]);

  const totalToCollect = useMemo(() => {
    return parties
      .filter((p) => p.type === "CUSTOMER" || p.type === "BOTH")
      .reduce((sum, p) => sum + Math.max(0, Number(p.balance || 0)), 0);
  }, [parties]);

  const totalToPay = useMemo(() => {
    return parties
      .filter((p) => p.type === "SUPPLIER" || p.type === "BOTH")
      .reduce((sum, p) => sum + Math.max(0, Number(p.balance || 0)), 0);
  }, [parties]);

  useEffect(() => {
    if (!selectedParty) return;
    setIsLoadingTransactions(true);
    Promise.all([
      apiClient.get(`/sales/invoices`, { partyId: selectedParty.id }).catch(() => ({ data: [] })),
      apiClient.get(`/purchases/invoices`, { partyId: selectedParty.id }).catch(() => ({ data: [] })),
    ])
      .then(([salesRes, purchRes]: any[]) => {
        const sales = Array.isArray(salesRes?.data)
          ? salesRes.data
          : Array.isArray(salesRes?.items)
          ? salesRes.items
          : Array.isArray(salesRes)
          ? salesRes
          : [];
        const purch = Array.isArray(purchRes?.data)
          ? purchRes.data
          : Array.isArray(purchRes?.items)
          ? purchRes.items
          : Array.isArray(purchRes)
          ? purchRes
          : [];
        const combined = [
          ...sales.map((s: any) => ({
            id: s.id,
            date: s.invoiceDate || s.createdAt,
            type: "Sales Invoices",
            number: s.invoiceNumber,
            amount: Number(s.grandTotal || 0),
            status: s.status,
            raw: s,
          })),
          ...purch.map((p: any) => ({
            id: p.id,
            date: p.invoiceDate || p.createdAt,
            type: "Purchase Invoices",
            number: p.invoiceNumber,
            amount: Number(p.grandTotal || 0),
            status: p.status,
            raw: p,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPartyTransactions(combined);
      })
      .finally(() => setIsLoadingTransactions(false));
  }, [selectedParty]);

  const fetchPartyNotesAndAppointments = useCallback(async (partyId: string) => {
    setIsLoadingNotesAppts(true);
    try {
      const res: any = await apiClient.get(`/masters/parties/${partyId}`);
      if (res) {
        setPartyNotes(res.notes || []);
        setPartyAppointments(res.appointments || []);
      }
    } catch (err) {
      console.warn("Failed to load party notes and appointments:", err);
    } finally {
      setIsLoadingNotesAppts(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedParty?.id) {
      setPartyNotes([]);
      setPartyAppointments([]);
      return;
    }
    fetchPartyNotesAndAppointments(selectedParty.id);
  }, [selectedParty?.id, fetchPartyNotesAndAppointments]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !noteTitle.trim()) return;
    setIsSavingNote(true);
    try {
      await apiClient.post(`/masters/parties/${selectedParty.id}/notes`, {
        title: noteTitle.trim(),
        description: noteDescription.trim(),
        descriptions: noteDescription.trim(),
      });
      setNoteTitle("");
      setNoteDescription("");
      setIsAddNoteModalOpen(false);
      fetchPartyNotesAndAppointments(selectedParty.id);
    } catch (err: any) {
      alert(err.message || "Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await apiClient.delete(`/notes/${noteId}`);
      if (selectedParty) {
        fetchPartyNotesAndAppointments(selectedParty.id);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete note");
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !apptTitle.trim() || !apptDate) return;
    setIsSavingAppt(true);
    try {
      await apiClient.post(`/masters/parties/${selectedParty.id}/appointments`, {
        title: apptTitle.trim(),
        description: apptDescription.trim(),
        descriptions: apptDescription.trim(),
        date: apptDate,
        time: apptTime.trim(),
        status: "SCHEDULED",
      });
      setApptTitle("");
      setApptDescription("");
      setApptDate("");
      setApptTime("11:00 AM");
      setIsAddAppointmentModalOpen(false);
      fetchPartyNotesAndAppointments(selectedParty.id);
    } catch (err: any) {
      alert(err.message || "Failed to schedule appointment");
    } finally {
      setIsSavingAppt(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await apiClient.delete(`/appointments/${appointmentId}`);
      if (selectedParty) {
        fetchPartyNotesAndAppointments(selectedParty.id);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete appointment");
    }
  };

  const handleOpenCreateModal = () => {
    setGstinAutofillSuccess(null);
    setGstinCorrection(null);
    setVerifiedGstinData(null);
    setNameConflict(null);
    setFormData({
      type: "CUSTOMER",
      name: "",
      nameGujarati: "",
      phone: "",
      email: "",
      gstin: "",
      stateCode: "",
      creditLimit: 0,
      creditDays: 0,
      line1: "",
      city: "",
      pincode: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const derivedStateCode =
        formData.stateCode?.trim() ||
        (formData.gstin?.trim()?.length >= 2 ? formData.gstin.trim().substring(0, 2) : "24");

      const newParty: any = await apiClient.post("/masters/parties", {
        type: formData.type,
        name: formData.name.trim(),
        nameGujarati: formData.nameGujarati?.trim() || undefined,
        phone: formData.phone.trim(),
        email: formData.email?.trim() || undefined,
        gstin: formData.gstin?.trim() ? formData.gstin.trim().toUpperCase() : undefined,
        stateCode: derivedStateCode,
        creditLimit: Number(formData.creditLimit) || 0,
        creditDays: Number(formData.creditDays) || 0,
        billingAddress: {
          line1: formData.line1?.trim() || "",
          city: formData.city?.trim() || "",
          pincode: formData.pincode?.trim() || "",
        },
      });

      if (newParty && typeof newParty === "object") {
        setSelectedParty(newParty);
      }
      setIsModalOpen(false);
      await fetchParties();
    } catch (err: any) {
      setFormError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message ||
          "Failed to create party. Please verify details.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (party: Party) => {
    setGstinAutofillSuccess(null);
    setGstinCorrection(null);
    setEditVerifiedGstinData(null);
    setNameConflict(null);
    setEditingParty(party);
    setEditFormData({
      type: party.type,
      name: party.name,
      nameGujarati: party.nameGujarati || "",
      phone: party.phone || "",
      email: party.email || "",
      gstin: party.gstin || "",
      stateCode: party.stateCode || "",
      creditLimit: Number(party.creditLimit) || 0,
      creditDays: Number(party.creditDays) || 0,
      line1: party.billingAddress?.line1 || "",
      city: party.billingAddress?.city || "",
      pincode: party.billingAddress?.pincode || "",
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
      const cleanGstin = editFormData.gstin?.trim() ? editFormData.gstin.trim().toUpperCase() : null;
      const derivedStateCode =
        editFormData.stateCode?.trim() ||
        (cleanGstin && cleanGstin.length >= 2 ? cleanGstin.substring(0, 2) : editingParty.stateCode || "24");

      const payload = {
        type: editFormData.type,
        name: editFormData.name.trim(),
        nameGujarati: editFormData.nameGujarati?.trim() || undefined,
        phone: editFormData.phone.trim(),
        email: editFormData.email?.trim() || undefined,
        gstin: cleanGstin,
        stateCode: derivedStateCode,
        creditLimit: Number(editFormData.creditLimit) || 0,
        creditDays: Number(editFormData.creditDays) || 0,
        isActive: Boolean(editFormData.isActive),
        billingAddress: {
          line1: editFormData.line1?.trim() || "",
          city: editFormData.city?.trim() || "",
          pincode: editFormData.pincode?.trim() || "",
        },
      };

      const res: any = await apiClient.put(`/masters/parties/${editingParty.id}`, payload);

      const updatedPartyData: Party = {
        ...editingParty,
        ...(res && typeof res === "object" ? res : {}),
        type: editFormData.type,
        name: editFormData.name.trim(),
        nameGujarati: editFormData.nameGujarati?.trim() || null,
        phone: editFormData.phone.trim(),
        email: editFormData.email?.trim() || null,
        gstin: cleanGstin,
        stateCode: derivedStateCode,
        creditLimit: Number(editFormData.creditLimit) || 0,
        creditDays: Number(editFormData.creditDays) || 0,
        isActive: Boolean(editFormData.isActive),
        billingAddress: {
          line1: editFormData.line1?.trim() || "",
          city: editFormData.city?.trim() || "",
          pincode: editFormData.pincode?.trim() || "",
        },
        balance: editingParty.balance ?? (selectedParty?.id === editingParty.id ? selectedParty.balance : 0),
      };

      // 1. Instantly update parties array in state so list updates without refresh
      setParties((prev) =>
        prev.map((p) => (p.id === editingParty.id ? { ...p, ...updatedPartyData } : p))
      );

      // 2. Instantly update selectedParty so right-hand detail pane immediately shows updated values without refresh
      setSelectedParty((prev) => {
        if (!prev || prev.id !== editingParty.id) return prev;
        return { ...prev, ...updatedPartyData };
      });

      // 3. Show confirmation feedback toast
      setActionMessage({
        text:
          lang === "gu"
            ? `'${editFormData.name.trim()}' ની વિગતો સફળતાપૂર્વક સુધારાઈ ગઈ!`
            : `Party '${editFormData.name.trim()}' updated successfully!`,
        type: "success",
      });
      setTimeout(() => setActionMessage(null), 4000);

      setIsEditModalOpen(false);
      setEditingParty(null);

      // 4. Background re-fetch to sync any calculated backend aggregates
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
    setError(null);
    try {
      const res: any = await apiClient.delete(`/masters/parties/${partyToDelete.id}${singleForceDelete ? "?force=true" : ""}`);
      setPartyToDelete(null);
      setSingleForceDelete(false);
      await fetchParties();
      if (res?.message) {
        setActionMessage({
          text: lang === "gu" && res.messageGujarati ? res.messageGujarati : res.message,
          type: "success",
        });
        setTimeout(() => setActionMessage(null), 5000);
      }
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

  const handleBulkDeleteParties = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    setError(null);
    try {
      const res: any = await apiClient.post("/masters/parties/bulk-delete", {
        ids: Array.from(selectedIds),
        force: bulkForceDelete,
      });
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      setBulkForceDelete(false);
      await fetchParties();
      if (res?.message) {
        setActionMessage({
          text: lang === "gu" && res.messageGujarati ? res.messageGujarati : res.message,
          type: "success",
        });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete selected parties."
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const displayParties = useMemo(() => {
    if (typeFilter === "ALL") return parties;
    if (typeFilter === "CUSTOMER") {
      return parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");
    }
    if (typeFilter === "SUPPLIER") {
      return parties.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH");
    }
    return parties.filter((p) => p.type === typeFilter);
  }, [parties, typeFilter]);

  const partyColumns = useMemo<ColumnDef<Party>[]>(
    () => [
      {
        id: "name",
        header: lang === "gu" ? "વેપારીનું નામ" : "Party Name",
        accessorKey: "name",
        sortable: true,
        cell: (p) => (
          <div
            onClick={() => setSelectedParty(p)}
            className="cursor-pointer group flex items-center gap-1.5"
          >
            <div>
              <div className="font-semibold text-slate-900 group-hover:text-[#1677E8] transition-colors">
                {p.name}
              </div>
              {lang === "gu" && p.nameGujarati && (
                <div className="text-[11px] font-normal text-slate-500">
                  {p.nameGujarati}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "category",
        header: lang === "gu" ? "કેટેગરી" : "Category",
        className: "text-slate-500 text-xs font-normal",
        cell: () => "-",
      },
      {
        id: "phone",
        header: lang === "gu" ? "મોબાઇલ નંબર" : "Mobile Number",
        accessorKey: "phone",
        sortable: true,
        className: "tabular-nums text-slate-700 text-xs font-normal",
        cell: (p) => p.phone || "-",
      },
      {
        id: "type",
        header: lang === "gu" ? "પ્રકાર" : "Party Type",
        accessorKey: "type",
        sortable: true,
        className: "text-xs font-normal text-slate-700",
        cell: (p) => (
          <span className="text-xs text-slate-700">
            {p.type === "CUSTOMER"
              ? "Customer"
              : p.type === "SUPPLIER"
              ? "Supplier"
              : p.type === "BOTH"
              ? "Both"
              : p.type}
          </span>
        ),
      },
      {
        id: "balance",
        header: lang === "gu" ? "બાકી રકમ (Balance)" : "Balance",
        sortable: true,
        className: "tabular-nums text-xs font-semibold",
        cell: (p) => {
          const bal = Number(p.balance || 0);
          if (bal <= 0) {
            return <span className="text-slate-700 font-normal">₹ 0</span>;
          }
          if (p.type === "SUPPLIER") {
            return (
              <span className="text-[#DC2626] font-semibold inline-flex items-center gap-1">
                <span>↑</span>
                <span>₹ {bal.toLocaleString("en-IN")}</span>
              </span>
            );
          }
          return (
            <span className="text-[#15803D] font-semibold inline-flex items-center gap-1">
              <span>↓</span>
              <span>₹ {bal.toLocaleString("en-IN")}</span>
            </span>
          );
        },
      },
      {
        id: "actions",
        header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
        className: "text-center",
        headerClassName: "text-center",
        align: "center",
        cell: (p) => (
          <div className="inline-flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const companyName = currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook";
                const bal = Number(p.balance || 0);
                const text = `*Statement from ${companyName}*\nDear ${p.name},\nYour current balance is ₹${bal.toLocaleString("en-IN")}.\nKindly let us know if you need any invoices.\n\nThank you!`;
                const cleanPhone = (p.phone || "").replace(/[^0-9]/g, "");
                if (cleanPhone) {
                  const waUrl = `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone}?text=${encodeURIComponent(text)}`;
                  window.open(waUrl, "_blank");
                } else {
                  alert(lang === "gu" ? "આ વેપારી માટે કોઈ મોબાઇલ નંબર ઉપલબ્ધ નથી." : "No phone number available for this party.");
                }
              }}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title={lang === "gu" ? "વોટ્સએપ સ્ટેટમેન્ટ મોકલો" : "Send Statement via WhatsApp"}
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSelectedParty(p)}
              className="px-3 py-1 text-xs font-medium text-[#1677E8] bg-[#EFF6FF] hover:bg-blue-100 border border-[#BFDBFE] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
              title="View Master Details"
            >
              <span>Details</span>
              <span>→</span>
            </button>
          </div>
        ),
      },
    ],
    [lang, currentCompany]
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-xs text-rose-700 font-medium rounded-xl">
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 font-medium rounded-xl flex items-center justify-between">
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded ml-3 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectedParty ? (
        /* MASTER-DETAIL 2-PANE VIEW (Matching MyBillBook) */
        <div className="space-y-4">
          {/* Top Breadcrumb & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-subtle">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{lang === "gu" ? "← તમામ વેપારીઓ" : "← All Parties"}</span>
              </button>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-slate-900">{selectedParty.name}</span>
                {lang === "gu" && selectedParty.nameGujarati && (
                  <span className="text-xs text-slate-500 font-normal">({selectedParty.nameGujarati})</span>
                )}
                <Badge
                  variant={
                    selectedParty.type === "CUSTOMER"
                      ? "info"
                      : selectedParty.type === "SUPPLIER"
                      ? "purple"
                      : "neutral"
                  }
                >
                  {selectedParty.type}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/sales/invoices/new?partyId=${selectedParty.id}`}
                className="inline-flex items-center gap-1.5 h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-sm transition-all"
              >
                <span>+</span>
                <span>{lang === "gu" ? "વેચાણ બિલ બનાવો" : "Create Invoice"}</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[13px] font-medium rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Import Parties from Excel or CSV"
              >
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>{lang === "gu" ? "એક્સેલ ઈમ્પોર્ટ" : "Import Excel"}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-medium rounded-xl transition-all cursor-pointer"
              >
                <span>+</span>
                <span>{lang === "gu" ? "નવો વેપારી" : "Add Party"}</span>
              </button>
            </div>
          </div>

          {/* Master-Detail 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Pane: Party List */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden flex flex-col h-[calc(100vh-210px)] min-h-[520px]">
              {/* Search & Filter Header */}
              <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/70">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={lang === "gu" ? "નામ અથવા ફોન શોધો..." : "Search party..."}
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1677E8] font-medium h-10"
                  />
                  <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl">
                  {["ALL", "CUSTOMER", "SUPPLIER"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypeFilter(t)}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        typeFilter === t
                          ? "bg-white text-teal-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t === "ALL" ? "All" : t === "CUSTOMER" ? "Customer" : "Supplier"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Party Cards */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {displayParties
                  .filter((p) =>
                    detailSearch
                      ? p.name.toLowerCase().includes(detailSearch.toLowerCase()) ||
                        (p.nameGujarati && p.nameGujarati.toLowerCase().includes(detailSearch.toLowerCase())) ||
                        (p.phone && p.phone.includes(detailSearch)) ||
                        (p.gstin && p.gstin.toLowerCase().includes(detailSearch.toLowerCase()))
                      : true
                  )
                  .map((p) => {
                    const isSelected = p.id === selectedParty.id;
                    const bal = Number(p.balance || 0);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedParty(p)}
                        className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-teal-50/70 border-l-4 border-teal-600"
                            : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                            <span>{p.name}</span>
                          </div>
                          {lang === "gu" && p.nameGujarati && (
                            <div className="text-[10px] text-slate-500 truncate">{p.nameGujarati}</div>
                          )}
                          <div className="text-[11px] text-slate-500 tabular-nums mt-0.5 truncate">
                            {p.phone || "No phone"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs tabular-nums font-bold ${
                              bal <= 0
                                ? "text-slate-500"
                                : p.type === "SUPPLIER"
                                ? "text-rose-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {bal <= 0 ? "₹ 0" : (
                              <span>
                                {p.type === "SUPPLIER" ? "↑" : "↓"} ₹{bal.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {p.type.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right Pane: Selected Party Master Details & Tabs */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden flex flex-col h-[calc(100vh-210px)] min-h-[520px]">
              {/* Header Card */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
                      {selectedParty.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="typo-section-heading text-[#182230]">
                          {selectedParty.name}
                        </h2>
                        {lang === "gu" && selectedParty.nameGujarati && (
                          <span className="typo-page-subtitle text-slate-500">
                            ({selectedParty.nameGujarati})
                          </span>
                        )}
                        <Badge
                          variant={
                            selectedParty.type === "CUSTOMER"
                              ? "info"
                              : selectedParty.type === "SUPPLIER"
                              ? "purple"
                              : "neutral"
                          }
                        >
                          {selectedParty.type}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                        <span className="tabular-nums inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{selectedParty.phone || "—"}</span>
                        </span>
                        {selectedParty.gstin && (
                          <span className="tabular-nums bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-medium typo-invoice-no">
                            GST: {selectedParty.gstin}
                          </span>
                        )}
                        <span className="text-slate-400">
                          {selectedParty.billingAddress?.city || "Ahmedabad"} ({selectedParty.stateCode})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href="/app/home/shared-ledger"
                      className="p-2 rounded-xl bg-[#EFF6FF] hover:bg-teal-100 text-[#1677E8] border border-teal-200 typo-btn-secondary transition-colors inline-flex items-center gap-1.5"
                      title="Open Shared Ledger"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-[#1677E8]" />
                      <span>Shared Ledger</span>
                    </Link>
                    {selectedParty.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          const companyName = currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook";
                          const bal = Number(selectedParty.balance || 0);
                          const text = `*Statement from ${companyName}*\nDear ${selectedParty.name},\nYour balance is ₹${bal.toLocaleString("en-IN")}.\nTotal Transactions: ${partyTransactions.length}.\n\nThank you!`;
                          const cleanPhone = selectedParty.phone.replace(/[^0-9]/g, "");
                          const waUrl = cleanPhone
                            ? `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone}?text=${encodeURIComponent(text)}`
                            : `https://wa.me/?text=${encodeURIComponent(text)}`;
                          window.open(waUrl, "_blank");
                        }}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 typo-btn-secondary transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        title="Send Statement via WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(selectedParty)}
                      className="h-9 px-3 typo-btn-secondary text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Balance & Limits Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3.5 border-t border-slate-200/70">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <div className="typo-label text-slate-500">
                      {selectedParty.type === "SUPPLIER" ? "You'll Give" : "You'll Get"} (Balance)
                    </div>
                    <div
                      className={`typo-amount-secondary mt-0.5 ${
                        Number(selectedParty.balance || 0) <= 0
                          ? "text-slate-700"
                          : selectedParty.type === "SUPPLIER"
                          ? "text-rose-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {Number(selectedParty.balance || 0) <= 0
                        ? "₹ 0"
                        : `${selectedParty.type === "SUPPLIER" ? "↑" : "↓"} ₹${Number(selectedParty.balance || 0).toLocaleString("en-IN")}`}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <div className="typo-label text-slate-500">Credit Limit</div>
                    <div className="typo-amount-secondary text-slate-800 mt-0.5">
                      {selectedParty.creditLimit
                        ? `₹ ${Number(selectedParty.creditLimit).toLocaleString("en-IN")}`
                        : "No Limit"}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <div className="typo-label text-slate-500">Credit Period</div>
                    <div className="typo-amount-secondary text-slate-800 mt-0.5">
                      {selectedParty.creditDays || 30} Days
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <div className="typo-label text-slate-500">Total Vouchers</div>
                    <div className="typo-amount-secondary text-slate-800 mt-0.5">
                      {partyTransactions.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation (Transactions | Profile | Ledger Statement | Item Wise) */}
              <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setPartyDetailTab("transactions")}
                  className={`px-4 py-2.5 typo-tab border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    partyDetailTab === "transactions"
                      ? "border-teal-600 text-teal-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>{lang === "gu" ? "વ્યવહારો" : "Transactions"}</span>
                  <span className="bg-slate-100 text-slate-600 typo-badge px-1.5 py-0.5 rounded-full">
                    {partyTransactions.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPartyDetailTab("profile")}
                  className={`px-4 py-2.5 typo-tab border-b-2 transition-colors cursor-pointer ${
                    partyDetailTab === "profile"
                      ? "border-teal-600 text-teal-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {lang === "gu" ? "પ્રોફાઇલ" : "Profile"}
                </button>

                <button
                  type="button"
                  onClick={() => setPartyDetailTab("notes")}
                  className={`px-4 py-2.5 typo-tab border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    partyDetailTab === "notes"
                      ? "border-teal-600 text-teal-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{lang === "gu" ? "નોંધ" : "Notes"}</span>
                  <span className="bg-slate-100 text-slate-600 typo-badge px-1.5 py-0.5 rounded-full">
                    {partyNotes.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPartyDetailTab("appointments")}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    partyDetailTab === "appointments"
                      ? "border-teal-600 text-teal-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{lang === "gu" ? "મુલાકાત" : "Appointments"}</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full tabular-nums">
                    {partyAppointments.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPartyDetailTab("ledger")}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    partyDetailTab === "ledger"
                      ? "border-teal-600 text-teal-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {lang === "gu" ? "ખાતાવહી (Statement)" : "Ledger (Statement)"}
                </button>

                <button
                  type="button"
                  onClick={() => setPartyDetailTab("items")}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    partyDetailTab === "items"
                      ? "border-teal-600 text-teal-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {lang === "gu" ? "આઇટમ રિપોર્ટ" : "Item Wise Report"}
                </button>
              </div>

              {/* Tab Contents Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {/* 1. TRANSACTIONS TAB */}
                {partyDetailTab === "transactions" && (
                  <div className="space-y-4">
                    {isLoadingTransactions ? (
                      <div className="py-12 text-center text-xs text-slate-500">
                        Loading party vouchers and invoices...
                      </div>
                    ) : partyTransactions.length === 0 ? (
                      <div className="py-12 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                        <div className="flex justify-center mb-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <Receipt className="w-6 h-6 text-slate-400" />
                          </div>
                        </div>
                        <div className="font-bold text-sm text-slate-800">
                          {lang === "gu" ? "કોઈ વ્યવહાર મળ્યો નથી" : "No Transactions Recorded Yet"}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {lang === "gu"
                            ? "આ વેપારી માટે વેચાણ બિલ અથવા ખરીદી વાઉચર બનાવીને શરૂઆત કરો."
                            : "Create sales invoices, purchases, or payment receipts for this party."}
                        </p>
                        <Link
                          href={`/sales/invoices/new?partyId=${selectedParty.id}`}
                          className="mt-4 inline-flex items-center gap-1.5 h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-sm transition-all"
                        >
                          + Create Sales Invoice
                        </Link>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                            <tr>
                              <th className="p-3">Type</th>
                              <th className="p-3">Voucher Number</th>
                              <th className="p-3">Date</th>
                              <th className="p-3 text-right">Amount</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {partyTransactions.map((txn) => (
                              <tr key={txn.id} className="hover:bg-slate-50/60">
                                <td className="p-3 font-semibold text-slate-700">
                                  {txn.type}
                                </td>
                                <td className="p-3 tabular-nums font-medium text-teal-700">
                                  {txn.number || "—"}
                                </td>
                                <td className="p-3 text-slate-600 tabular-nums">
                                  {new Date(txn.date).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </td>
                                <td className="p-3 text-right tabular-nums font-medium text-slate-900">
                                  ₹ {txn.amount.toLocaleString("en-IN")}
                                </td>
                                <td className="p-3 text-center">
                                  <StatusBadge status={txn.status || "CONFIRMED"} />
                                </td>
                                <td className="p-3 text-right">
                                  <Link
                                    href={`/sales/invoices/${txn.id}`}
                                    className="px-2.5 py-1 text-[11px] font-medium text-[#1677E8] bg-[#EFF6FF] hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors inline-block"
                                  >
                                    View →
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PROFILE TAB */}
                {partyDetailTab === "profile" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Basic & Statutory */}
                      <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                          Basic & Tax Details
                        </h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Party Name:</span>
                            <span className="font-semibold text-slate-900">{selectedParty.name}</span>
                          </div>
                          {lang === "gu" && selectedParty.nameGujarati && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Gujarati Name:</span>
                              <span className="font-semibold text-slate-900">{selectedParty.nameGujarati}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">Party Type:</span>
                            <span className="font-semibold text-slate-900 capitalize">{selectedParty.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">GSTIN:</span>
                            <span className="tabular-nums font-bold text-teal-700">
                              {selectedParty.gstin || "Unregistered / Regular"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">State Code:</span>
                            <span className="tabular-nums font-semibold text-slate-900">
                              {selectedParty.stateCode} ({selectedParty.stateCode === "24" ? "Gujarat" : "Other State"})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contact & Credit */}
                      <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                          Contact & Credit Terms
                        </h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Phone:</span>
                            <span className="tabular-nums font-semibold text-slate-900">{selectedParty.phone || "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Email:</span>
                            <span className="font-medium text-slate-900">{selectedParty.email || "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Credit Limit:</span>
                            <span className="tabular-nums font-semibold text-slate-900">
                              {selectedParty.creditLimit ? `₹ ${Number(selectedParty.creditLimit).toLocaleString("en-IN")}` : "No Limit"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Credit Period:</span>
                            <span className="tabular-nums font-semibold text-slate-900">
                              {selectedParty.creditDays || 30} Days
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Billing Address:</span>
                            <span className="font-medium text-slate-800 text-right max-w-[200px] truncate">
                              {selectedParty.billingAddress?.line1 || "—"}, {selectedParty.billingAddress?.city || "Ahmedabad"} - {selectedParty.billingAddress?.pincode || "380001"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(selectedParty)}
                        className="h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        Edit Party Profile
                      </button>
                    </div>
                  </div>
                )}

                {/* NOTES TAB */}
                {partyDetailTab === "notes" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50/60 p-4 rounded-xl border border-teal-100">
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-700" />
                          <span>Notes & Remarks</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                            {partyNotes.length}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Internal notes, payment follow-up remarks, or special instructions for {selectedParty.name}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddNoteModalOpen(true)}
                        className="h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] text-white font-medium text-[13px] rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        + Add Note
                      </button>
                    </div>

                    {isLoadingNotesAppts ? (
                      <div className="py-12 text-center text-xs text-slate-400">Loading notes...</div>
                    ) : partyNotes.length === 0 ? (
                      <div className="py-12 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-2">
                        <div className="flex justify-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <FileText className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="font-bold text-sm text-slate-800">No Notes Added Yet</div>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Keep track of discussions, special terms, or reminders by adding a note.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddNoteModalOpen(true)}
                          className="mt-2 inline-flex items-center gap-1 h-9 px-3 bg-[#1677E8] text-white text-[13px] font-medium rounded-xl shadow-sm"
                        >
                          + Add First Note
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {partyNotes.map((n: any) => (
                          <div
                            key={n.id}
                            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-teal-200 transition-all space-y-2 relative group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(n.id)}
                                title="Delete Note"
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 text-xs transition-opacity p-1.5 rounded hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                              {n.description || n.descriptions || "No description provided."}
                            </p>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                              </span>
                              <span>{new Date(n.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* APPOINTMENTS TAB */}
                {partyDetailTab === "appointments" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/60 p-4 rounded-xl border border-purple-100">
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-700" />
                          <span>Scheduled Appointments & Follow-ups</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {partyAppointments.length}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Scheduled visits, meetings, and balance collection reminders for {selectedParty.name}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setApptDate(tomorrow.toISOString().split("T")[0]);
                          setIsAddAppointmentModalOpen(true);
                        }}
                        className="h-9 px-3 bg-purple-600 hover:bg-purple-700 text-white font-medium text-[13px] rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        + Schedule Appointment
                      </button>
                    </div>

                    {isLoadingNotesAppts ? (
                      <div className="py-12 text-center text-xs text-slate-400">Loading appointments...</div>
                    ) : partyAppointments.length === 0 ? (
                      <div className="py-12 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-2">
                        <div className="flex justify-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                            <Calendar className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="font-bold text-sm text-slate-800">No Appointments Scheduled</div>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Plan site visits, client meetings, or order review discussions.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            setApptDate(tomorrow.toISOString().split("T")[0]);
                            setIsAddAppointmentModalOpen(true);
                          }}
                          className="mt-2 inline-flex items-center gap-1 h-9 px-3 bg-purple-600 text-white text-[13px] font-medium rounded-xl shadow-sm"
                        >
                          + Schedule First Appointment
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {partyAppointments.map((a: any) => (
                          <div
                            key={a.id}
                            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-purple-200 transition-all space-y-3 relative group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-sm text-slate-900">{a.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    <Calendar className="w-3 h-3 text-purple-600" />
                                    <span>{new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                                    <span>{a.time}</span>
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteAppointment(a.id)}
                                title="Cancel Appointment"
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 text-xs transition-opacity p-1.5 rounded hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {a.description && (
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {a.description}
                              </p>
                            )}

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {a.status || "SCHEDULED"}
                              </span>
                              <span className="text-[11px] text-slate-400 tabular-nums">
                                Created: {new Date(a.createdAt).toLocaleDateString("en-IN")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. LEDGER STATEMENT TAB */}
                {partyDetailTab === "ledger" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Statement of Account: {selectedParty.name}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                          Financial Year 2026-27 • Net Balance: ₹{Number(selectedParty.balance || 0).toLocaleString("en-IN")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="h-9 px-3 text-[13px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Print Statement</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Particulars</th>
                            <th className="p-3">Voucher #</th>
                            <th className="p-3 text-right">Debit (₹)</th>
                            <th className="p-3 text-right">Credit (₹)</th>
                            <th className="p-3 text-right">Balance (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                          <tr className="bg-slate-50/40 font-semibold text-slate-600">
                            <td className="p-3">—</td>
                            <td className="p-3 font-sans">Opening Balance</td>
                            <td className="p-3">—</td>
                            <td className="p-3 text-right">0.00</td>
                            <td className="p-3 text-right">0.00</td>
                            <td className="p-3 text-right">0.00</td>
                          </tr>
                          {partyTransactions.map((txn) => {
                            const isDebit = txn.type === "Sales Invoices";
                            return (
                              <tr key={txn.id} className="hover:bg-slate-50/60">
                                <td className="p-3 text-slate-600">
                                  {new Date(txn.date).toLocaleDateString("en-IN")}
                                </td>
                                <td className="p-3 font-sans text-slate-800 font-medium">
                                  {txn.type}
                                </td>
                                <td className="p-3 font-medium text-teal-700">
                                  {txn.number || "—"}
                                </td>
                                <td className="p-3 text-right font-medium text-slate-900">
                                  {isDebit ? txn.amount.toLocaleString("en-IN") : "—"}
                                </td>
                                <td className="p-3 text-right font-medium text-emerald-700">
                                  {!isDebit ? txn.amount.toLocaleString("en-IN") : "—"}
                                </td>
                                <td className="p-3 text-right font-medium text-indigo-900">
                                  ₹ {txn.amount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. ITEM WISE REPORT TAB */}
                {partyDetailTab === "items" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1">
                        Item Wise Transaction Summary
                      </div>
                      <p className="text-xs text-slate-500">
                        Detailed summary of inventory items traded with {selectedParty.name}.
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                          <tr>
                            <th className="p-3">Item Details</th>
                            <th className="p-3 text-center">Transactions</th>
                            <th className="p-3 text-right">Total Quantity</th>
                            <th className="p-3 text-right">Total Net Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {partyTransactions.length > 0 ? (
                            <tr>
                              <td className="p-3 font-semibold text-slate-800">
                                Items across {partyTransactions.length} vouchers
                              </td>
                              <td className="p-3 text-center tabular-nums">
                                {partyTransactions.length}
                              </td>
                              <td className="p-3 text-right tabular-nums font-semibold">
                                {partyTransactions.length * 10} PCS
                              </td>
                              <td className="p-3 text-right tabular-nums font-medium text-teal-700">
                                ₹ {partyTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-slate-500">
                                No items recorded for this party yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PARTIES DIRECTORY & REGISTER VIEW (Matching MyBillBook) */
        <div className="space-y-6">
          {/* SharedLedger Announcement Banner (Disabled) */}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="min-w-0">
              <h1 className="typo-page-title text-slate-900 leading-tight">
                {lang === "gu" ? "વેપારીઓ / ગ્રાહક ખાતાઓ" : "Parties & Customer Accounts"}
              </h1>
              <p className="typo-page-subtitle text-slate-500 mt-1">
                {lang === "gu"
                  ? "ગ્રાહકો, સપ્લાયરો, જીએસટી નંબર અને ખાતાની માહિતી મેનેજ કરો"
                  : "Manage customers, suppliers, GSTINs, credit terms, and ledger limits"}
              </p>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-white hover:bg-emerald-50/50 text-[#166534] border border-[#86EFAC] typo-btn-secondary rounded-xl shadow-2xs transition-all w-full sm:w-auto shrink-0 cursor-pointer"
                title="Import Parties from Excel or CSV"
              >
                <svg className="w-4 h-4 text-[#15803D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>{lang === "gu" ? "એક્સેલ / CSV ઈમ્પોર્ટ" : "Import Excel / CSV"}</span>
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#1677E8] hover:bg-[#1268D3] active:bg-[#0D5FC4] text-white typo-btn-primary rounded-xl shadow-xs transition-all w-full sm:w-auto shrink-0 cursor-pointer"
              >
                <span className="text-base font-semibold leading-none">+</span>
                <span>{lang === "gu" ? "નવો વેપારી ઉમેરો" : "Add New Party"}</span>
              </button>
            </div>
          </div>

          {/* 4 Summary KPI Cards (Exact Matching Target Design) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Customers */}
            <div
              onClick={() => setTypeFilter(typeFilter === "CUSTOMER" ? "ALL" : "CUSTOMER")}
              className={`bg-white rounded-2xl border p-4 sm:p-5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group ${
                typeFilter === "CUSTOMER" ? "border-[#1677E8] ring-2 ring-blue-100" : "border-slate-200/80 hover:border-blue-200"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#1677E8] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <span className="typo-card-heading text-slate-600 block">
                    {lang === "gu" ? "ગ્રાહકો" : "Customers"}
                  </span>
                  <div className="typo-kpi text-slate-900 mt-0.5 leading-none">
                    {totalCustomers}
                  </div>
                </div>
              </div>
              <div className="text-blue-500 group-hover:translate-x-0.5 transition-transform shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Card 2: Suppliers */}
            <div
              onClick={() => setTypeFilter(typeFilter === "SUPPLIER" ? "ALL" : "SUPPLIER")}
              className={`bg-white rounded-2xl border p-4 sm:p-5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group ${
                typeFilter === "SUPPLIER" ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200/80 hover:border-indigo-200"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                </div>
                <div>
                  <span className="typo-card-heading text-slate-600 block">
                    {lang === "gu" ? "સપ્લાયરો" : "Suppliers"}
                  </span>
                  <div className="typo-kpi text-slate-900 mt-0.5 leading-none">
                    {totalSuppliers}
                  </div>
                </div>
              </div>
              <div className="text-indigo-500 group-hover:translate-x-0.5 transition-transform shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Card 3: To Collect (Receivable) */}
            <div
              onClick={() => setTypeFilter(typeFilter === "CUSTOMER" ? "ALL" : "CUSTOMER")}
              className="bg-[#F0FDF4] rounded-2xl border border-[#BBF7D0] p-4 sm:p-5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#15803D] font-semibold text-xl flex items-center justify-center shrink-0">
                  ₹
                </div>
                <div className="min-w-0">
                  <span className="typo-card-heading text-[#15803D] block truncate">
                    {lang === "gu" ? "લેવાની રકમ (Receivable)" : "To Collect (Receivable)"}
                  </span>
                  <div className="typo-kpi text-[#15803D] mt-0.5 leading-none truncate">
                    ₹ {totalToCollect.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
              <div className="text-[#15803D] group-hover:translate-x-0.5 transition-transform shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Card 4: To Pay (Payable) */}
            <div
              onClick={() => setTypeFilter(typeFilter === "SUPPLIER" ? "ALL" : "SUPPLIER")}
              className="bg-[#FEF2F2] rounded-2xl border border-[#FECACA] p-4 sm:p-5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="typo-card-heading text-[#DC2626] block truncate">
                    {lang === "gu" ? "ચૂકવવાની રકમ (Payable)" : "To Pay (Payable)"}
                  </span>
                  <div className="typo-kpi text-[#DC2626] mt-0.5 leading-none truncate">
                    ₹ {totalToPay.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
              <div className="text-[#DC2626] group-hover:translate-x-0.5 transition-transform shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Parties DataTable */}
          <DataTable<Party>
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            toolbarVariant="clean"
            renderBulkActions={(ids) => (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-[13px] font-medium rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>
                  {lang === "gu"
                    ? `પસંદ કરેલ કાઢી નાખો (${ids.size})`
                    : `Delete Selected (${ids.size})`}
                </span>
              </button>
            )}
            data={displayParties}
            columns={partyColumns}
            keyExtractor={(p) => p.id}
            searchPlaceholder={
              lang === "gu"
                ? "નામ, ફોન નંબર અથવા જીએસટી દ્વારા શોધો..."
                : "Search by party name, phone, or GSTIN..."
            }
            searchKeys={["name", "phone", "gstin", "stateCode"]}
            customSearchFn={(p, q) =>
              Boolean(
                p.name.toLowerCase().includes(q) ||
                  (p.nameGujarati && p.nameGujarati.toLowerCase().includes(q)) ||
                  (p.phone && p.phone.includes(q)) ||
                  (p.gstin && p.gstin.toLowerCase().includes(q)) ||
                  (p.stateCode && p.stateCode.toLowerCase().includes(q))
              )
            }
            isLoading={isLoading}
            lang={lang}
            onRowClick={(p) => setSelectedParty(p)}
            themeColor="saffron"
            exportable
            exportFileName="parties_master"
            filtersSlot={
              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-10 text-[13px] bg-white border border-[#E2E8F0] text-[#182230] rounded-xl px-3.5 py-1.5 font-normal focus:outline-none focus:border-[#1677E8] cursor-pointer shadow-2xs"
                >
                  <option value="ALL">
                    {lang === "gu" ? "તમામ પ્રકાર (All Types)" : "All Types"}
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
            }
            mobileCardRender={(p) => {
              const bal = Number(p.balance || 0);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedParty(p)}
                  className="p-4 hover:bg-slate-50/80 transition-colors space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 text-sm block">{p.name}</span>
                      {lang === "gu" && p.nameGujarati && (
                        <p className="text-xs text-slate-500">{p.nameGujarati}</p>
                      )}
                      <span className="text-xs text-slate-500 tabular-nums inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{p.phone || "—"}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          p.type === "CUSTOMER"
                            ? "info"
                            : p.type === "SUPPLIER"
                            ? "purple"
                            : "neutral"
                        }
                      >
                        {p.type === "CUSTOMER" ? "Customer" : p.type === "SUPPLIER" ? "Supplier" : p.type}
                      </Badge>
                      <div className="mt-1 font-semibold text-xs tabular-nums">
                        {bal <= 0 ? (
                          <span className="text-slate-600 font-normal">₹ 0</span>
                        ) : p.type === "SUPPLIER" ? (
                          <span className="text-[#DC2626]">↑ ₹ {bal.toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-[#15803D]">↓ ₹ {bal.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {p.gstin && (
                    <div className="text-[11px] tabular-nums font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                      GSTIN: {p.gstin}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const companyName =
                          currentCompany?.tradeName ||
                          currentCompany?.legalName ||
                          "myownbillbook";
                        const bal = Number(p.balance || 0);
                        const text = `*Statement from ${companyName}*\nDear ${p.name},\nYour current balance is ₹${bal.toLocaleString("en-IN")}.\nKindly let us know if you need any invoices.\n\nThank you!`;
                        const cleanPhone = (p.phone || "").replace(/[^0-9]/g, "");
                        if (cleanPhone) {
                          const waUrl = `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone}?text=${encodeURIComponent(text)}`;
                          window.open(waUrl, "_blank");
                        } else {
                          alert(lang === "gu" ? "આ વેપારી માટે કોઈ મોબાઇલ નંબર ઉપલબ્ધ નથી." : "No phone number available for this party.");
                        }
                      }}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      title={lang === "gu" ? "વોટ્સએપ સ્ટેટમેન્ટ મોકલો" : "Send Statement via WhatsApp"}
                    >
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedParty(p)}
                      className="px-3 py-1 text-xs font-medium text-[#1677E8] bg-[#EFF6FF] hover:bg-blue-100 border border-[#BFDBFE] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                      title="View Master Details"
                    >
                      <span>Details</span>
                      <span>→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(p)}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                    >
                      {lang === "gu" ? "સુધારો" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartyToDelete(p)}
                      className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                    >
                      {lang === "gu" ? "કાઢી નાખો" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            }}
          />

          {/* Bottom Excel / Tally Migration Banner (Disabled) */}
        </div>
      )}

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
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "ખાતાનો પ્રકાર *" : "Party Type *"}
              </label>
              <select
                value={formData.type}
                onChange={(e: any) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-[#1677E8] h-10"
              >
                <option value="CUSTOMER">{lang === "gu" ? "ગ્રાહક (Customer)" : "Customer"}</option>
                <option value="SUPPLIER">{lang === "gu" ? "વેપારી / સપ્લાયર (Supplier)" : "Supplier"}</option>
                <option value="BOTH">{lang === "gu" ? "ગ્રાહક અને સપ્લાયર (Both)" : "Both (Customer & Supplier)"}</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "મોબાઇલ નંબર *" : "Mobile Phone *"}
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder={lang === "gu" ? "૧૦ આંકડાનો મોબાઇલ નંબર" : "Enter mobile number"}
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded tabular-nums focus:bg-white focus:ring-1 focus:ring-[#1677E8] h-10"
              />
            </div>
          </div>

          {/* GSTIN and State Code with Live Autofill & Verification */}
          <div className="bg-slate-50/90 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[12px] font-medium text-slate-700 uppercase">
                    {lang === "gu" ? "જીએસટી નંબર (GSTIN)" : "GSTIN (15 Digits)"}
                  </label>
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    {formData.gstin ? `${formData.gstin.length}/15` : "Optional"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => {
                      const clean = e.target.value.toUpperCase();
                      setFormData({ ...formData, gstin: clean });
                      if (clean.trim().length === 15) {
                        handleGstinLookup(clean, false);
                      } else {
                        setVerifiedGstinData(null);
                        setGstinAutofillSuccess(null);
                        setGstinCorrection(null);
                        setNameConflict(null);
                      }
                    }}
                    placeholder={lang === "gu" ? "૧૫ આંકડાનો GSTIN (વૈકલ્પિક)" : "15-digit GSTIN (optional)"}
                    maxLength={15}
                    className="w-full text-[13px] p-2 bg-white border border-slate-300 rounded tabular-nums uppercase focus:ring-1 focus:ring-[#1677E8] h-10"
                  />
                  <button
                    type="button"
                    disabled={isGstinFetching || !formData.gstin || formData.gstin.trim().length < 15}
                    onClick={() => handleGstinLookup(formData.gstin, false, true)}
                    className="h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] disabled:opacity-40 text-white rounded-[10px] text-[13px] font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Verify GSTIN with official portal & autofill details"
                  >
                    {isGstinFetching ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isGstinFetching
                        ? lang === "gu"
                          ? "ચકાસી રહ્યા છીએ..."
                          : "Verifying..."
                        : verifiedGstinData
                        ? lang === "gu"
                          ? "ફરી ચકાસો"
                          : "Re-verify"
                        : lang === "gu"
                        ? "વેરિફાઈ જીએસટી"
                        : "Verify GSTIN"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                  {lang === "gu" ? "રાજ્ય કોડ" : "State Code"}
                </label>
                <input
                  type="text"
                  value={formData.stateCode}
                  onChange={(e) =>
                    setFormData({ ...formData, stateCode: e.target.value })
                  }
                  placeholder={lang === "gu" ? "રાજ્ય કોડ (દા.ત. 24)" : "e.g. 24"}
                  maxLength={2}
                  className="w-full text-[13px] p-2 bg-white border border-slate-300 rounded tabular-nums focus:ring-1 focus:ring-[#1677E8] h-10"
                />
              </div>
            </div>

            {/* GSTIN Fetching Spinner */}
            {isGstinFetching && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 animate-pulse">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span>{lang === "gu" ? "જીએસટી પોર્ટલ પરથી વેપારીની વિગતો લાવી રહ્યા છીએ..." : "Contacting GST portal and verifying taxpayer details..."}</span>
              </div>
            )}

            {/* Name Discrepancy Conflict Resolution Banner */}
            {nameConflict && !nameConflict.isEdit && !isGstinFetching && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-800">
                    {lang === "gu" ? "નામ વિસંગતતા જણાઈ:" : "Party Name Discrepancy:"}
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded tabular-nums">
                    Review
                  </span>
                </div>
                <p className="text-slate-700 text-[11px]">
                  {lang === "gu"
                    ? `તમે દાખલ કરેલ નામ '${nameConflict.existing}' છે, પરંતુ પોર્ટલ પર નોંધાયેલ નામ '${nameConflict.verified}' છે.`
                    : `You entered '${nameConflict.existing}', but the GST portal record is '${nameConflict.verified}'.`}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, name: nameConflict.verified }));
                      setNameConflict(null);
                    }}
                    className="px-2.5 py-1 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded text-[13px] font-medium cursor-pointer"
                  >
                    {lang === "gu" ? "વેરિફાઇડ નામ વાપરો" : "Use Verified Name"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNameConflict(null)}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[13px] font-medium cursor-pointer"
                  >
                    {lang === "gu" ? "દાખલ કરેલ નામ રાખો" : "Keep Entered Name"}
                  </button>
                </div>
              </div>
            )}

            {/* Verified Taxpayer Card */}
            {verifiedGstinData && !isGstinFetching && (
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded text-xs text-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-900">
                      {verifiedGstinData.tradeName || verifiedGstinData.legalName || "Verified Taxpayer"}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                      verifiedGstinData.registrationStatus === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : verifiedGstinData.registrationStatus === "CANCELLED"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {verifiedGstinData.registrationStatus}
                  </span>
                </div>

                {/* Cancelled / Suspended Warning */}
                {verifiedGstinData.registrationStatus === "CANCELLED" && (
                  <div className="p-2 bg-rose-50 border border-rose-300 rounded text-rose-800 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      {lang === "gu"
                        ? "આ GSTIN રદ (Cancelled) થયેલ છે. આ પાર્ટી સાથેના બિલો પર ITC દાવો માન્ય રહેશે નહીં."
                        : "Warning: This GSTIN is officially CANCELLED. ITC cannot be claimed on supplies from cancelled registrations."}
                    </span>
                  </div>
                )}
                {verifiedGstinData.registrationStatus === "SUSPENDED" && (
                  <div className="p-2 bg-amber-50 border border-amber-300 rounded text-amber-800 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      {lang === "gu"
                        ? "આ GSTIN હાલમાં સસ્પેન્ડ (Suspended) છે."
                        : "Warning: This GSTIN is currently SUSPENDED by tax authorities."}
                    </span>
                  </div>
                )}

                {/* Taxpayer Meta Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-emerald-200/60">
                  <div>
                    <span className="text-slate-400">Legal: </span>
                    <span className="font-medium text-slate-700">{verifiedGstinData.legalName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Type: </span>
                    <span className="font-medium text-slate-700">{verifiedGstinData.taxpayerType || "Regular"}</span>
                  </div>
                  {verifiedGstinData.constitutionOfBusiness && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Constitution: </span>
                      <span className="font-medium text-slate-700">{verifiedGstinData.constitutionOfBusiness}</span>
                    </div>
                  )}
                  {verifiedGstinData.address?.line1 && (
                    <div className="col-span-2 truncate">
                      <span className="text-slate-400">Address: </span>
                      <span className="tabular-nums text-slate-700">
                        {verifiedGstinData.address.line1}, {verifiedGstinData.address.city || ""}{" "}
                        {verifiedGstinData.address.pincode || ""}
                      </span>
                    </div>
                  )}
                </div>

                {verifiedGstinData.alreadyExistsInCompany && (
                  <div className="text-[11px] text-amber-700 bg-amber-50/80 p-1.5 rounded border border-amber-200">
                    ℹ️ {lang === "gu"
                      ? "આ GSTIN વાળી પાર્ટી તમારા ખાતામાં પહેલેથી હાજર છે."
                      : "A party with this GSTIN already exists in your company records."}
                  </div>
                )}
              </div>
            )}

            {/* GSTIN Checksum Typo Suggestion */}
            {gstinCorrection && !isGstinFetching && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-800">
                    {lang === "gu" ? "GSTIN ચેકસમ ભૂલ શોધી કાઢી:" : "GSTIN Check Digit Typo:"}
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded tabular-nums">
                    Mod 36
                  </span>
                </div>
                <p className="text-amber-700">
                  {lang === "gu"
                    ? `છેલ્લો ચકાસણી અક્ષર '${gstinCorrection.calculatedChecksum}' હોવો જોઈએ.`
                    : `The 15th checksum character should be '${gstinCorrection.calculatedChecksum}'.`}
                </p>
                <button
                  type="button"
                  onClick={() => applySuggestedGstin(gstinCorrection.suggestedGstin, false)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-[13px] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{lang === "gu" ? `સુધારીને ${gstinCorrection.suggestedGstin} કરો અને ઓટોફિલ કરો` : `Fix to ${gstinCorrection.suggestedGstin} & Autofill`}</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
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
              placeholder={lang === "gu" ? "વેપારીનું નામ દાખલ કરો" : "Enter business / party name"}
              className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-[#1677E8] h-10"
            />
          </div>

          {lang === "gu" && (
            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                નામ ગુજરાતીમાં (વૈકલ્પિક)
              </label>
              <input
                type="text"
                value={formData.nameGujarati}
                onChange={(e) =>
                  setFormData({ ...formData, nameGujarati: e.target.value })
                }
                placeholder="દા.ત. શ્રી ગણેશ પ્રોવિઝન સ્ટોર"
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-[#1677E8] h-10"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "સરનામું" : "Address Line"}
              </label>
              <input
                type="text"
                value={formData.line1}
                onChange={(e) =>
                  setFormData({ ...formData, line1: e.target.value })
                }
                placeholder={lang === "gu" ? "દુકાન, મકાન, શેરી" : "Shop, building, street, area"}
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded h-10"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "શહેર" : "City"}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder={lang === "gu" ? "શહેરનું નામ" : "City / District"}
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded h-10"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "પીનકોડ" : "Pincode"}
              </label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value })
                }
                placeholder={lang === "gu" ? "પીનકોડ" : "Pincode"}
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded tabular-nums h-10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-3.5 text-[13px] font-medium text-white bg-[#1677E8] hover:bg-[#1268D3] disabled:opacity-50 rounded-lg shadow-sm"
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
        title={lang === "gu" ? "વેપારીની વિગતો સુધારો" : "Edit Party Details"}
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
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "ખાતાનો પ્રકાર *" : "Party Type *"}
              </label>
              <select
                value={editFormData.type}
                onChange={(e: any) =>
                  setEditFormData({ ...editFormData, type: e.target.value })
                }
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-[#1677E8] h-10"
              >
                <option value="CUSTOMER">{lang === "gu" ? "ગ્રાહક (Customer)" : "Customer"}</option>
                <option value="SUPPLIER">{lang === "gu" ? "વેપારી / સપ્લાયર (Supplier)" : "Supplier"}</option>
                <option value="BOTH">{lang === "gu" ? "ગ્રાહક અને સપ્લાયર (Both)" : "Both (Customer & Supplier)"}</option>
                <option value="BROKER">{lang === "gu" ? "દલાલ / બ્રોકર (Broker)" : "Broker"}</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "મોબાઇલ નંબર *" : "Mobile Phone *"}
              </label>
              <input
                type="text"
                required
                value={editFormData.phone}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, phone: e.target.value })
                }
                placeholder={lang === "gu" ? "૧૦ આંકડાનો મોબાઇલ નંબર" : "Enter mobile number"}
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded tabular-nums focus:bg-white focus:ring-1 focus:ring-[#1677E8] h-10"
              />
            </div>
          </div>

          {/* GSTIN and State Code with Live Autofill & Verification */}
          <div className="bg-slate-50/90 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[12px] font-medium text-slate-700 uppercase">
                    {lang === "gu" ? "જીએસટી નંબર (GSTIN)" : "GSTIN (15 Digits)"}
                  </label>
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    {editFormData.gstin ? `${editFormData.gstin.length}/15` : "Optional"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editFormData.gstin}
                    onChange={(e) => {
                      const clean = e.target.value.toUpperCase();
                      setEditFormData({ ...editFormData, gstin: clean });
                      if (clean.trim().length === 15) {
                        handleGstinLookup(clean, true);
                      } else {
                        setEditVerifiedGstinData(null);
                        setGstinAutofillSuccess(null);
                        setGstinCorrection(null);
                        setNameConflict(null);
                      }
                    }}
                    placeholder={lang === "gu" ? "૧૫ આંકડાનો GSTIN (વૈકલ્પિક)" : "15-digit GSTIN (optional)"}
                    maxLength={15}
                    className="w-full text-[13px] p-2 bg-white border border-slate-300 rounded tabular-nums uppercase focus:ring-1 focus:ring-[#1677E8] h-10"
                  />
                  <button
                    type="button"
                    disabled={isGstinFetching || !editFormData.gstin || editFormData.gstin.trim().length < 15}
                    onClick={() => handleGstinLookup(editFormData.gstin, true, true)}
                    className="h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] disabled:opacity-40 text-white rounded-[10px] text-[13px] font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Verify GSTIN with official portal & autofill details"
                  >
                    {isGstinFetching ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isGstinFetching
                        ? lang === "gu"
                          ? "ચકાસી રહ્યા છીએ..."
                          : "Verifying..."
                        : editVerifiedGstinData
                        ? lang === "gu"
                          ? "ફરી ચકાસો"
                          : "Re-verify"
                        : lang === "gu"
                        ? "વેરિફાઈ જીએસટી"
                        : "Verify GSTIN"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                  {lang === "gu" ? "રાજ્ય કોડ" : "State Code"}
                </label>
                <input
                  type="text"
                  value={editFormData.stateCode}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, stateCode: e.target.value })
                  }
                  placeholder={lang === "gu" ? "રાજ્ય કોડ (દા.ત. 24)" : "e.g. 24"}
                  maxLength={2}
                  className="w-full text-[13px] p-2 bg-white border border-slate-300 rounded tabular-nums focus:ring-1 focus:ring-[#1677E8] h-10"
                />
              </div>
            </div>

            {/* GSTIN Fetching Spinner */}
            {isGstinFetching && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 animate-pulse">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span>{lang === "gu" ? "જીએસટી પોર્ટલ પરથી વેપારીની વિગતો લાવી રહ્યા છીએ..." : "Contacting GST portal and verifying taxpayer details..."}</span>
              </div>
            )}

            {/* Name Discrepancy Conflict Resolution Banner */}
            {nameConflict && nameConflict.isEdit && !isGstinFetching && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-800">
                    {lang === "gu" ? "નામ વિસંગતતા જણાઈ:" : "Party Name Discrepancy:"}
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded tabular-nums">
                    Review
                  </span>
                </div>
                <p className="text-slate-700 text-[11px]">
                  {lang === "gu"
                    ? `તમે દાખલ કરેલ નામ '${nameConflict.existing}' છે, પરંતુ પોર્ટલ પર નોંધાયેલ નામ '${nameConflict.verified}' છે.`
                    : `You entered '${nameConflict.existing}', but the GST portal record is '${nameConflict.verified}'.`}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditFormData((prev) => ({ ...prev, name: nameConflict.verified }));
                      setNameConflict(null);
                    }}
                    className="px-2.5 py-1 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded text-[13px] font-medium cursor-pointer"
                  >
                    {lang === "gu" ? "વેરિફાઇડ નામ વાપરો" : "Use Verified Name"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNameConflict(null)}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[13px] font-medium cursor-pointer"
                  >
                    {lang === "gu" ? "દાખલ કરેલ નામ રાખો" : "Keep Entered Name"}
                  </button>
                </div>
              </div>
            )}

            {/* Verified Taxpayer Card */}
            {editVerifiedGstinData && !isGstinFetching && (
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded text-xs text-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-900">
                      {editVerifiedGstinData.tradeName || editVerifiedGstinData.legalName || "Verified Taxpayer"}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                      editVerifiedGstinData.registrationStatus === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : editVerifiedGstinData.registrationStatus === "CANCELLED"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {editVerifiedGstinData.registrationStatus}
                  </span>
                </div>

                {/* Cancelled / Suspended Warning */}
                {editVerifiedGstinData.registrationStatus === "CANCELLED" && (
                  <div className="p-2 bg-rose-50 border border-rose-300 rounded text-rose-800 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      {lang === "gu"
                        ? "આ GSTIN રદ (Cancelled) થયેલ છે. આ પાર્ટી સાથેના બિલો પર ITC દાવો માન્ય રહેશે નહીં."
                        : "Warning: This GSTIN is officially CANCELLED. ITC cannot be claimed on supplies from cancelled registrations."}
                    </span>
                  </div>
                )}
                {editVerifiedGstinData.registrationStatus === "SUSPENDED" && (
                  <div className="p-2 bg-amber-50 border border-amber-300 rounded text-amber-800 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      {lang === "gu"
                        ? "આ GSTIN હાલમાં સસ્પેન્ડ (Suspended) છે."
                        : "Warning: This GSTIN is currently SUSPENDED by tax authorities."}
                    </span>
                  </div>
                )}

                {/* Taxpayer Meta Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-emerald-200/60">
                  <div>
                    <span className="text-slate-400">Legal: </span>
                    <span className="font-medium text-slate-700">{editVerifiedGstinData.legalName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Type: </span>
                    <span className="font-medium text-slate-700">{editVerifiedGstinData.taxpayerType || "Regular"}</span>
                  </div>
                  {editVerifiedGstinData.constitutionOfBusiness && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Constitution: </span>
                      <span className="font-medium text-slate-700">{editVerifiedGstinData.constitutionOfBusiness}</span>
                    </div>
                  )}
                  {editVerifiedGstinData.address?.line1 && (
                    <div className="col-span-2 truncate">
                      <span className="text-slate-400">Address: </span>
                      <span className="tabular-nums text-slate-700">
                        {editVerifiedGstinData.address.line1}, {editVerifiedGstinData.address.city || ""}{" "}
                        {editVerifiedGstinData.address.pincode || ""}
                      </span>
                    </div>
                  )}
                </div>

                {editVerifiedGstinData.alreadyExistsInCompany && (
                  <div className="text-[11px] text-amber-700 bg-amber-50/80 p-1.5 rounded border border-amber-200">
                    ℹ️ {lang === "gu"
                      ? "આ GSTIN વાળી પાર્ટી તમારા ખાતામાં પહેલેથી હાજર છે."
                      : "A party with this GSTIN already exists in your company records."}
                  </div>
                )}
              </div>
            )}

            {/* GSTIN Checksum Typo Suggestion */}
            {gstinCorrection && !isGstinFetching && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-800">
                    {lang === "gu" ? "GSTIN ચેકસમ ભૂલ શોધી કાઢી:" : "GSTIN Check Digit Typo:"}
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded tabular-nums">
                    Mod 36
                  </span>
                </div>
                <p className="text-amber-700">
                  {lang === "gu"
                    ? `છેલ્લો ચકાસણી અક્ષર '${gstinCorrection.calculatedChecksum}' હોવો જોઈએ.`
                    : `The 15th checksum character should be '${gstinCorrection.calculatedChecksum}'.`}
                </p>
                <button
                  type="button"
                  onClick={() => applySuggestedGstin(gstinCorrection.suggestedGstin, true)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-[13px] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{lang === "gu" ? `સુધારીને ${gstinCorrection.suggestedGstin} કરો અને ઓટોફિલ કરો` : `Fix to ${gstinCorrection.suggestedGstin} & Autofill`}</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
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
              placeholder={lang === "gu" ? "વેપારીનું નામ દાખલ કરો" : "Enter business / party name"}
              className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-[#1677E8] h-10"
            />
          </div>

          {lang === "gu" && (
            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                નામ ગુજરાતીમાં (વૈકલ્પિક)
              </label>
              <input
                type="text"
                value={editFormData.nameGujarati}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, nameGujarati: e.target.value })
                }
                placeholder="દા.ત. શ્રી ગણેશ પ્રોવિઝન સ્ટોર"
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-[#1677E8] h-10"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "સરનામું" : "Address Line"}
              </label>
              <input
                type="text"
                value={editFormData.line1}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, line1: e.target.value })
                }
                placeholder={lang === "gu" ? "દુકાન, મકાન, શેરી" : "Shop, building, street, area"}
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded h-10"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "શહેર" : "City"}
              </label>
              <input
                type="text"
                value={editFormData.city}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, city: e.target.value })
                }
                placeholder={lang === "gu" ? "શહેરનું નામ" : "City / District"}
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded h-10"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 uppercase mb-1">
                {lang === "gu" ? "પીનકોડ" : "Pincode"}
              </label>
              <input
                type="text"
                value={editFormData.pincode}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, pincode: e.target.value })
                }
                placeholder={lang === "gu" ? "પીનકોડ" : "Pincode"}
                className="w-full text-[13px] p-2 bg-slate-50 border border-slate-300 rounded tabular-nums h-10"
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
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-[#1677E8]"
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
              className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-3.5 text-[13px] font-medium text-white bg-[#1677E8] hover:bg-[#1268D3] disabled:opacity-50 rounded-lg shadow-sm"
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
        onClose={() => {
          setPartyToDelete(null);
          setSingleForceDelete(false);
        }}
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

          <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={singleForceDelete}
              onChange={(e) => setSingleForceDelete(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-600 font-medium">
              {lang === "gu"
                ? "કાયમી ધોરણે સંપૂર્ણ કાઢી નાખો (જો જોડાયેલ વ્યવહારો હોય તો પણ દૂર કરો)"
                : "Force permanent delete (unlink and purge historical records)"}
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setPartyToDelete(null);
                setSingleForceDelete(false);
              }}
              className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteParty}
              disabled={isDeleting}
              className="h-9 px-3.5 text-[13px] font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm cursor-pointer"
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

      {/* Bulk Delete Parties Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          setIsBulkDeleteModalOpen(false);
          setBulkForceDelete(false);
        }}
        title={lang === "gu" ? "પસંદ કરેલ ખાતાઓ કાઢી નાખો" : "Bulk Delete Parties"}
        titleGujarati={lang === "gu" ? `${selectedIds.size} ખાતાઓ પસંદ કરેલ છે` : `${selectedIds.size} parties selected`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? `તમે ${selectedIds.size} વેપારી ખાતાઓ કાઢી નાખવા માટે પસંદ કર્યા છે. શું તમે આગળ વધવા માંગો છો?`
              : `You have selected ${selectedIds.size} parties to delete. Are you sure you want to proceed?`}
          </p>

          <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={bulkForceDelete}
              onChange={(e) => setBulkForceDelete(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-600 font-medium">
              {lang === "gu"
                ? "કાયમી ધોરણે સંપૂર્ણ કાઢી નાખો (જો જોડાયેલ વ્યવહારો હોય તો પણ દૂર કરો)"
                : "Force permanent delete (unlink and purge historical records)"}
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsBulkDeleteModalOpen(false);
                setBulkForceDelete(false);
              }}
              className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteParties}
              disabled={isBulkDeleting}
              className="h-9 px-3.5 text-[13px] font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm cursor-pointer"
            >
              {isBulkDeleting
                ? "Deleting..."
                : lang === "gu"
                  ? `હા, પસંદ કરેલ ${selectedIds.size} કાઢી નાખો`
                  : `Confirm Delete (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Add Note */}
      <Modal
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        title={`Add Note for ${selectedParty?.name || "Party"}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateNote} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Note Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Payment Reminder, Order Requirement, Delivery Notice"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] outline-none h-10"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Description / Remarks
            </label>
            <textarea
              rows={4}
              value={noteDescription}
              onChange={(e) => setNoteDescription(e.target.value)}
              placeholder="Write detailed notes, instructions, or follow-up details..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddNoteModalOpen(false)}
              className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingNote || !noteTitle.trim()}
              className="h-9 px-3.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingNote ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Schedule Appointment */}
      <Modal
        isOpen={isAddAppointmentModalOpen}
        onClose={() => setIsAddAppointmentModalOpen(false)}
        title={`Schedule Appointment with ${selectedParty?.name || "Party"}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Meeting / Appointment Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={apptTitle}
              onChange={(e) => setApptTitle(e.target.value)}
              placeholder="e.g. Monthly Account Reconciliation, Sample Show, Payment Follow-up"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none h-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={apptDate}
                onChange={(e) => setApptDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none h-10"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={apptTime}
                onChange={(e) => setApptTime(e.target.value)}
                placeholder="e.g. 11:00 AM, 04:30 PM"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none h-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Description / Agenda
            </label>
            <textarea
              rows={3}
              value={apptDescription}
              onChange={(e) => setApptDescription(e.target.value)}
              placeholder="Meeting agenda, discussion points, or location details..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddAppointmentModalOpen(false)}
              className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingAppt || !apptTitle.trim() || !apptDate}
              className="h-9 px-3.5 bg-purple-600 hover:bg-purple-700 text-white text-[13px] font-medium rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingAppt ? "Scheduling..." : "Schedule Appointment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Excel / CSV Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        preselectedModule={ImportModuleType.PARTIES}
        onSuccess={fetchParties}
      />
    </div>
  );
}
