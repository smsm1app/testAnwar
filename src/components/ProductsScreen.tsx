/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import {
  Package, Plus, Settings, Search, AlertCircle, Edit, Trash2,
  X, Check, Lock, RotateCcw, LayoutGrid, ToggleLeft, Sparkles
} from 'lucide-react';
import ProductAsset from './ProductAsset';

interface ProductsScreenProps {
  permissions: any;
}

export default function ProductsScreen({ permissions }: ProductsScreenProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Categories Form Module States
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  // Products Form Module States
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isSystemProduct, setIsSystemProduct] = useState(false);
  const [systemItems, setSystemItems] = useState<any[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [selectedComponentQty, setSelectedComponentQty] = useState<string>('1');
  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    sku: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
    minStockAlert: '',
    warrantyMonths: '12',
    notes: '',
    status: 'active' as 'active' | 'disabled'
  });

  const addComponentItem = () => {
    if (!selectedComponentId) return;
    const compProd = products.find(p => p.id === parseInt(selectedComponentId));
    if (!compProd) return;
    
    const qty = parseFloat(selectedComponentQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('يرجى تحديد كمية صالحة للمكون');
      return;
    }
    
    const existing = systemItems.find(item => item.productId === compProd.id);
    if (existing) {
      setSystemItems(systemItems.map(item =>
        item.productId === compProd.id ? { ...item, quantity: item.quantity + qty } : item
      ));
    } else {
      setSystemItems([...systemItems, {
        productId: compProd.id,
        name: compProd.name,
        quantity: qty
      }]);
    }
    setSelectedComponentId('');
    setSelectedComponentQty('1');
  };

  const removeComponentItem = (productId: number) => {
    setSystemItems(systemItems.filter(item => item.productId !== productId));
  };

  const getDynamicQty = (p: any) => {
    if (p.notes && p.notes.startsWith('BUNDLE:')) {
      try {
        const parsed = JSON.parse(p.notes.substring(7));
        const items = parsed.items || [];
        if (items.length === 0) return 0;
        let minVal = Infinity;
        for (const item of items) {
          const comp = products.find(prod => Number(prod.id) === Number(item.productId));
          if (!comp) return 0;
          const possible = Math.floor(Number(comp.quantity) / Number(item.quantity));
          if (possible < minVal) minVal = possible;
        }
        return minVal === Infinity ? 0 : minVal;
      } catch (e) {
        return 0;
      }
    }
    return p.quantity;
  };

  const loadData = async (currentPage = page, currentSearch = searchQuery) => {
    try {
      setLoading(true);
      const prodRes = await api.getProducts(currentPage, limit, currentSearch).catch(() => ({ data: [], total: 0 }));
      const catRes = await api.getCategories().catch(() => []);
      
      if (prodRes.data) {
        setProducts(prodRes.data);
        setTotalCount(prodRes.total);
      } else {
        setProducts(prodRes);
      }
      setCategories(catRes);
    } catch (err: any) {
      toast.error(err.message || 'فشل في تحميل المنتجات والتصنيفات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);



  useEffect(() => {
    if (products.length > 0) {
      const autoOpenId = sessionStorage.getItem('auto_open_products');
      if (autoOpenId) {
        const prod = products.find(p => p.id === parseInt(autoOpenId));
        if (prod) {
          handleOpenProductForm(prod);
        }
        sessionStorage.removeItem('auto_open_products');
      }
    }
  }, [products]);

  // Products Form Submit
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalCategoryId = productForm.categoryId;
    let finalSku = productForm.sku;
    if (isSystemProduct && !finalSku) {
      finalSku = 'SYS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const finalPurchasePrice = productForm.purchasePrice;
    const finalSellingPrice = productForm.sellingPrice;

    if (!productForm.name || !finalCategoryId || !finalSku || !finalPurchasePrice || !finalSellingPrice) {
      toast.error('يرجى ملء جميع الحقول الضرورية للمنتج');
      return;
    }

    if (isSystemProduct && systemItems.length === 0) {
      toast.error('يرجى إضافة مكون واحد على الأقل للمنظومة الجاهزة');
      return;
    }

    try {
      setActionLoading(true);
      let finalNotes = productForm.notes;
      if (isSystemProduct) {
        finalNotes = 'BUNDLE:' + JSON.stringify({
          items: systemItems,
          notesText: productForm.notes || ''
        });
      }

      const payload = {
        name: productForm.name,
        categoryId: finalCategoryId,
        sku: finalSku,
        purchasePrice: finalPurchasePrice,
        sellingPrice: finalSellingPrice,
        quantity: isSystemProduct ? '0' : productForm.quantity,
        minStockAlert: isSystemProduct ? (productForm.minStockAlert || '2') : productForm.minStockAlert,
        warrantyMonths: isSystemProduct ? (productForm.warrantyMonths || '12') : productForm.warrantyMonths,
        notes: finalNotes,
        status: isSystemProduct ? 'active' : productForm.status
      };

      if (editingProductId) {
        if (!permissions.products.edit) {
          toast.error('عذراً، ليس لديك صلاحية تعديل بيانات المنتجات');
          setActionLoading(false);
          return;
        }
        const updatedProd = await api.updateProduct(editingProductId, payload);
        setProducts(prev => prev.map(p => p.id === editingProductId ? updatedProd : p));
      } else {
        if (!permissions.products.create) {
          toast.error('عذراً، ليس لديك صلاحية لإضافة منتجات جديدة');
          setActionLoading(false);
          return;
        }
        const newProd = await api.createProduct(payload);
        setProducts(prev => [...prev, newProd]);
      }
      window.dispatchEvent(new CustomEvent('refresh_erp_notifications'));
      setIsProductFormOpen(false);
      setEditingProductId(null);
      setIsSystemProduct(false);
      setSystemItems([]);
    } catch (err: any) {
      toast.error(err.message || 'أخفق حفظ سجل المنتج');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenProductForm = (product: any = null, forceIsSystem: boolean = false) => {
    if (product) {
      setEditingProductId(product.id);
      const isSystem = product.notes && product.notes.startsWith('BUNDLE:');
      let systemItemsList: any[] = [];
      let notesText = product.notes || '';
      if (isSystem) {
        try {
          const parsed = JSON.parse(product.notes.substring(7));
          systemItemsList = parsed.items || [];
          notesText = parsed.notesText || '';
        } catch (e) {
          console.error(e);
        }
      }

      setIsSystemProduct(isSystem);
      setSystemItems(systemItemsList);

      setProductForm({
        name: product.name,
        categoryId: product.categoryId.toString(),
        sku: product.sku || product.SKU || '',
        purchasePrice: product.purchasePrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        quantity: product.quantity.toString(),
        minStockAlert: product.minStockAlert.toString(),
        warrantyMonths: (product.warrantyMonths || 12).toString(),
        notes: notesText,
        status: product.status || 'active'
      });
    } else {
      setEditingProductId(null);
      setIsSystemProduct(forceIsSystem);
      setSystemItems([]);
      setProductForm({
        name: '',
        categoryId: categories.length > 0 ? categories[0].id.toString() : '',
        sku: '',
        purchasePrice: '',
        sellingPrice: '',
        quantity: '0',
        minStockAlert: '5',
        warrantyMonths: '12',
        notes: '',
        status: 'active'
      });
    }
    setSelectedComponentId('');
    setSelectedComponentQty('1');
    setIsProductFormOpen(true);
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!permissions.products.delete) {
      toast.error('عذراً، ليس لديك حيز لحذف المنتجات من النظام');
      return;
    }
    toast(`هل أنت متأكد من حذف المنتج الشمسي "${name}"؟`, {
      action: {
        label: 'تأكيد',
        onClick: async () => {
          try {
            await api.deleteProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
            toast.success('تم الحذف بنجاح');
          } catch (err: any) {
            toast.error(err.message || 'فشل حذف المنتج');
          }
        },
      },
      cancel: {
        label: 'إلغاء',
        onClick: () => {},
      },
    });
  };

  // Categories submit
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      setActionLoading(true);
      if (editingCategoryId) {
        const updated = await api.updateCategory(editingCategoryId, categoryName);
        setCategories(prev => prev.map(c => c.id === editingCategoryId ? updated : c));
      } else {
        const created = await api.createCategory(categoryName);
        setCategories(prev => [...prev, created]);
      }
      setCategoryName('');
      setEditingCategoryId(null);
      // Optional: don't close so they can add more, or do close:
      // setIsCategoryFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ في معالجة فئات التصنيفات');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setCategoryName(cat.name);
    setIsCategoryFormOpen(true);
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    toast(`هل ترغب بحذف التصنيف الفني "${name}"؟ لن تتأثر مكونات المنتجات المرتبطة به.`, {
      action: {
        label: 'تأكيد',
        onClick: async () => {
          try {
            await api.deleteCategory(id);
            setCategories(prev => prev.filter(c => c.id !== id));
            toast.success('تم حذف التصنيف');
          } catch (err: any) {
            toast.error(err.message || 'حدث خطأ في عملية حذف التصنيف');
          }
        },
      },
      cancel: {
        label: 'إلغاء',
        onClick: () => {},
      },
    });
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategoryFilter === 'all' || p.categoryId.toString() === selectedCategoryFilter;
    return matchesCategory;
  });

  return (
    <div className="space-y-8 animate-fade-in relative z-10 pb-12 max-w-screen-2xl mx-auto">
      
      {/* Title */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-200/50 liquid-icon-wrapper shrink-0">
            <Package className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">إدارة المخزون والمنتجات</h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">نظام مراقبة البضائع، المنظومات الجاهزة، وأسعار التجهيز.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(permissions.products.create || permissions.products.edit || permissions.products.delete) && (
            <button 
              onClick={() => { setEditingCategoryId(null); setCategoryName(''); setIsCategoryFormOpen(true); }}
              className="px-5 py-2.5 bg-white/60 hover:bg-white text-slate-700 hover:text-slate-900 transition-all text-sm font-bold rounded-xl flex items-center gap-2 border border-white shadow-sm"
            >
              <LayoutGrid className="w-4 h-4 text-slate-500" />
              التصنيفات
            </button>
          )}
          {permissions.products.create && (
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleOpenProductForm(null, false)} 
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 text-white" />
                إدراج منتج
              </button>
              <button 
                onClick={() => handleOpenProductForm(null, true)} 
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-amber-200/50 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-white" />
                منظومة متكاملة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FILTER BUTTONS & MAIN SEARCH BAR */}
      <div className="glass-card p-5 rounded-[2rem] shadow-lg flex flex-col gap-5 border border-white/80">
        
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-amber-500 pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none shadow-inner transition-all text-slate-800 placeholder-slate-400"
            placeholder="البحث بالرمز التعريفي للمنتج (SKU)، اسم الموديل، الماركة..."
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
              selectedCategoryFilter === 'all' 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200 border-amber-500' 
                : 'bg-white/40 text-slate-600 hover:bg-white/80 hover:text-slate-900 border-white/60'
            }`}
          >
            الكل ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter(p => p.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id.toString())}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                  selectedCategoryFilter === cat.id.toString() 
                    ? 'bg-slate-900 text-amber-400 shadow-md border-slate-900' 
                    : 'bg-white/40 text-slate-600 hover:bg-white/80 hover:text-slate-900 border-white/60'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* PRODUCTS DIRECTORY LIST GRID */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm font-bold flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري سحب المخزون...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg border border-white/50">
          لا توجد منتجات مطابقة في هذا التصنيف حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((p) => {
            const catName = categories.find(c => c.id === p.categoryId)?.name || 'تصنيف فرعي';
            const isLow = p.quantity <= p.minStockAlert;
            const isDisabled = p.status === 'disabled';

            const dynamicQty = getDynamicQty(p);
            const isSystem = p.notes && p.notes.startsWith('BUNDLE:');
            const isLowStock = !isSystem && dynamicQty <= p.minStockAlert;

            return (
              <div 
                key={p.id} 
                className={`glass-card rounded-[2rem] border p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 ${
                  isDisabled ? 'border-dashed border-slate-300 opacity-70 bg-slate-50/50' : isLowStock ? 'border-rose-200/80 bg-rose-50/20' : 'border-white/80'
                }`}
              >
                
                {/* Status Indicator */}
                {isDisabled && (
                  <div className="absolute top-0 left-0 bg-slate-600/90 backdrop-blur-md text-white text-[10px] font-black px-4 py-1.5 rounded-br-2xl uppercase tracking-widest shadow-sm">
                    مجمّد مؤقتاً
                  </div>
                )}
                {isLowStock && !isDisabled && (
                  <div className="absolute top-0 left-0 bg-rose-500/90 backdrop-blur-md text-white text-[10px] font-black px-4 py-1.5 rounded-br-2xl flex items-center gap-1.5 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5 animate-spin-slow" />
                    تنبيه: مخزون حرج!
                  </div>
                )}
                {isSystem && (
                  <div className="absolute top-0 right-0 bg-purple-500/90 backdrop-blur-md text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl shadow-sm tracking-wider">
                    منظومة متكاملة
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 items-center">
                      {/* Product Vector Thumbnail */}
                      <div className="w-16 h-16 rounded-2xl bg-white/60 flex items-center justify-center shrink-0 border border-white shadow-sm group-hover:scale-105 transition-transform">
                        <ProductAsset name={p.name} size={42} />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 bg-white/60 border border-slate-100 px-3 py-1 rounded-lg font-black shadow-sm">{catName}</span>
                        <h3 className="font-black text-sm text-slate-900 mt-3 line-clamp-2 leading-relaxed group-hover:text-amber-600 transition-colors">{p.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono font-bold mt-1 block tracking-wider">SKU: {p.sku || p.SKU}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantitative numbers */}
                  <div className="flex flex-col gap-3 mt-6 bg-white/40 p-4 rounded-2xl border border-white shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold">سعر التكلفة:</span>
                      <span className="text-sm font-black font-mono text-slate-800 tracking-tighter">{formatIQD(p.purchasePrice)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                      <span className="text-[10px] text-slate-500 font-bold">سعر المبيع:</span>
                      <span className="text-sm font-black font-mono text-amber-600 tracking-tighter">{formatIQD(p.sellingPrice)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-5">
                    <span className="text-slate-600 font-bold">الكمية المتاحة للبيع:</span>
                    <span className={`font-black px-3 py-1 rounded-xl shadow-sm border ${
                      isLowStock ? 'bg-rose-50 text-rose-700 border-rose-100 font-mono text-sm' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>{isSystem ? `${dynamicQty} طقم` : `${p.quantity} قطعة`}</span>
                  </div>
                </div>

                {/* Display components for system package */}
                {isSystem && (
                  (() => {
                    try {
                      const parsed = JSON.parse(p.notes.substring(7));
                      const items = parsed.items || [];
                      return (
                        <div className="mt-5 p-3 bg-white/60 rounded-2xl border border-white text-[10px] text-slate-600 space-y-2 shadow-sm max-h-32 overflow-y-auto custom-scrollbar">
                          <span className="font-black text-slate-800 block border-b border-slate-200/50 pb-1 mb-2">مكونات المنظومة:</span>
                          <div className="grid grid-cols-1 gap-1.5 font-bold">
                            {items.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-white/50 px-2 py-1.5 rounded-lg border border-slate-100/50">
                                <span className="truncate max-w-[150px]">{it.name}</span>
                                <span className="font-black text-purple-700 font-mono">×{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } catch (e) { return null; }
                  })()
                )}

                <div className="border-t border-white/60 pt-4 mt-5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 bg-white/50 px-2 py-1 rounded-lg border border-slate-100">ضمان: {p.warrantyMonths || 12} شهر</span>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    {permissions.products.edit && (
                      <button 
                        onClick={() => handleOpenProductForm(p)}
                        className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition-colors shadow-sm border border-amber-100"
                        title="تعديل السجل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {permissions.products.delete && (
                      <button 
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-colors shadow-sm border border-rose-100"
                        title="حذف المنتج"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalCount > limit && (
        <div className="flex items-center justify-between p-4 border-t border-white/40 glass-card rounded-[2rem] shadow-sm">
          <span className="text-xs text-slate-500 font-bold px-4">
            عرض {(page - 1) * limit + 1} إلى {Math.min(page * limit, totalCount)} من {totalCount} منتج
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => { setPage(p => p - 1); loadData(page - 1, searchQuery); }} 
              disabled={page === 1}
              className="px-4 py-2 bg-white/50 text-slate-700 font-bold text-xs rounded-xl hover:bg-white disabled:opacity-50 transition-colors border border-white"
            >
              السابق
            </button>
            <button 
              onClick={() => { setPage(p => p + 1); loadData(page + 1, searchQuery); }} 
              disabled={page * limit >= totalCount}
              className="px-4 py-2 bg-white/50 text-slate-700 font-bold text-xs rounded-xl hover:bg-white disabled:opacity-50 transition-colors border border-white"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* CATEGORY DIALOG DRAWER */}
      {isCategoryFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-[95%] max-w-lg glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-8 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h3 className="font-black text-base flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-amber-500"/> إدارة التصنيفات والهيكلة</h3>
              <button onClick={() => setIsCategoryFormOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-2 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white/60">
              
              {/* Category form input */}
              {permissions.products.create && (
              <form onSubmit={handleCategorySubmit} className="flex gap-3 mb-8 bg-white/80 p-3 rounded-2xl shadow-sm border border-white">
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-inner"
                  placeholder="اسم تصنيف جديد..."
                  required
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-slate-900 hover:bg-slate-950 text-white px-6 py-3 rounded-xl text-sm font-black disabled:opacity-50 flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  ) : editingCategoryId ? 'تحديث' : 'إضافة'}
                </button>
              </form>
              )}

              {/* Category current lists */}
              <h4 className="font-black text-sm text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200/50">
                التصنيفات المتاحة حالياً
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-white shadow-sm hover:shadow-md transition-shadow">
                    <span className="font-black text-slate-800">{cat.name}</span>
                    <div className="flex gap-2">
                      {permissions.products.edit && (
                      <button 
                        onClick={() => handleEditCategory(cat)}
                        className="p-2 bg-slate-50 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors border border-slate-100 hover:border-blue-200 rounded-xl"
                      >
                        <Edit className="w-4 h-4"/>
                      </button>
                      )}
                      {permissions.products.delete && (
                      <button 
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors border border-rose-100 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PRODUCT CREATE OR EDIT FORM DRAWER */}
      {isProductFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-[95%] max-w-3xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 md:px-8 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h3 className="font-black text-base flex items-center gap-2">
                {editingProductId 
                  ? (isSystemProduct ? <><Sparkles className="w-5 h-5 text-purple-400"/> تعديل المنظومة الجاهزة</> : <><Package className="w-5 h-5 text-amber-500"/> تعديل سجل المنتج</>) 
                  : (isSystemProduct ? <><Sparkles className="w-5 h-5 text-purple-400"/> إنشاء منظومة جاهزة للبيع</> : <><Package className="w-5 h-5 text-amber-500"/> إضافة منتج أو قطعة للمخزن</>)
                }
              </h3>
              <button onClick={() => setIsProductFormOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-2 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-black text-slate-800 mb-2">
                    {isSystemProduct ? 'اسم المنظومة الجاهزة *' : 'اسم المنتج المعتمد للتجهيز والفواتير *'}
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm transition-all"
                    placeholder={isSystemProduct ? "مثال: منظومة 9 أمبير اقتصادية" : "مثال: بطارية ليثيوم كورية فيرست نكست 150 أمبير 48 فولت"}
                    required
                  />
                </div>

                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-2">التصنيف الفني الفرعي *</label>
                      <select
                        value={productForm.categoryId}
                        onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm transition-all appearance-none"
                        required
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-2">الرمز التعريفي الفريد (SKU) *</label>
                      <input
                        type="text"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm transition-all text-slate-700"
                        placeholder="PV-SL-100"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-2">سعر الشراء والتكلفة (IQD) *</label>
                      <input
                        type="number"
                        value={productForm.purchasePrice}
                        onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono font-black focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-inner transition-all text-slate-800"
                        placeholder="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-2">سعر المبيع المعتمد (IQD) *</label>
                      <input
                        type="number"
                        value={productForm.sellingPrice}
                        onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                        className="w-full bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 font-mono font-black focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-inner transition-all text-amber-900"
                        placeholder="0"
                        required
                      />
                    </div>

                {!isSystemProduct && (
                  <div>
                    <label className="block text-sm font-black text-slate-800 mb-2">الكمية الأولية بالمخزن *</label>
                    <input
                      type="number"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-mono font-black focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm transition-all text-slate-700"
                      placeholder="0"
                      required
                    />
                  </div>
                )}

                {isSystemProduct && (
                  <div className="sm:col-span-2 border-t border-slate-200/60 pt-6 mt-2 space-y-4">
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 bg-white/50 p-3 rounded-xl border border-white shadow-sm inline-flex">
                      <LayoutGrid className="w-5 h-5 text-purple-600" />
                      تعريف مكونات المنظومة الجاهزة (Bill of Materials) *
                    </h4>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-end bg-white/80 p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-600 mb-2">اختر القطعة/المنتج المكون:</label>
                        <select
                          value={selectedComponentId}
                          onChange={(e) => setSelectedComponentId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none shadow-sm"
                        >
                          <option value="">-- اختر قطعة --</option>
                          {products
                            .filter(p => p.id !== editingProductId && !(p.notes && p.notes.startsWith('BUNDLE:')))
                            .map(p => (
                              <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku || p.SKU})</option>
                            ))}
                        </select>
                      </div>
                      
                      <div className="w-full sm:w-32">
                        <label className="block text-xs font-bold text-slate-600 mb-2">الكمية لكل منظومة:</label>
                        <input
                          type="number"
                          min="1"
                          value={selectedComponentQty}
                          onChange={(e) => setSelectedComponentQty(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-center font-mono font-black focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={addComponentItem}
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-black px-6 py-3 rounded-xl text-sm transition-all shadow-md active:scale-95"
                      >
                        إضافة
                      </button>
                    </div>

                    {/* Component Items List */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-right text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black">
                            <th className="p-4 w-1/2">المكون / القطعة</th>
                            <th className="p-4 text-center">الكمية المسحوبة</th>
                            <th className="p-4 text-left">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold">
                          {systemItems.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-6 text-center text-slate-400 bg-slate-50/50">لا توجد مكونات مضافة للمنظومة بعد. اختر قطعاً من الأعلى.</td>
                            </tr>
                          ) : (
                            systemItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition">
                                <td className="p-4 text-slate-800">{item.name}</td>
                                <td className="p-4 text-center font-mono font-black text-purple-700 bg-purple-50/30">{item.quantity}</td>
                                <td className="p-4 text-left">
                                  <button
                                    type="button"
                                    onClick={() => removeComponentItem(item.productId)}
                                    className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl bg-rose-50 border border-rose-100 transition-colors shadow-sm"
                                  >
                                    <Trash2 className="w-4 h-4"/>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!isSystemProduct && (
                  <>
                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-2">حد تنبيه نفاذ المخزن</label>
                      <input
                        type="number"
                        value={productForm.minStockAlert}
                        onChange={(e) => setProductForm({ ...productForm, minStockAlert: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm transition-all"
                        placeholder="5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-2">الضمان بالأشهر (Warranty)</label>
                      <input
                        type="number"
                        value={productForm.warrantyMonths}
                        onChange={(e) => setProductForm({ ...productForm, warrantyMonths: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm transition-all"
                        placeholder="12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-2">حالة التوفر والعرض</label>
                      <select
                        value={productForm.status}
                        onChange={(e) => setProductForm({ ...productForm, status: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm transition-all appearance-none"
                      >
                        <option value="active">متاح ويدخل المبيعات</option>
                        <option value="disabled">معطل ومجمد العرض</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-black text-slate-800 mb-2">شروح ومواصفات إضافية (اختياري)</label>
                      <textarea
                        value={productForm.notes}
                        onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none h-24 resize-none shadow-inner custom-scrollbar"
                        placeholder="شرح التقنيات، كفاءة الألواح، عدد دورات تفريغ بطاريات الليثيوم..."
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-4 justify-end pt-6 mt-4 border-t border-slate-200/50">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsProductFormOpen(false)}
                  className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold border border-slate-200 shadow-sm transition-all disabled:opacity-50"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-black rounded-xl shadow-lg shadow-amber-200 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5"/>
                      <span>اعتماد وحفظ البيانات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
