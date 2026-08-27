import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Product, ShopSettings } from '../../types/index.ts';
import { Badge } from '../../components/ui/Badge.tsx';
import { api } from '../../lib/api.ts';

interface ProductDetailPageProps {
  product?: Product;
  slugOrId?: string;
  shop: ShopSettings;
  onBack: () => void;
  onInstantBuy?: (product: Product, quantity: number, customFields?: Record<string, string>) => void;
  onBuyProduct?: (product: Product, quantity?: number, customFields?: Record<string, string>) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product: propProduct,
  slugOrId,
  shop,
  onBack,
  onInstantBuy,
  onBuyProduct,
}) => {
  const [fetchedProduct, setFetchedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!propProduct && slugOrId) {
      setLoading(true);
      api.getProduct(slugOrId)
        .then((p) => setFetchedProduct(p))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [propProduct, slugOrId]);

  const product = propProduct || fetchedProduct;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        <p className="text-xs text-zinc-400">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Product Not Found</h2>
        <p className="text-xs text-zinc-400">The product you requested could not be located or is inactive.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white cursor-pointer"
        >
          Return to Storefront
        </button>
      </div>
    );
  }

  const stock = product.stockCount ?? 0;
  const isOutOfStock = stock === 0 && product.deliveryType === 'automatic';
  const images = product.images && product.images.length > 0 ? product.images : ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop'];

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleBuyClick = () => {
    // Validate required custom fields
    if (product.customFields && product.customFields.length > 0) {
      const errs: Record<string, string> = {};
      for (const f of product.customFields) {
        if (f.required && !customFieldValues[f.id]?.trim()) {
          errs[f.id] = `${f.label} is required`;
        }
      }
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }
    }

    if (onBuyProduct) {
      onBuyProduct(product, quantity, customFieldValues);
    } else if (onInstantBuy) {
      onInstantBuy(product, quantity, customFieldValues);
    }
  };

  const maxPurchasable = product.deliveryType === 'automatic'
    ? Math.min(product.maxQuantity || 10, Math.max(1, stock))
    : (product.maxQuantity || 10);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Products</span>
        </button>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Left Column: Image Gallery & Instructions */}
          <div className="lg:col-span-7 space-y-6">
            {/* Main Preview Image */}
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 aspect-video relative">
              <img
                src={images[selectedImage]}
                alt={product.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                {product.featured && <Badge variant="purple">Featured</Badge>}
                <Badge variant="red">{product.categoryName || 'Software'}</Badge>
              </div>
            </div>

            {/* Thumbnail Carousel */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative h-18 w-28 shrink-0 overflow-hidden rounded-xl border transition-all cursor-pointer ${
                      selectedImage === idx
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Full Description & Instructions Box */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white mb-2">Description &amp; Specifications</h3>
                <div className="prose prose-invert text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                  {product.fullDescription || product.shortDescription}
                </div>
              </div>

              {product.instructions && (
                <div className="border-t border-zinc-800 pt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Redemption &amp; Activation Instructions
                  </h4>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300 leading-relaxed font-mono">
                    {product.instructions}
                  </div>
                </div>
              )}

              {/* Discord Support Mention */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 text-xs text-zinc-300">
                <div className="flex items-center gap-3">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Need help activating this item? Discord support is standing by.</span>
                </div>
                <span className="font-bold text-[#8e97f5]">@{shop.supportDiscordUsername || '4gfi'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Purchase Box */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-7 shadow-2xl space-y-6">
              {/* Product Header */}
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white">{product.title}</h1>
                <p className="mt-1 text-xs text-zinc-400">{product.shortDescription}</p>
              </div>

              {/* Price & Currency */}
              <div className="flex items-baseline justify-between border-y border-zinc-800/80 py-4">
                <div>
                  <span className="text-3xl font-black text-white">${(product.priceUsd * quantity).toFixed(2)}</span>
                  <span className="text-xs text-zinc-500 ml-2">USD</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-red-400">
                    &asymp; {(product.priceLtc * quantity).toFixed(4)} LTC
                  </span>
                  <span className="text-[10px] text-zinc-500 block">Apirone Litecoin</span>
                </div>
              </div>

              {/* Stock Status Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                <span className="text-zinc-400">Inventory Status:</span>
                {isOutOfStock ? (
                  <Badge variant="red">Out of Stock</Badge>
                ) : (
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{stock} units available</span>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(product.minQuantity || 1, q - 1))}
                      disabled={quantity <= (product.minQuantity || 1) || isOutOfStock}
                      className="px-3 py-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 text-xs font-bold text-zinc-100 font-mono">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(maxPurchasable, q + 1))}
                      disabled={quantity >= maxPurchasable || isOutOfStock}
                      className="px-3 py-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Max: {maxPurchasable} per order
                  </span>
                </div>
              </div>

              {/* Custom Fields (e.g. Discord handle, Gamertag, Hardware ID) */}
              {product.customFields && product.customFields.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-zinc-300">Custom Order Fields</h4>
                  {product.customFields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-xs text-zinc-400 mb-1">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="text"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className={`w-full rounded-xl border bg-zinc-950 px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none ${
                          fieldErrors[field.id] ? 'border-red-500' : 'border-zinc-800 focus:border-red-500'
                        }`}
                      />
                      {fieldErrors[field.id] && (
                        <p className="text-[11px] text-red-400 mt-1">{fieldErrors[field.id]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Buy Now Primary CTA */}
              <button
                onClick={handleBuyClick}
                disabled={isOutOfStock}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white shadow-xl shadow-red-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                id="btn-product-instant-buy"
              >
                <Zap className="h-4 w-4" />
                <span>{isOutOfStock ? 'Sold Out' : 'Instant Checkout with Litecoin'}</span>
              </button>

              {/* Trust Badges */}
              <div className="space-y-2.5 pt-2 text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{product.warrantyPeriod || '30-Day Guaranteed License Warranty'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-400 shrink-0" />
                  <span>Automated Key Allocation via Apirone Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span>24/7 Discord Support Ticket Portal: <strong>@{shop.supportDiscordUsername || '4gfi'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
