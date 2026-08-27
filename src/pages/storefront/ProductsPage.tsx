import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Zap,
  ShieldCheck,
  Tag,
  ArrowRight,
  Filter,
  Flame,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Product, Category, ShopSettings } from '../../types/index.ts';
import { Badge } from '../../components/ui/Badge.tsx';
import { api } from '../../lib/api.ts';

interface ProductsPageProps {
  products?: Product[];
  categories?: Category[];
  shop: ShopSettings;
  onSelectProduct: (product: Product) => void;
  onInstantBuy?: (product: Product) => void;
  onBuyProduct?: (product: Product) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products: propProducts,
  categories: propCategories,
  shop,
  onSelectProduct,
  onInstantBuy,
  onBuyProduct,
}) => {
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [fetchedCategories, setFetchedCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'stock'>('featured');

  useEffect(() => {
    if (!propProducts || !propCategories) {
      setLoading(true);
      Promise.all([
        api.getProducts().catch(() => []),
        api.getCategories().catch(() => []),
      ])
        .then(([pList, cList]) => {
          if (!propProducts && Array.isArray(pList)) setFetchedProducts(pList);
          if (!propCategories && Array.isArray(cList)) setFetchedCategories(cList);
        })
        .finally(() => setLoading(false));
    }
  }, [propProducts, propCategories]);

  const products = propProducts || fetchedProducts || [];
  const categories = propCategories || fetchedCategories || [];

  const handleBuy = (product: Product) => {
    if (onBuyProduct) {
      onBuyProduct(product);
    } else if (onInstantBuy) {
      onInstantBuy(product);
    }
  };

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return list
      .filter((p) => {
        if (!p) return false;
        if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title?.toLowerCase().includes(q);
          const matchDesc = p.shortDescription?.toLowerCase().includes(q);
          const matchTags = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return (a.priceUsd || 0) - (b.priceUsd || 0);
        if (sortBy === 'price-desc') return (b.priceUsd || 0) - (a.priceUsd || 0);
        if (sortBy === 'stock') return (b.stockCount || 0) - (a.stockCount || 0);
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Hero Section */}
      <div className="relative border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-zinc-950 px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400 mb-4">
              <Zap className="h-3.5 w-3.5" />
              <span>Automated 1-Block LTC Instant Fulfillment</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Instant Software, Accounts &amp; <span className="text-red-500">License Keys</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
              {shop.shopDescription || 'Self-hosted digital marketplace with guaranteed stock allocation, encrypted Litecoin checkout, and instant automated delivery.'}
            </p>
          </div>

          {/* Quick Stats Bar */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-zinc-800/80 pt-6">
            <div>
              <span className="text-2xl font-black text-white">{products.length}</span>
              <p className="text-xs text-zinc-500">Catalog Products</p>
            </div>
            <div>
              <span className="text-2xl font-black text-red-400">100%</span>
              <p className="text-xs text-zinc-500">Automated Delivery</p>
            </div>
            <div>
              <span className="text-2xl font-black text-white">LTC</span>
              <p className="text-xs text-zinc-500">Apirone Gateway</p>
            </div>
            <div>
              <span className="text-2xl font-black text-emerald-400">@{shop.supportDiscordUsername || '4gfi'}</span>
              <p className="text-xs text-zinc-500">24/7 Discord Support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalogue Area */}
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {cat.name} ({cat.productCount ?? 0})
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, tags..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 focus:border-red-500 focus:outline-none cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock">Highest Stock</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Tag className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-zinc-200">No products found</h3>
            <p className="text-xs text-zinc-500 mt-1">Try adjusting your filters or search keywords.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const stock = product.stockCount ?? 0;
              const isOutOfStock = stock === 0 && product.deliveryType === 'automatic';

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/80 transition-all hover:-translate-y-1 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-950/20"
                >
                  {/* Top Image & Badges */}
                  <div>
                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                      <img
                        src={product.images?.[0] || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop'}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

                      {/* Stock Badge */}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        {isOutOfStock ? (
                          <Badge variant="red">Out of Stock</Badge>
                        ) : stock <= 2 && product.deliveryType === 'automatic' ? (
                          <Badge variant="amber">Only {stock} Left</Badge>
                        ) : (
                          <Badge variant="emerald">{stock} In Stock</Badge>
                        )}
                        {product.featured && <Badge variant="purple">Featured</Badge>}
                      </div>

                      {/* Category Pill */}
                      <div className="absolute bottom-3 left-3">
                        <span className="text-[11px] font-semibold text-zinc-300 bg-zinc-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-zinc-800">
                          {product.categoryName || 'General'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <button
                        onClick={() => onSelectProduct(product)}
                        className="text-left group-hover:text-red-400 transition-colors"
                      >
                        <h3 className="text-base font-bold text-zinc-100 line-clamp-1">
                          {product.title}
                        </h3>
                      </button>
                      <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {product.shortDescription}
                      </p>

                      {/* Tags */}
                      {product.tags && product.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {product.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer & Buy Button */}
                  <div className="border-t border-zinc-800/80 p-5 bg-zinc-950/40">
                    <div className="flex items-center justify-between mb-3.5">
                      <div>
                        <div className="text-lg font-black text-white">
                          ${product.priceUsd.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono text-red-400">
                          &asymp; {product.priceLtc.toFixed(4)} LTC
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-zinc-500 block">Fulfillment</span>
                        <span className="text-xs font-semibold text-zinc-300">
                          {product.deliveryType === 'automatic' ? '⚡ Instant' : 'Manual'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onSelectProduct(product)}
                        className="w-full py-2 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-all cursor-pointer text-center"
                      >
                        Details
                      </button>

                      <button
                        onClick={() => handleBuy(product)}
                        disabled={isOutOfStock}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>Buy Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
