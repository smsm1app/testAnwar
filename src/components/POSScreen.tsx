/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { IRAQ_GEOGRAPHY } from '../iraqGeography';
import { toast } from 'sonner';
import {
  ShoppingBag, Trash2, Plus, UserPlus, Receipt, Percent,
  HelpCircle, DollarSign, FileText, CheckCircle2, User, Sparkles, X, Search, CreditCard, Calendar
} from 'lucide-react';
import ProductAsset from './ProductAsset';

interface POSScreenProps {
  permissions: any;
  user: any;
  onInvoiceCreated: () => void;
  isDarkTheme?: boolean;
}

export default function POSScreen({ permissions, user, onInvoiceCreated, isDarkTheme = false }: POSScreenProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [posMode, setPosMode] = useState<'all' | 'parts' | 'systems'>('all');

  // Active Sale Invoice state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<'cash' | 'partial' | 'installment' | 'mastercard'>('cash');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [manualFinalTotal, setManualFinalTotal] = useState<string>('');
  const [mastercardFee, setMastercardFee] = useState<string>('');
  const [downPayment, setDownPayment] = useState<number>(0);
  const [installmentMonths, setInstallmentMonths] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');

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

  // Quick Add Customer in POS Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [quickGov, setQuickGov] = useState('بغداد');
  const [quickDistrict, setQuickDistrict] = useState('الكرخ');
  const [quickRegion, setQuickRegion] = useState('');

  const loadPOSData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const custRes = await api.getCustomers().catch(() => []);
      const prodRes = await api.getProducts().catch(() => []);
      setCustomers(custRes);
      // Keep all products in state to allow bundle components lookup, filter in catalog
      setProducts(prodRes);
    } catch (err: any) {
      toast.error('فشل في تهيئة المعطيات لنقاط البيع');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadPOSData();
  }, []);

  // Cart operations
  const addToCart = (product: any) => {
    const dynamicQty = getDynamicQty(product);
    const existing = cartItems.find(item => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= dynamicQty) {
        toast.warning(`عذراً، أقصى كمية متوفرة في المستودعات حالياً هي: ${dynamicQty} وحدة`);
        return;
      }
      setCartItems(cartItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (dynamicQty < 1) {
        toast.warning('هذا المنتج غير متوفر كفاية في رصيد المخزن حالياً لإضافته لمبيعات الفاتورة');
        return;
      }
      setCartItems([...cartItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        maxStock: dynamicQty
      }]);
    }
  };

  const updateQuantity = (productId: number, qty: number) => {
    const item = cartItems.find(i => i.productId === productId);
    if (!item) return;

    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    const targetProduct = products.find(p => p.id === productId);
    const maxStock = targetProduct ? getDynamicQty(targetProduct) : item.maxStock;

    if (qty > maxStock) {
      toast.warning(`الطلب يتجاوز التوافر المخزني، المتاح كحد أقصى: ${maxStock} وحدة`);
      return;
    }

    setCartItems(cartItems.map(i =>
      i.productId === productId ? { ...i, quantity: qty, maxStock } : i
    ));
  };

  const updatePrice = (productId: number, newPrice: number) => {
    setCartItems(cartItems.map(i =>
      i.productId === productId ? { ...i, sellingPrice: newPrice } : i
    ));
  };

  const removeFromCart = (productId: number) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  // Calculations
  const calculatedTotal = cartItems.reduce((acc, val) => acc + (val.sellingPrice * val.quantity), 0);
  const baseFinalPayable = manualFinalTotal !== '' ? (parseInt(manualFinalTotal) || 0) : calculatedTotal;
  const mcFee = invoiceType === 'mastercard' ? (parseInt(mastercardFee) || 0) : 0;
  const finalPayable = baseFinalPayable + mcFee;
  const actualDiscount = calculatedTotal - baseFinalPayable;
  const remainingValue = (invoiceType === 'installment' || invoiceType === 'partial')
    ? Math.max(0, finalPayable - downPayment)
    : 0;

  // Real-time Estimated Profit calculation
  const totalCost = cartItems.reduce((acc, val) => acc + (val.purchasePrice * val.quantity), 0);
  const estimatedProfit = (finalPayable - mcFee) - totalCost;

  // Form handlers
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name || !quickCustomer.phone || !quickRegion.trim()) {
      toast.error('يرجى إدخال بيانات العميل');
      return;
    }

    const combinedAddress = `${quickGov} - ${quickDistrict} - ${quickRegion.trim()}`;

    try {
      setActionLoading(true);
      const added = await api.createCustomer({
        ...quickCustomer,
        address: combinedAddress
      });
      toast.success('تم إضافة العميل بنجاح.');
      setCustomers(prev => [...prev, added]);
      setSelectedCustomerId(added.id.toString());
      setIsQuickCustomerOpen(false);
      setQuickCustomer({ name: '', phone: '', address: '' });
      setQuickRegion('');
    } catch (err: any) {
      toast.error(err.message || 'فشل الحفظ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessSale = async () => {
    if (!selectedCustomerId) {
      toast.error('يرجى تحديد العميل.');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('السلة فارغة!');
      return;
    }

    if ((invoiceType === 'installment' || invoiceType === 'partial') && downPayment >= finalPayable) {
      toast.error('مبلغ المقدمة يجب أن يكون أقل من القيمة الكلية للفاتورة');
      return;
    }

    try {
      setActionLoading(true);
      await api.createInvoice({
        customerId: parseInt(selectedCustomerId),
        invoiceType,
        items: cartItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          sellingPrice: i.sellingPrice
        })),
        discount: actualDiscount,
        downPayment,
        installmentType: invoiceType,
        mastercardFee: mcFee,
        installmentMonths,
        note: notes
      });

      toast.success('تم تسجيل الفاتورة بنجاح.');

      // Reset POS Terminal state
      setCartItems([]);
      setManualFinalTotal('');
      setMastercardFee('');
      setDownPayment(0);
      setInstallmentMonths(5);
      setNotes('');
      // Trigger update on stats in parents
      onInvoiceCreated();
      // Silently sync stock without flashing POS screen
      loadPOSData(true);
    } catch (err: any) {
      toast.error(err.message || 'حدثت مشكلة أثناء تسجيل الفاتورة الفنية');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 animate-fade-in relative z-10 max-w-screen-2xl mx-auto pb-12 h-full">

      {/* 1. LEFT SIDE: PRODUCTS PICKER BLOCK (7 Cols) */}
      <div className="lg:col-span-7 glass-card rounded-[2.5rem] p-5 md:p-8 shadow-xl flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 shrink-0 pb-5 border-b border-white/50 gap-4">
          <h2 className="font-black text-slate-800 text-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md liquid-icon-wrapper-fast shrink-0">
              <ShoppingBag className="text-white w-5 h-5" />
            </div>
            منتجات ومستلزمات المستودع
          </h2>
          <div className="relative flex-1 sm:max-w-xs">
            <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-amber-500 pointer-events-none">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl py-3 pr-12 pl-4 text-sm font-semibold focus:outline-none shadow-sm transition-all placeholder-slate-400"
              placeholder="ابحث عن منتج بالاسم أو الرمز..."
            />
          </div>
        </div>

        {/* Mode Selector Tabs (Individual Parts vs Systems Package) */}
        <div className="grid grid-cols-3 gap-2 mb-6 shrink-0 bg-white/40 p-2 rounded-2xl border border-white/80 shadow-inner">
          <button
            type="button"
            onClick={() => setPosMode('all')}
            className={`py-3 px-2 text-xs font-black rounded-xl transition-all cursor-pointer ${posMode === 'all' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
          >
            جميع المعروضات
          </button>
          <button
            type="button"
            onClick={() => setPosMode('parts')}
            className={`py-3 px-2 text-xs font-black rounded-xl transition-all cursor-pointer ${posMode === 'parts' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
          >
            بيع قطع مفردة
          </button>
          <button
            type="button"
            onClick={() => setPosMode('systems')}
            className={`py-3 px-2 text-xs font-black rounded-xl transition-all cursor-pointer ${posMode === 'systems' ? 'bg-purple-500 text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
          >
            منظومات متكاملة
          </button>
        </div>

        {/* Directory cards */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:gap-5 pb-4">
            {products
              .filter(p => {
                if (p.status !== 'active') return false;
                const isSystem = p.notes && p.notes.startsWith('BUNDLE:');
                const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                  (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
                const matchesMode = posMode === 'all' ||
                  (posMode === 'parts' && !isSystem) ||
                  (posMode === 'systems' && isSystem);
                return matchesSearch && matchesMode;
              })
              .map((p) => {
                const inCart = cartItems.find(i => i.productId === p.id);
                const dynamicQty = getDynamicQty(p);
                const isSystem = p.notes && p.notes.startsWith('BUNDLE:');
                const isLow = !isSystem && dynamicQty < 3;
                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`p-4 sm:p-5 rounded-[1.5rem] border cursor-pointer select-none transition-all duration-300 flex flex-col justify-between group overflow-hidden relative shadow-sm ${inCart ? 'border-amber-400 bg-amber-50 shadow-[0_0_20px_rgba(245,158,11,0.2)] -translate-y-1' : 'border-white bg-white/60 hover:bg-white/90 hover:shadow-lg hover:-translate-y-1'
                      }`}
                  >
                    {inCart && <div className="absolute inset-0 bg-amber-400/5 pointer-events-none rounded-[1.5rem]"></div>}
                    
                    {/* Product Vector Banner */}
                    <div className={`w-full h-28 sm:h-32 shrink-0 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border transition-transform group-hover:scale-[1.03] ${inCart ? 'bg-amber-100/50 border-amber-200/50' : 'bg-slate-50 border-slate-100/60'}`}>
                      <ProductAsset name={p.name} size={64} className="group-hover:scale-110 transition-transform duration-500 ease-out drop-shadow-sm" />
                    </div>

                    <div className="flex-1 flex flex-col relative z-10">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <span className="text-[10px] bg-slate-100/80 text-slate-500 px-2.5 py-1 rounded-lg font-mono font-bold leading-none shadow-sm border border-slate-200/50 truncate max-w-full">SKU: {p.sku || p.SKU}</span>
                        {isLow && (
                          <span className="text-[9px] bg-rose-100 text-rose-700 px-2 py-1 rounded-lg font-black leading-none shadow-sm border border-rose-200 whitespace-nowrap">محدود جداً</span>
                        )}
                        {isSystem && (
                          <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-black leading-none shadow-sm border border-purple-200 whitespace-nowrap">منظومة</span>
                        )}
                      </div>
                      <h4 className="font-black text-sm sm:text-base text-slate-800 mt-3 line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors break-words">{p.name}</h4>

                      {/* Component list preview */}
                      {isSystem && (
                        (() => {
                          try {
                            const parsed = JSON.parse(p.notes.substring(7));
                            const items = parsed.items || [];
                            return (
                              <div className="mt-3 p-2.5 bg-white/50 rounded-xl border border-white text-[10px] text-slate-600 space-y-1 max-h-24 overflow-y-auto custom-scrollbar font-bold">
                                {items.map((it: any, idx: number) => (
                                  <div key={idx} className="flex flex-wrap justify-between items-center bg-white/40 px-2 py-1 rounded border border-slate-100/50 gap-2">
                                    <span className="truncate flex-1 min-w-[60px]">{it.name}</span>
                                    <span className="font-black text-purple-700 whitespace-nowrap">×{it.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch (e) { return null; }
                        })()
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between border-t border-white/60 pt-4 mt-4 shrink-0 relative z-10 gap-2">
                      <span className="text-sm sm:text-base font-mono font-black text-slate-900 tracking-tighter truncate max-w-full" title={formatIQD(p.sellingPrice)}>{formatIQD(p.sellingPrice)}</span>
                      <div className="flex items-center gap-1.5 text-left bg-white/60 px-2.5 py-1.5 rounded-lg border border-slate-100 whitespace-nowrap mt-1 sm:mt-0">
                        <span className="text-[10px] text-slate-500 font-bold">المتاح:</span>
                        <span className={`text-[10px] sm:text-xs font-black ${isLow ? 'text-rose-600 font-mono' : 'text-emerald-600'}`}>
                          {isSystem ? `${dynamicQty} طقم` : `${dynamicQty} قطعة`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 2. RIGHT SIDE: CART TERMINAL AND SALES TERMS (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6 h-[calc(100vh-6rem)] relative z-10">

        {/* Upper Client Selecor & Terms wrapper */}
        <div className="glass-card rounded-[2.5rem] p-5 md:p-8 shadow-xl flex flex-col flex-1 overflow-y-auto custom-scrollbar justify-between border border-white/80">

          <div className="flex-1 flex flex-col overflow-visible">
            <h3 className="font-black text-slate-800 text-sm mb-5 flex items-center justify-between shrink-0 pb-3 border-b border-white/50">
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500"/>
                الفاتورة وأسس السداد
              </span>
              <button
                onClick={() => setIsQuickCustomerOpen(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 transition-all flex items-center gap-1.5 font-bold shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" /> مستخدم جديد
              </button>
            </h3>

            {/* Select Customer */}
            <div className="relative mb-5 shrink-0">
              <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 pointer-events-none">
                <User className="w-5 h-5" />
              </span>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl py-3 pr-12 pl-4 text-sm font-bold text-slate-800 shadow-sm transition-all focus:outline-none appearance-none"
              >
                <option value="">-- اختر من قائمة المشتركين --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            {/* Select Invoice Payment Terms type */}
            <div className="grid grid-cols-4 gap-2 mb-5 shrink-0 bg-white/40 p-2 rounded-2xl border border-white shadow-inner">
              <button
                onClick={() => setInvoiceType('cash')}
                className={`py-3 px-1 text-[11px] font-black rounded-xl transition-all ${invoiceType === 'cash' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
                  }`}
              >
                نقد
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType('partial')}
                className={`py-3 px-1 rounded-xl text-[11px] font-black transition-all ${invoiceType === 'partial' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-600 hover:text-blue-700 hover:bg-white'
                  }`}
              >
                ذمم
              </button>
              <button
                onClick={() => setInvoiceType('installment')}
                className={`py-3 px-1 text-[11px] font-black rounded-xl transition-all ${invoiceType === 'installment' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:text-amber-700 hover:bg-white'
                  }`}
              >
                أقساط
              </button>
              <button
                onClick={() => setInvoiceType('mastercard')}
                className={`py-3 px-1 text-[11px] font-black rounded-xl transition-all ${invoiceType === 'mastercard' ? 'bg-purple-500 text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:text-purple-700 hover:bg-white'
                  }`}
              >
                بطاقة
              </button>
            </div>

            {/* Selected items in cart */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 border-y border-white/50 py-4 min-h-[250px]">
              {cartItems.length === 0 ? (
                <div className="text-center py-16 text-slate-400 font-bold text-sm bg-white/30 rounded-2xl border border-white/50 shadow-inner">
                  سلة الشراء الكهروضوئية فارغة حالياً...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white shadow-sm bg-white/60">
                  <table className="w-full text-right whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-100/50 border-b border-slate-200">
                        <th className="p-3 font-black text-slate-800 text-sm">المادة / النظام</th>
                        <th className="p-3 font-black text-slate-800 text-sm w-24">السعر</th>
                        <th className="p-3 font-black text-slate-800 text-sm w-24 text-center">الكمية</th>
                        <th className="p-3 font-black text-slate-800 text-sm w-12 text-center">إلغاء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {cartItems.map((item, index) => (
                        <tr key={index} className="hover:bg-white/80 transition-colors">
                          <td className="p-3">
                            <h5 className="font-bold text-slate-800 text-sm whitespace-normal leading-relaxed">{item.name}</h5>
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="text"
                              value={item.sellingPrice ? Number(item.sellingPrice).toLocaleString('en-US') : ''}
                              onChange={(e) => updatePrice(item.productId, parseInt(e.target.value.replace(/,/g, '')) || 0)}
                              className="w-24 bg-white border border-slate-200 text-center rounded-xl py-1.5 text-sm font-mono font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner text-emerald-600"
                              dir="ltr"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              value={item.quantity}
                              min="1"
                              max={item.maxStock}
                              onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-16 bg-white border border-slate-200 text-center rounded-xl py-1.5 text-sm font-mono font-black focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="p-1.5 mx-auto text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors shadow-sm bg-rose-50 border border-rose-100 hover:border-rose-500 block"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Settle parameters and check details */}
          <div className="shrink-0 mt-5 space-y-4 text-sm bg-white/60 p-6 rounded-3xl border border-white shadow-sm font-medium">

            {/* Manual Final Total entry */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 font-bold">
                <div className="p-1.5 bg-slate-100 rounded-lg"><DollarSign className="w-4 h-4 text-slate-500" /></div>
                النهائي المتفق عليه:
              </span>
              <input
                type="text"
                value={manualFinalTotal ? Number(manualFinalTotal).toLocaleString('en-US') : ''}
                onChange={(e) => setManualFinalTotal(e.target.value.replace(/,/g, ''))}
                className="w-36 bg-white border border-slate-200 py-2.5 px-3 text-left rounded-xl text-sm font-mono font-black focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                placeholder={calculatedTotal.toLocaleString('en-US')}
                dir="ltr"
              />
            </div>

            {/* MasterCard Additional Amount */}
            {invoiceType === 'mastercard' && (
              <div className="flex items-center justify-between animate-fade-in border-t border-slate-100 pt-4 mt-2">
                <span className="flex items-center gap-2 text-purple-700 font-black">
                  <div className="p-1.5 bg-purple-100 rounded-lg"><CreditCard className="w-4 h-4 text-purple-600" /></div>
                  رسوم الماستركارد:
                </span>
                <input
                  type="text"
                  value={mastercardFee ? Number(mastercardFee).toLocaleString('en-US') : ''}
                  onChange={(e) => setMastercardFee(e.target.value.replace(/,/g, ''))}
                  className="w-36 bg-purple-50 border border-purple-200 py-2.5 px-3 text-left rounded-xl text-sm font-mono font-black text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                  placeholder="0"
                  dir="ltr"
                />
              </div>
            )}

            {/* Down Payment entry for installments and partial */}
            {(invoiceType === 'installment' || invoiceType === 'partial') && (
              <div className="flex items-center justify-between animate-fade-in border-t border-slate-100 pt-4 mt-2">
                <span className="flex items-center gap-2 text-slate-700 font-bold">
                  <div className="p-1.5 bg-emerald-100 rounded-lg"><DollarSign className="w-4 h-4 text-emerald-600" /></div>
                  {invoiceType === 'partial' ? 'الدفعة المقبوضة:' : 'المقدمة:'}
                </span>
                <input
                  type="text"
                  value={downPayment ? Number(downPayment).toLocaleString('en-US') : ''}
                  onChange={(e) => setDownPayment(Math.max(0, parseInt(e.target.value.replace(/,/g, '')) || 0))}
                  className="w-36 bg-emerald-50 border border-emerald-200 py-2.5 px-3 text-left rounded-xl text-sm font-mono font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner text-emerald-900"
                  placeholder="0"
                  dir="ltr"
                />
              </div>
            )}

            {/* Installment Months entry */}
            {invoiceType === 'installment' && (
              <div className="flex items-center justify-between animate-fade-in border-t border-slate-100 pt-4 mt-2">
                <span className="flex items-center gap-2 text-slate-700 font-bold">
                  <div className="p-1.5 bg-amber-100 rounded-lg"><Calendar className="w-4 h-4 text-amber-600" /></div>
                  مدة التقسيط (أشهر):
                </span>
                <input
                  type="number"
                  value={installmentMonths}
                  onChange={(e) => setInstallmentMonths(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-36 bg-amber-50 border border-amber-200 py-2.5 px-3 text-left rounded-xl text-sm font-mono font-black focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner text-amber-900"
                  placeholder="5"
                />
              </div>
            )}

            {/* Note entry */}
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
              <span className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                <FileText className="w-4 h-4 text-slate-400" />
                ملاحظات الفاتورة وتفاصيل التوصيل:
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 py-3 px-4 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner resize-none h-16 custom-scrollbar"
                placeholder="تثبيت أي شروط أو ملحوظات للتركيب..."
              />
            </div>

            {/* Calculations summaries */}
            <div className="pt-5 border-t border-white/50 space-y-3">
              <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                <span className="text-slate-500 font-bold text-xs">مجموع بنود الفاتورة:</span>
                <span className="font-mono font-bold text-slate-700 text-sm tracking-wider">{formatIQD(calculatedTotal)}</span>
              </div>
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-white shadow-sm">
                <span className="text-slate-800 font-black">الصافي المطلوب سداده:</span>
                <span className="font-mono font-black text-slate-900 text-lg tracking-tighter">{formatIQD(finalPayable)}</span>
              </div>
              
              {(invoiceType === 'installment' || invoiceType === 'partial') && (
                <div className="flex justify-between items-center bg-rose-50/80 p-4 rounded-2xl border border-rose-200 mt-3 shadow-sm">
                  <span className="text-rose-700 font-black">{invoiceType === 'partial' ? 'المتبقي (ذمم):' : 'المتبقي (ذمم/أقساط):'}</span>
                  <span className="font-mono font-black text-rose-800 text-lg tracking-tighter">{formatIQD(remainingValue)}</span>
                </div>
              )}

              {invoiceType === 'installment' && remainingValue > 0 && installmentMonths > 0 && (
                <div className="flex justify-between items-center bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200 mt-3 shadow-sm">
                  <span className="text-indigo-700 font-black">القسط التقريبي ({installmentMonths} أشهر):</span>
                  <span className="font-mono font-black text-indigo-800 text-lg tracking-tighter">{formatIQD(Math.round(remainingValue / installmentMonths))}</span>
                </div>
              )}

              {/* Profit Indicator - ONLY visible to full admin / managers */}
              {user.position === 'مدير النظام' && (
                <div className="flex justify-between items-center text-teal-800 bg-teal-50/80 border border-teal-200 p-3 rounded-xl mt-4 text-xs font-bold shadow-sm">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-500 animate-pulse" />
                    هامش الربح الإداري المقدر:
                  </span>
                  <span className="font-mono font-black text-sm tracking-wider">{formatIQD(estimatedProfit)}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleProcessSale}
              disabled={loading || actionLoading || cartItems.length === 0 || !selectedCustomerId}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white py-4 mt-6 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-200 cursor-pointer disabled:opacity-50 transition-all text-sm active:scale-95"
            >
              {actionLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  إصدار الفاتورة وتخريج المستودع
                </>
              )}
            </button>

          </div>

        </div>

      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-md glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-4 flex items-center justify-between border-b border-white/10">
              <h4 className="font-black text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-amber-500"/> تسجيل سريع لعميل</h4>
              <button onClick={() => setIsQuickCustomerOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickCustomerSubmit} className="p-6 md:p-8 space-y-5 text-sm bg-white/60">
              <div>
                <label className="block font-black text-slate-800 mb-2">اسم العميل الثلاثي <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={quickCustomer.name}
                  onChange={(e) => setQuickCustomer({ ...quickCustomer, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition-all"
                  placeholder="الاسم الثلاثي"
                  required
                />
              </div>
              <div>
                <label className="block font-black text-slate-800 mb-2">رقم هاتف الاتصال <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={quickCustomer.phone}
                  onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-right font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition-all"
                  placeholder="077XXXXXXXX"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-slate-800 mb-2">المحافظة <span className="text-rose-500">*</span></label>
                  <select
                    value={quickGov}
                    onChange={(e) => {
                      const newGov = e.target.value;
                      setQuickGov(newGov);
                      setQuickDistrict(IRAQ_GEOGRAPHY[newGov]?.[0] || '');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition-all"
                    required
                  >
                    {Object.keys(IRAQ_GEOGRAPHY).map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-2">القضاء <span className="text-rose-500">*</span></label>
                  <select
                    value={quickDistrict}
                    onChange={(e) => setQuickDistrict(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition-all"
                    required
                  >
                    {(IRAQ_GEOGRAPHY[quickGov] || []).map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-black text-slate-800 mb-2">المنطقة والحي (أقرب دالة) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={quickRegion}
                  onChange={(e) => setQuickRegion(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition-all"
                  placeholder="مثال: زقاق 12، قرب السوق العصري"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-5 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-white text-slate-700 rounded-xl font-bold border border-slate-200 shadow-sm transition-all"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-black rounded-xl shadow-lg shadow-amber-200 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                      <span>جاري...</span>
                    </>
                  ) : (
                    <span>تأكيد وحفظ</span>
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
