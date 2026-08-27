import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  Loader2,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Product, Category } from '../../types/index.ts';
import { Badge } from '../../components/ui/Badge.tsx';
import { ConfirmModal } from '../../components/ui/ConfirmModal.tsx';

export const ProductsManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [deliveryType, setDeliveryType] = useState<'automatic' | 'manual' | 'downloadable'>('automatic');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [tags, setTags] = useState('');
  const [instructions, setInstructions] = useState('');
  const [warrantyPeriod, setWarrantyPeriod] = useState('30-Day Guarantee');
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [unlisted, setUnlisted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        api.getAdminProducts().catch(() => []),
        api.getAdminCategories().catch(() => []),
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setTitle('');
    setSlug('');
    setShortDescription('');
    setFullDescription('');
    setPriceUsd('19.99');
    setCategoryId(categories[0]?.id || '');
    setImageUrl('https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop');
    setDeliveryType('automatic');
    setDownloadUrl('');
    setTags('software, lifetime, instant');
    setInstructions('Enter your license key in the client dashboard.');
    setWarrantyPeriod('30-Day Guarantee');
    setFeatured(false);
    setActive(true);
    setUnlisted(false);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setTitle(p.title);
    setSlug(p.slug);
    setShortDescription(p.shortDescription);
    setFullDescription(p.fullDescription);
    setPriceUsd(p.priceUsd.toString());
    setCategoryId(p.categoryId);
    setImageUrl(p.images?.[0] || '');
    setDeliveryType(p.deliveryType);
    setDownloadUrl(p.downloadUrl || '');
    setTags(p.tags?.join(', ') || '');
    setInstructions(p.instructions || '');
    setWarrantyPeriod(p.warrantyPeriod || '30-Day Guarantee');
    setFeatured(p.featured);
    setActive(p.active);
    setUnlisted(p.unlisted);
    setError(null);
    setModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await api.deleteAdminProduct(productToDelete.id);
      setActionNotice(`Successfully deleted "${productToDelete.title}"`);
      setProductToDelete(null);
      setModalOpen(false);
      setEditingProduct(null);
      await fetchData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !priceUsd) {
      setError('Title and price are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: Partial<Product> = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription.trim(),
        priceUsd: Number(priceUsd),
        categoryId,
        images: imageUrl ? [imageUrl.trim()] : [],
        deliveryType,
        downloadUrl: downloadUrl.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        instructions: instructions.trim(),
        warrantyPeriod: warrantyPeriod.trim(),
        featured,
        active,
        unlisted,
      };

      if (editingProduct) {
        await api.updateAdminProduct(editingProduct.id, payload);
      } else {
        await api.createAdminProduct(payload);
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Product Catalogue</h1>
          <p className="text-xs text-zinc-400">
            Create, price, and manage digital items for your storefront.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Action Notification */}
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

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3.5 px-4 font-semibold">Product</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Price (USD / LTC)</th>
                <th className="py-3.5 px-4 font-semibold">Stock</th>
                <th className="py-3.5 px-4 font-semibold">Fulfillment</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {products.map((p) => {
                const stock = p.stockCount ?? 0;
                return (
                  <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop'}
                          alt=""
                          className="h-10 w-14 rounded-lg object-cover bg-zinc-950 border border-zinc-800"
                        />
                        <div>
                          <p className="font-bold text-white line-clamp-1">{p.title}</p>
                          <p className="text-[11px] text-zinc-500 font-mono">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">{p.categoryName || 'General'}</td>
                    <td className="py-3.5 px-4 font-mono">
                      <strong className="text-white">${p.priceUsd.toFixed(2)}</strong>
                      <span className="text-[10px] text-red-400 block">{p.priceLtc.toFixed(4)} LTC</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono font-bold ${
                          stock === 0 ? 'text-red-400' : stock <= 3 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {stock} items
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="zinc">
                        {p.deliveryType === 'automatic' ? '⚡ Instant' : 'Manual'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.active ? (
                        <Badge variant="emerald">Active</Badge>
                      ) : (
                        <Badge variant="zinc">Disabled</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-7 shadow-2xl space-y-5 scrollbar-none">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                    placeholder="Product Title"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Custom Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono focus:border-red-500 focus:outline-none"
                    placeholder="product-title-slug"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    required
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono focus:border-red-500 focus:outline-none"
                    placeholder="19.99"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                  >
                    <option value="">Uncategorized (No Category)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Delivery Type</label>
                  <select
                    value={deliveryType}
                    onChange={(e: any) => setDeliveryType(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                  >
                    <option value="automatic">Automatic (From Stock)</option>
                    <option value="manual">Manual Fulfillment</option>
                    <option value="downloadable">Downloadable Link</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Short Description</label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                  placeholder="Summary for product cards"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Full Description (Markdown)</label>
                <textarea
                  rows={4}
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                  placeholder="Comprehensive description, features, requirements..."
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Redemption Instructions</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono focus:border-red-500 focus:outline-none"
                  placeholder="Steps the customer follows after delivery..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                    placeholder="software, vpn, key"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Warranty Period</label>
                  <input
                    type="text"
                    value={warrantyPeriod}
                    onChange={(e) => setWarrantyPeriod(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                    placeholder="30-Day Guarantee"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="h-4 w-4 accent-red-600 rounded"
                  />
                  <span className="font-semibold text-zinc-300">Featured Item</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 accent-red-600 rounded"
                  />
                  <span className="font-semibold text-zinc-300">Active (Visible)</span>
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <div>
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => setProductToDelete(editingProduct)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Product</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span>Save Product</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!productToDelete}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${productToDelete?.title}"? All associated settings will be removed.`}
        confirmText="Delete Product"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteProduct}
        onClose={() => setProductToDelete(null)}
      />
    </div>
  );
};
