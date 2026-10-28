"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";
import { ImportWizardModal } from "../../../components/imports/import-wizard-modal";
import { ImportModuleType } from "@billing/shared-types";

interface Category {
  id: string;
  name: string;
  nameGujarati?: string;
  description?: string;
  itemCount?: number;
}

export default function CategoriesPage() {
  const { lang, tenantContext } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    nameGujarati: "",
  });

  // Delete Modal
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    nameGujarati: "",
    description: "",
  });

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/masters/categories");
      setCategories(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchCategories();
    }
  }, [tenantContext.companyId, fetchCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/masters/categories", {
        name: formData.name,
        nameGujarati: formData.nameGujarati || undefined,
        description: formData.description || undefined,
      });

      setIsModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      setFormError(err.message || "Failed to create category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setEditFormData({
      name: cat.name,
      nameGujarati: cat.nameGujarati || "",
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.put(`/masters/categories/${editingCategory.id}`, {
        name: editFormData.name,
        nameGujarati: editFormData.nameGujarati || undefined,
      });

      setIsEditModalOpen(false);
      setEditingCategory(null);
      await fetchCategories();
    } catch (err: any) {
      setFormError(err.message || "Failed to update category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/masters/categories/${categoryToDelete.id}`);
      setCategoryToDelete(null);
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || "Failed to delete category.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteCategories = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    setError(null);
    try {
      await apiClient.post("/masters/categories/bulk-delete", {
        ids: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete selected categories."
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "વસ્તુઓની શ્રેણીઓ (Item Categories)"
              : "Item Categories"}
          </h1>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "અનાજ, કરિયાણું, તેલ, પીણાં જેવી કેટેગરીઓનું સંચાલન"
              : "Organize items into structured product categories"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{lang === "gu" ? "એક્સેલ ઈમ્પોર્ટ" : "Import Excel"}</span>
          </button>

          <button
            onClick={() => {
              setFormData({ name: "", nameGujarati: "", description: "" });
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
            <span>{lang === "gu" ? "નવી શ્રેણી ઉમેરો" : "Add Category"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Main DataTable */}
      <DataTable<Category>
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        renderBulkActions={(ids) => (
          <button
            type="button"
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
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
        data={categories}
        columns={[
          {
            header: lang === "gu" ? "શ્રેણીનું નામ" : "Category Name",
            accessorKey: "name",
            sortable: true,
            cell: (c) => (
              <span className="font-semibold text-slate-900">{c.name}</span>
            ),
          },
          ...(lang === "gu"
            ? [
                {
                  header: "ગુજરાતી નામ",
                  accessorKey: "nameGujarati",
                  sortable: true,
                  cell: (c: any) => (
                    <span className="text-slate-600">{c.nameGujarati || "—"}</span>
                  ),
                },
              ]
            : []),
          {
            header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
            className: "text-center",
            cell: (c) => (
              <div className="inline-flex items-center justify-center gap-1.5">
                <button
                  onClick={() => handleOpenEditModal(c)}
                  className="px-2.5 py-1 text-xs font-semibold text-[#F47721] bg-[#FFF3E8] hover:bg-[#F47721] hover:text-white border border-[#F47721]/30 rounded transition-colors inline-flex items-center gap-1"
                  title="Edit Category"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>{lang === "gu" ? "સુધારો" : "Edit"}</span>
                </button>
                <button
                  onClick={() => setCategoryToDelete(c)}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors inline-flex items-center gap-1"
                  title="Delete Category"
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
        keyExtractor={(c) => c.id}
        searchPlaceholder={
          lang === "gu"
            ? "શ્રેણીના નામથી શોધો..."
            : "Search categories by name..."
        }
        searchKeys={["name", "nameGujarati"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ શ્રેણી મળી નથી. ઉપર 'નવી શ્રેણી ઉમેરો' પર ક્લિક કરો."
            : "No categories found. Click 'Add Category' to organize your items."
        }
        exportFilename="categories_master"
        themeColor="saffron"
        mobileCardRender={(c) => (
          <div key={c.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{c.name}</span>
              {lang === "gu" && c.nameGujarati && (
                <span className="text-xs text-slate-500">{c.nameGujarati}</span>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => handleOpenEditModal(c)}
                className="text-xs text-[#F47721] font-semibold"
              >
                {lang === "gu" ? "સુધારો" : "Edit"}
              </button>
              <button
                onClick={() => setCategoryToDelete(c)}
                className="text-xs text-rose-600 font-semibold"
              >
                {lang === "gu" ? "કાઢી નાખો" : "Delete"}
              </button>
            </div>
          </div>
        )}
      />

      {/* Create Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === "gu" ? "નવી શ્રેણી ઉમેરો" : "Add Category"}
        titleGujarati="ઉત્પાદનોનું વર્ગીકરણ"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Spices & Masala"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          {lang === "gu" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                નામ ગુજરાતીમાં (વૈકલ્પિક)
              </label>
              <input
                type="text"
                value={formData.nameGujarati}
                onChange={(e) =>
                  setFormData({ ...formData, nameGujarati: e.target.value })
                }
                placeholder="દા.ત. મસાલા અને તેજાના"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
              />
            </div>
          )}

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
              {isSubmitting ? "Saving..." : "Save Category"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCategory(null);
        }}
        title={lang === "gu" ? "શ્રેણી સુધારો" : "Edit Category"}
        titleGujarati={editingCategory ? editingCategory.name : ""}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateCategory} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              placeholder="e.g. Spices & Masala"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          {lang === "gu" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                નામ ગુજરાતીમાં (વૈકલ્પિક)
              </label>
              <input
                type="text"
                value={editFormData.nameGujarati}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, nameGujarati: e.target.value })
                }
                placeholder="દા.ત. મસાલા અને તેજાના"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCategory(null);
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
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        title={lang === "gu" ? "શ્રેણી કાઢી નાખવાની ખાતરી" : "Confirm Delete Category"}
        titleGujarati={categoryToDelete ? categoryToDelete.name : ""}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? `શું તમે ખરેખર "${categoryToDelete?.name}" શ્રેણીને કાઢી નાખવા માંગો છો?`
              : `Are you sure you want to delete category "${categoryToDelete?.name}"?`}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCategoryToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteCategory}
              disabled={isDeleting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Categories Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title={lang === "gu" ? "પસંદ કરેલ શ્રેણીઓ કાઢી નાખો" : "Bulk Delete Categories"}
        titleGujarati={lang === "gu" ? `${selectedIds.size} શ્રેણીઓ પસંદ કરેલ છે` : `${selectedIds.size} categories selected`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? `તમે ${selectedIds.size} શ્રેણીઓ કાઢી નાખવા માટે પસંદ કરી છે. શું તમે આગળ વધવા માંગો છો?`
              : `You have selected ${selectedIds.size} categories to delete. Are you sure you want to proceed?`}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteCategories}
              disabled={isBulkDeleting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm cursor-pointer"
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

      {/* Excel / CSV Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        preselectedModule={ImportModuleType.CATEGORIES}
        onSuccess={fetchCategories}
      />
    </div>
  );
}
