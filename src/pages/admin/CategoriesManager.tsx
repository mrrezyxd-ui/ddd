import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Category } from '../../types/index.ts';
import { ConfirmModal } from '../../components/ui/ConfirmModal.tsx';

export const CategoriesManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Box');

  const fetchCats = async () => {
    try {
      const data = await api.getAdminCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const openCreate = () => {
    setEditingCat(null);
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Box');
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditingCat(c);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description || '');
    setIcon(c.icon || 'Box');
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
      };

      if (editingCat) {
        await api.updateAdminCategory(editingCat.id, payload);
        setActionNotice(`Category "${name}" updated successfully.`);
      } else {
        await api.createAdminCategory(payload);
        setActionNotice(`Category "${name}" created successfully.`);
      }

      setModalOpen(false);
      await fetchCats();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save category.');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!catToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAdminCategory(catToDelete.id);
      setActionNotice(`Category "${catToDelete.name}" deleted. Associated products are now Uncategorized.`);
      setCatToDelete(null);
      setModalOpen(false);
      setEditingCat(null);
      await fetchCats();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Store Categories</h1>
          <p className="text-xs text-zinc-400">Organize products into navigable collections</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Category</span>
        </button>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
              <th className="py-3 px-4 font-semibold">Name</th>
              <th className="py-3 px-4 font-semibold">Slug</th>
              <th className="py-3 px-4 font-semibold">Description</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-zinc-500">
                  No categories found. Click "New Category" to create one.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800/30">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-red-400" />
                    <span>{c.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-400">/{c.slug}</td>
                  <td className="py-3.5 px-4 text-zinc-400">{c.description || '—'}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatToDelete(c)}
                        className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingCat ? 'Edit Category' : 'New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Software & Tools"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="software-tools"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <div>
                  {editingCat && (
                    <button
                      type="button"
                      onClick={() => setCatToDelete(editingCat)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-[11px] font-bold text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
                  >
                    Save Category
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!catToDelete}
        title="Delete Category"
        message={`Are you sure you want to delete category "${catToDelete?.name}"? Any products assigned to this category will automatically become Uncategorized.`}
        confirmText="Delete Category"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteCategory}
        onClose={() => setCatToDelete(null)}
      />
    </div>
  );
};
