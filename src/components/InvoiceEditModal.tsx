import React, { useState, useEffect, useRef } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import { X, Save, Trash2, Package, Tag, Hash, Calculator, FileText, CreditCard, Search, Plus, Minus, ShoppingCart } from 'lucide-react';

const parseJsonArray = (val: any): any[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) { /* ignore */ }
  }
  return [];
};

interface InvoiceEditModalProps {
  invoice: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceEditModal({ invoice, onClose, onSuccess }: InvoiceEditModalProps) {
  const [items, setItems] = useState<any[]>(() => {
    return JSON.parse(JSON.stringify(parseJsonArray(invoice.items)));
  });
  const [manualFinalTotal, setManualFinalTotal] = useState<string>(() => {
    const calcBase = parseJsonArray(invoice.items).reduce((acc: number, val: any) => acc + ((val.sellingPrice || 0) * (val.quantity || 1)), 0);
    if (invoice.discount && invoice.discount > 0) {
      return (calcBase - invoice.discount).toString();
    }
    return '';
  });
  const [notes, setNotes] = useState<string>(invoice.notes || '');
  const [mastercardFee, setMastercardFee] = useState<number>(invoice.mastercardFee || 0);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  // New State for Products Search
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch products
    api.getProducts(1, 1000, '').then(res => setProducts(res.data || [])).catch(() => {});
    api.getCategories().then(res => setCategories(res || [])).catch(() => {});
    
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    // Prevent body scroll when modal open
    document.body.style.overflow = 'hidden';
    
    // Outside click for search dropdown
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => { 
      document.body.style.overflow = ''; 
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const calculatedTotal = items.reduce((acc, val) => acc + (val.sellingPrice * val.quantity), 0);
  const baseFinalPayable = manualFinalTotal !== '' ? (parseInt(manualFinalTotal) || 0) : calculatedTotal;
  const calculatedDiscount = calculatedTotal - baseFinalPayable;
  const finalAmount = baseFinalPayable + (invoice.invoiceType === 'mastercard' ? mastercardFee : 0);

  const updateQty = (idx: number, delta: number) => {
    setItems(prev => prev.map((it, i) => {
      if (i === idx) {
        const newQty = it.quantity + delta;
        return newQty > 0 ? { ...it, quantity: newQty } : it;
      }
      return it;
    }));
  };

  const setExactQty = (idx: number, qty: number) => {
    if (qty <= 0) return;
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: qty } : it));
  };

  const updatePrice = (idx: number, price: number) => {
    if (price < 0) return;
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, sellingPrice: price } : it));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.categoryId?.toString() === selectedCategory.toString();
    return matchesSearch && matchesCat && p.quantity > 0;
  });

  const addItemToInvoice = (prod: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === prod.id);
      if (existing) {
        return prev.map(i => i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [{ productId: prod.id, name: prod.name, sellingPrice: prod.sellingPrice, quantity: 1 }, ...prev];
    });
    toast.success('تمت إضافة المنتج للفاتورة');
  };

  const handleSave = async () => {
    if (items.length === 0) return toast.error('لا يمكن ترك الفاتورة فارغة');
    try {
      setLoading(true);
      await api.updateInvoice(invoice.id, {
        customerId: invoice.customerId,
        invoiceType: invoice.invoiceType,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, sellingPrice: i.sellingPrice })),
        discount: calculatedDiscount,
        note: notes,
        mastercardFee,
      });
      toast.success('تم تحديث الفاتورة بنجاح ✓');
      window.dispatchEvent(new CustomEvent('refresh_erp_notifications'));
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'فشل التعديل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: visible ? 'rgba(2,6,23,0.75)' : 'rgba(2,6,23,0)',
        backdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
        transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(251,191,36,0.15)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(24px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
          overflow: 'hidden',
          direction: 'rtl',
        }}
      >
        {/* ─── Header ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.06) 100%)',
          borderBottom: '1px solid rgba(251,191,36,0.18)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
            }}>
              <FileText size={18} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '2px' }}>
                تعديل فاتورة
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 700, fontFamily: 'monospace' }}>
                {invoice.invoiceNumber}
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '34px', height: '34px', borderRadius: '8px',
              border: '1px solid rgba(148,163,184,0.2)',
              background: 'rgba(148,163,184,0.08)',
              color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease', flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
              (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(148,163,184,0.08)';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(148,163,184,0.2)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Scrollable Body ─── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 22px',
          display: 'flex', flexDirection: 'column', gap: '20px',
          minHeight: 0,
        }}>
          {/* Items Section */}
          {/* ─── Search Bar ─── */}
          <div ref={searchRef} style={{ position: 'relative', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '12px', padding: '12px 16px', transition: 'all 0.2s' }}>
              <Search size={18} color="#f59e0b" />
              <input
                type="text"
                placeholder="ابحث عن منتج لإضافته (بالاسم أو الرمز)..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0',
                  width: '100%', padding: '0 12px', fontSize: '15px', fontWeight: 600
                }}
              />
            </div>
            
            {isDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                background: '#1e293b', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '14px',
                maxHeight: '350px', display: 'flex', flexDirection: 'column', zIndex: 50,
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
              }}>
                {/* Category Filter */}
                {categories.length > 0 && (
                  <div style={{
                    display: 'flex', gap: '8px', padding: '12px',
                    borderBottom: '1px solid rgba(71,85,105,0.4)',
                    overflowX: 'auto', flexShrink: 0
                  }} className="custom-scrollbar">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      style={{
                        padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
                        background: selectedCategory === 'all' ? '#f59e0b' : 'rgba(71,85,105,0.3)',
                        color: selectedCategory === 'all' ? '#000' : '#e2e8f0',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      الكل
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        style={{
                          padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
                          background: selectedCategory === cat.id ? '#f59e0b' : 'rgba(71,85,105,0.3)',
                          color: selectedCategory === cat.id ? '#000' : '#e2e8f0',
                          border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>لا توجد منتجات مطابقة للبحث أو القسم المحدد</div>
                  ) : (
                    filteredProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => addItemToInvoice(p)}
                        style={{
                          padding: '14px 16px', borderBottom: '1px solid rgba(71,85,105,0.2)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          cursor: 'pointer', transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '15px' }}>{p.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px', display: 'flex', gap: '10px' }}>
                            <span style={{ background: 'rgba(71,85,105,0.3)', padding: '2px 6px', borderRadius: '4px' }}>الرمز: {p.sku}</span>
                            <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', padding: '2px 6px', borderRadius: '4px' }}>المتاح: {p.quantity}</span>
                          </div>
                        </div>
                        <div style={{ color: '#34d399', fontWeight: 800, fontSize: '15px', direction: 'ltr', background: 'rgba(52,211,153,0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                          {formatIQD(p.sellingPrice)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Items Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Package size={15} color="#f59e0b" />
              <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                البنود ({items.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(30,41,59,0.8)',
                    border: '1px solid rgba(71,85,105,0.4)',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    transition: 'border-color 0.2s',
                    display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center'
                  }}
                >
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                      <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '15px' }}>{it.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>سعر الوحدة:</span>
                      <input
                        type="text" inputMode="numeric" value={it.sellingPrice ? Number(it.sellingPrice).toLocaleString('en-US') : ''}
                        onChange={e => updatePrice(idx, parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                        style={{
                          background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(71,85,105,0.5)',
                          borderRadius: '8px', padding: '6px 10px', color: '#fbbf24',
                          fontWeight: 700, fontSize: '13px', width: '120px', outline: 'none', direction: 'ltr'
                        }}
                      />
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15,23,42,0.6)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(71,85,105,0.4)' }}>
                    <button
                      onClick={() => updateQty(idx, 1)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    ><Plus size={16} /></button>
                    
                    <input
                      type="number" min="1" value={it.quantity}
                      onChange={e => setExactQty(idx, parseInt(e.target.value) || 1)}
                      style={{
                        width: '50px', background: 'transparent', border: 'none',
                        color: '#e2e8f0', fontWeight: 800, fontSize: '16px', textAlign: 'center', outline: 'none'
                      }}
                    />
                    
                    <button
                      onClick={() => updateQty(idx, -1)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    ><Minus size={16} /></button>
                  </div>

                  {/* Total & Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
                    <div style={{
                      background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                      borderRadius: '10px', padding: '10px 16px', color: '#fbbf24', fontWeight: 800, fontSize: '16px', direction: 'ltr',
                      minWidth: '120px', textAlign: 'center'
                    }}>
                      {formatIQD(it.sellingPrice * it.quantity)}
                    </div>
                    
                    <button
                      onClick={() => removeItem(idx)}
                      style={{
                        width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)',
                        color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              {items.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', border: '2px dashed rgba(71,85,105,0.4)', borderRadius: '14px', background: 'rgba(15,23,42,0.3)' }}>
                  <ShoppingCart size={32} color="#94a3b8" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>لا توجد منتجات في الفاتورة</div>
                  <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>استخدم شريط البحث بالأعلى لإضافة منتجات</div>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(71,85,105,0.3)', margin: '0 -4px' }} />

          {/* Discount & Mastercard */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.04em' }}>
                <Calculator size={13} />السعر الإجمالي (يدوي)
              </label>
              <input
                type="text"
                placeholder="تلقائي"
                value={manualFinalTotal ? Number(manualFinalTotal).toLocaleString('en-US') : ''}
                onChange={e => {
                  const val = e.target.value.replace(/,/g, '');
                  if (!isNaN(Number(val))) setManualFinalTotal(val);
                }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(71,85,105,0.5)',
                  borderRadius: '10px', padding: '10px 14px',
                  color: '#34d399', fontWeight: 600, fontSize: '14px',
                  textAlign: 'center', outline: 'none',
                  direction: 'ltr', transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(52,211,153,0.08)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(71,85,105,0.5)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {calculatedDiscount > 0 && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#fbbf24', textAlign: 'center', fontWeight: 600 }}>
                  (خصم: {calculatedDiscount.toLocaleString('en-US')} د.ع)
                </div>
              )}
            </div>

            {invoice.invoiceType === 'mastercard' && (
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.04em' }}>
                  <CreditCard size={13} />عمولة ماستركارد (د.ع)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mastercardFee ? Number(mastercardFee).toLocaleString('en-US') : ''}
                  onChange={e => setMastercardFee(parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(71,85,105,0.5)',
                    borderRadius: '10px', padding: '10px 14px',
                    color: '#a78bfa', fontWeight: 600, fontSize: '14px',
                    textAlign: 'center', outline: 'none',
                    direction: 'ltr', transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.08)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(71,85,105,0.5)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.04em' }}>
              <FileText size={13} />الملاحظات
            </label>
            <input
              type="text"
              value={notes}
              placeholder="أضف ملاحظة..."
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(71,85,105,0.5)',
                borderRadius: '10px', padding: '10px 14px',
                color: '#e2e8f0', fontSize: '13px',
                outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(148,163,184,0.5)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(148,163,184,0.06)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(71,85,105,0.5)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Grand Total */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))',
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: '14px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>الإجمالي المعدّل</span>
            <span style={{ color: '#fbbf24', fontSize: '20px', fontWeight: 800, fontFamily: 'monospace', direction: 'ltr' }}>
              {formatIQD(finalAmount)}
            </span>
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
          padding: '16px 22px',
          borderTop: '1px solid rgba(71,85,105,0.3)',
          background: 'rgba(15,23,42,0.5)',
          flexShrink: 0,
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '9px 20px', borderRadius: '10px',
              border: '1px solid rgba(71,85,105,0.5)',
              background: 'rgba(71,85,105,0.15)',
              color: '#94a3b8', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(71,85,105,0.3)';
              (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(71,85,105,0.15)';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
            }}
          >
            إلغاء
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '9px 24px', borderRadius: '10px',
              border: 'none',
              background: loading ? 'rgba(245,158,11,0.5)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#0f172a', fontSize: '13px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(245,158,11,0.35)',
              transition: 'all 0.15s ease',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(245,158,11,0.5)';
            }}
            onMouseLeave={e => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(245,158,11,0.35)';
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '14px', height: '14px', border: '2px solid rgba(15,23,42,0.4)',
                  borderTopColor: '#0f172a', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={14} />
                حفظ التعديلات
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
