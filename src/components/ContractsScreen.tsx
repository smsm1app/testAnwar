/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import { 
  FileSignature, Plus, Search, Eye, Edit2, Trash2, Printer, X, FileText, CheckCircle2, Download, Image as ImageIcon
} from 'lucide-react';
import { toBlob } from 'html-to-image';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-4 h-4"}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);


interface ContractsScreenProps {
  permissions: any;
}

export default function ContractsScreen({ permissions }: ContractsScreenProps) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // View states
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);

  const defaultForm = {
    customerId: '',
    invoiceId: '',
    contractDate: new Date().toISOString().slice(0, 10),
    systemType: '',
    panelCount: 0,
    panelWattage: '',
    batteryCount: 0,
    batteryType: '',
    inverterCount: 0,
    inverterType: '',
    contractTotal: 0,
    paidAmount: 0,
    remainingAmount: 0,
    panelWarranty: '',
    batteryWarranty: '',
    inverterWarranty: '',
    isLegacy: false,
    manualCustomerName: '',
    manualCustomerPhone: '',
    manualCustomerAddress: '',
    manualInvoiceNumber: '',
    includePanels: true,
    includeBatteries: true,
    includeInverter: true
  };

  const [form, setForm] = useState(defaultForm);
  const isLegacyMode = form.isLegacy;

  const loadData = async () => {
    try {
      setLoading(true);
      const [contractsRes, custRes, invRes, settingsRes] = await Promise.all([
        api.getContracts().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getInvoices().catch(() => []),
        api.getSettings().catch(() => ({}))
      ]);
      setContracts(Array.isArray(contractsRes) ? contractsRes : []);
      setCustomers(Array.isArray(custRes) ? custRes : []);
      setInvoices(Array.isArray(invRes) ? invRes : []);
      setSettings(settingsRes || {});
    } catch (error: any) {
      toast.error('فشل في تحميل بيانات العقود');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCustomerChange = (customerId: string) => {
    const customerInvoices = invoices.filter(i => i.customerId === parseInt(customerId));
    if (customerInvoices.length > 0) {
      const latestInvoice = customerInvoices[0];
      setForm(prev => ({
        ...prev,
        customerId,
        invoiceId: latestInvoice.id.toString(),
        contractTotal: latestInvoice.finalAmount || 0,
        paidAmount: (latestInvoice.finalAmount || 0) - (latestInvoice.remainingAmount || 0),
        remainingAmount: latestInvoice.remainingAmount || 0
      }));
    } else {
      setForm(prev => ({ ...prev, customerId, invoiceId: '' }));
    }
  };

  const handleInvoiceChange = (invoiceId: string) => {
    const selectedInvoice = invoices.find(i => i.id === parseInt(invoiceId));
    if (selectedInvoice) {
      setForm(prev => ({
        ...prev,
        invoiceId,
        contractTotal: selectedInvoice.finalAmount || 0,
        paidAmount: (selectedInvoice.finalAmount || 0) - (selectedInvoice.remainingAmount || 0),
        remainingAmount: selectedInvoice.remainingAmount || 0
      }));
    } else {
      setForm(prev => ({ ...prev, invoiceId }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLegacyMode && !form.customerId) {
      toast.error('يرجى اختيار العميل');
      return;
    }
    if (isLegacyMode && !form.manualCustomerName?.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }

    try {
      setActionLoading(true);

      const payload: any = {
        ...form,
        panelCount: form.includePanels ? form.panelCount : 0,
        panelWattage: form.includePanels ? form.panelWattage : '',
        panelWarranty: form.includePanels ? form.panelWarranty : '',
        batteryCount: form.includeBatteries ? form.batteryCount : 0,
        batteryType: form.includeBatteries ? form.batteryType : '',
        batteryWarranty: form.includeBatteries ? form.batteryWarranty : '',
        inverterCount: form.includeInverter ? form.inverterCount : 0,
        inverterType: form.includeInverter ? form.inverterType : '',
        inverterWarranty: form.includeInverter ? form.inverterWarranty : '',
        isLegacy: form.isLegacy,
        contractDate: form.contractDate,
        customerId: isLegacyMode ? null : parseInt(form.customerId),
        invoiceId: isLegacyMode ? null : (form.invoiceId ? parseInt(form.invoiceId) : null),
      };
      delete payload.includePanels;
      delete payload.includeBatteries;
      delete payload.includeInverter;

      if (editingId) {
        const updated = await api.updateContract(editingId, payload);
        setContracts(prev => prev.map(c => c.id === editingId ? updated : c));
        toast.success('تم تحديث العقد بنجاح');
        setActiveView('list');
        setEditingId(null);
        resetForm();
      } else {
        const created = await api.createContract(payload);
        setContracts(prev => [created, ...prev]);
        toast.success('تم إنشاء العقد بنجاح');
        setEditingId(created.id);
        // Keep form data so preview renders correctly
        setActiveView('preview');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء حفظ العقد');
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setForm(defaultForm);
  };

  const startEdit = (contract: any) => {
    setEditingId(contract.id);
    
    let parsedDate = '';
    if (contract.createdAt) {
      const d = new Date(contract.createdAt);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      parsedDate = d.toISOString().slice(0, 10);
    } else {
      parsedDate = new Date().toISOString().slice(0, 10);
    }

    setForm({
      customerId: contract.customerId?.toString() || '',
      invoiceId: contract.invoiceId?.toString() || '',
      contractDate: parsedDate,
      systemType: contract.systemType || '',
      panelCount: contract.panelCount || 0,
      panelWattage: contract.panelWattage || '',
      batteryCount: contract.batteryCount || 0,
      batteryType: contract.batteryType || '',
      inverterCount: contract.inverterCount || 0,
      inverterType: contract.inverterType || '',
      contractTotal: contract.contractTotal || 0,
      paidAmount: contract.paidAmount || 0,
      remainingAmount: contract.remainingAmount || 0,
      panelWarranty: contract.panelWarranty || '',
      batteryWarranty: contract.batteryWarranty || '',
      inverterWarranty: contract.inverterWarranty || '',
      isLegacy: contract.isLegacy || false,
      manualCustomerName: contract.manualCustomerName || '',
      manualCustomerPhone: contract.manualCustomerPhone || '',
      manualCustomerAddress: contract.manualCustomerAddress || '',
      manualInvoiceNumber: contract.manualInvoiceNumber || '',
      includePanels: (contract.panelCount > 0) || (contract.panelWattage !== ''),
      includeBatteries: (contract.batteryCount > 0) || (contract.batteryType !== ''),
      includeInverter: (contract.inverterCount > 0) || (contract.inverterType !== '')
    });
    setActiveView('editor');
  };

  const handleDelete = (id: number) => {
    toast('هل أنت متأكد من حذف هذا العقد؟', {
      action: {
        label: 'حذف',
        onClick: async () => {
          try {
            setActionLoading(true);
            await api.deleteContract(id);
            setContracts(prev => prev.filter(c => c.id !== id));
            toast.success('تم الحذف بنجاح');
          } catch (err: any) {
            toast.error('فشل حذف العقد');
          } finally {
            setActionLoading(false);
          }
        }
      },
      cancel: { label: 'إلغاء', onClick: () => {} }
    });
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    let pNum = (phone || '').replace(/\D/g, '');
    if (pNum.startsWith('0')) {
      pNum = '964' + pNum.substring(1);
    } else if (pNum.length === 10 && !pNum.startsWith('964')) {
      pNum = '964' + pNum;
    }
    return pNum;
  };

  const handleShareWhatsAppImage = async (contractObj?: any) => {
    const currentContract = contractObj || (editingId 
      ? contracts.find(c => c.id === editingId) 
      : { ...form, contractNumber: 'مسودة-جديدة', createdAt: new Date().toISOString() });

    const effectiveLegacy = contractObj ? contractObj.isLegacy : (isLegacyMode || currentContract?.isLegacy);
    const customer = effectiveLegacy
      ? { 
          name: contractObj?.manualCustomerName || form.manualCustomerName || currentContract?.manualCustomerName,
          phone: contractObj?.manualCustomerPhone || form.manualCustomerPhone || currentContract?.manualCustomerPhone,
        }
      : customers.find(c => c.id === parseInt(contractObj?.customerId || form.customerId || currentContract?.customerId || '0'));

    const rawPhone = customer?.phone || currentContract?.manualCustomerPhone || form.manualCustomerPhone || '';
    const formattedPhone = formatPhoneForWhatsApp(rawPhone);

    // If sharing from list, set editingId to render preview
    if (contractObj && contractObj.id) {
      setEditingId(contractObj.id);
      setActiveView('preview');
      await new Promise(r => setTimeout(r, 300));
    }

    const node = document.getElementById('contract-export-image-node') || document.getElementById('contract-printable-page');
    if (!node) {
      toast.error('يرجى فتح معاينة العقد لتوليد الصورة');
      return;
    }

    try {
      setActionLoading(true);
      toast.info('جاري تحويل العقد إلى صورة عالية الدقة وفتح محادثة العميل...');

      const rawBlob = await toBlob(node, { quality: 0.95, pixelRatio: 2, cacheBust: true });
      if (!rawBlob) throw new Error('فشل إنشاء ملف الصورة');

      // Ensure explicit image/png type for ClipboardItem
      const blob = new Blob([await rawBlob.arrayBuffer()], { type: 'image/png' });

      const contractNum = currentContract?.contractNumber || 'عقد';
      const fileName = `عقد_${contractNum}.png`;

      // 1. Copy image to Clipboard
      let copied = false;
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        copied = true;
      } catch (clipErr) {
        console.error('Clipboard write error:', clipErr);
      }

      // 2. Download file as backup
      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 3. Open WhatsApp Chat
      if (formattedPhone) {
        const waUrl = `https://wa.me/${formattedPhone}`;
        window.open(waUrl, '_blank');
        if (copied) {
          toast.success('✅ تم فتح محادثة العميل ونسخ الصورة! اضغط (Ctrl + V) في الواتساب لإرسال العقد.', { duration: 8000 });
        } else {
          toast.success('تم فتح المحادثة وتحميل الصورة على جهازك. يمكنك سحب الصورة وإفلاتها في المحادثة.', { duration: 8000 });
        }
      } else {
        toast.warning('تم حفظ ونسخ صورة العقد. يرجى اختيار محادثة العميل في الواتساب ولصق الصورة (Ctrl + V).');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء إعداد صورة العقد: ' + (err.message || ''));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveContractImage = async (contractObj?: any) => {
    const currentContract = contractObj || (editingId 
      ? contracts.find(c => c.id === editingId) 
      : { ...form, contractNumber: 'مسودة-جديدة', createdAt: new Date().toISOString() });

    if (contractObj && contractObj.id) {
      setEditingId(contractObj.id);
      setActiveView('preview');
      await new Promise(r => setTimeout(r, 250));
    }

    const node = document.getElementById('contract-export-image-node') || document.getElementById('contract-printable-page');
    if (!node) {
      toast.error('يرجى فتح معاينة العقد أولاً لحفظ الصورة');
      return;
    }

    try {
      setActionLoading(true);
      toast.info('جاري تحويل وتنزيل العقد كصورة عالية الدقة...');

      const blob = await toBlob(node, { quality: 0.95, pixelRatio: 2, cacheBust: true });
      if (!blob) throw new Error('فشل إنشاء ملف الصورة');

      const contractNum = currentContract?.contractNumber || 'عقد';
      const fileName = `عقد_${contractNum}.png`;

      // Copy to clipboard for easy manual paste anywhere
      try {
        const clipboardItem = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([clipboardItem]);
      } catch (clipErr) {
        console.warn('Clipboard write failed:', clipErr);
      }

      // Download image file directly to user device without redirecting
      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();

      toast.success('تم حفظ وتنزيل صورة العقد بنجاح على جهازك (ونسخها للحافظة) 🖼️', { duration: 5000 });
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ صورة العقد');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareWhatsAppText = (contractObj?: any) => {
    const c = contractObj || (editingId 
      ? contracts.find(c => c.id === editingId) 
      : { ...form, contractNumber: 'مسودة-جديدة', createdAt: new Date().toISOString() });

    const effectiveLegacy = contractObj ? contractObj.isLegacy : (isLegacyMode || c?.isLegacy);
    const customer = effectiveLegacy
      ? { 
          name: contractObj?.manualCustomerName || form.manualCustomerName || c?.manualCustomerName,
          phone: contractObj?.manualCustomerPhone || form.manualCustomerPhone || c?.manualCustomerPhone,
        }
      : customers.find(cust => cust.id === parseInt(contractObj?.customerId || form.customerId || c?.customerId || '0'));

    const rawPhone = customer?.phone || c?.manualCustomerPhone || '';
    const formattedPhone = formatPhoneForWhatsApp(rawPhone);

    const contractTotal = c?.contractTotal || form.contractTotal || 0;
    const paidAmount = c?.paidAmount || form.paidAmount || 0;
    const remainingAmount = c?.remainingAmount || form.remainingAmount || 0;
    const systemType = c?.systemType || form.systemType || 'غير محدد';
    const contractNum = c?.contractNumber || '---';

    let msg = `📝 *عقد تجهيز وتنصيب منظومة طاقة شمسية*\n`;
    msg += `-----------------------------------\n`;
    msg += `📄 *رقم العقد:* ${contractNum}\n`;
    msg += `👤 *العميل:* ${customer?.name || '---'}\n`;
    msg += `⚙️ *المنظومة:* ${systemType}\n`;

    if (c?.panelCount || form.panelCount) {
      msg += `☀️ *الألواح:* ${c?.panelCount || form.panelCount} لوح (${c?.panelWattage || form.panelWattage || ''})\n`;
    }
    if (c?.inverterType || form.inverterType || c?.inverterCount || form.inverterCount) {
      const invCountStr = (c?.inverterCount || form.inverterCount) ? `${c?.inverterCount || form.inverterCount} ` : '';
      msg += `⚡ *الإنفيرتر:* ${invCountStr}${c?.inverterType || form.inverterType || ''}\n`;
    }
    if (c?.batteryCount || form.batteryCount) {
      msg += `🔋 *البطاريات:* ${c?.batteryCount || form.batteryCount} بطارية (${c?.batteryType || form.batteryType || ''})\n`;
    }

    msg += `-----------------------------------\n`;
    msg += `💰 *إجمالي العقد:* ${formatIQD(contractTotal)}\n`;
    msg += `✅ *الواصل (المقدم):* ${formatIQD(paidAmount)}\n`;
    msg += `📌 *المتبقي (الذمة):* ${formatIQD(remainingAmount)}\n`;
    msg += `-----------------------------------\n`;
    msg += `🏢 *${settings?.companyName || 'شركة أنوار الإبداع لمنظومات الطاقة الشمسية'}*\n`;
    msg += `📞 *تواصل معنا:* ${settings?.companyPhone || '07711223344'}`;

    const urlEncodedText = encodeURIComponent(msg);
    const waUrl = formattedPhone 
      ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${urlEncodedText}`
      : `https://api.whatsapp.com/send?text=${urlEncodedText}`;

    window.open(waUrl, '_blank');
  };

  const getContractCustomerName = (c: any) => {
    if (c.isLegacy) return c.manualCustomerName || '---';
    const customer = customers.find(cust => cust.id === c.customerId);
    return customer?.name || '---';
  };

  const filteredContracts = contracts.filter(c => {
    const customerName = getContractCustomerName(c);
    const customer = !c.isLegacy ? customers.find(cust => cust.id === c.customerId) : null;
    const searchString = `${c.contractNumber} ${customerName} ${customer?.phone || c.manualCustomerPhone || ''}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  // Calculate live remaining
  useEffect(() => {
    setForm(prev => ({ ...prev, remainingAmount: prev.contractTotal - prev.paidAmount }));
  }, [form.contractTotal, form.paidAmount]);

  const renderPrintableContract = (isForExport = false) => {
    const currentContract = editingId 
      ? contracts.find(c => c.id === editingId) 
      : { ...form, contractNumber: 'مسودة-جديدة', createdAt: new Date().toISOString() };

    const effectiveLegacy = isLegacyMode || currentContract?.isLegacy;
    const customer = effectiveLegacy
      ? { 
          name: form.manualCustomerName || currentContract?.manualCustomerName,
          phone: form.manualCustomerPhone || currentContract?.manualCustomerPhone,
          address: form.manualCustomerAddress || currentContract?.manualCustomerAddress
        }
      : customers.find(c => c.id === parseInt(form.customerId || currentContract?.customerId || '0'));

    return (
      <div 
        id={isForExport ? "contract-export-image-node" : "contract-printable-page"} 
        className={`bg-white text-slate-900 relative font-sans contract-print-page overflow-hidden flex flex-col ${
          isForExport ? 'w-[800px] p-8 shadow-none m-0 border-0' : 'w-full max-w-[21cm] mx-auto min-h-full px-10 py-6 shadow-2xl'
        }`}
      >
        
        {/* Watermark Background */}
        <div className="absolute inset-0 z-0 flex justify-center items-center pointer-events-none">
          <img src="/images/anwar-logo.png" alt="Watermark" className="w-full max-w-[19cm] object-contain opacity-[0.25]" />
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-3 relative z-10 shrink-0">
          <div className="flex flex-col gap-0.5 w-1/3">
            <h1 className="text-xl font-black text-slate-900 leading-tight">{settings.companyName || 'شركة أنوار الإبداع'}</h1>
            <h2 className="text-xs font-bold text-slate-600">لمنظومات الطاقة الشمسية</h2>
            <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
              <p>العنوان: {settings.companyAddress || 'بغداد - كمب سارة'}</p>
              <p>الهاتف: {settings.companyPhone || '07711223344'}</p>
            </div>
          </div>
          <div className="w-1/3 flex justify-center">
             <img src="/images/anwar-logo-dark.png" alt="Logo" className="h-16 object-contain opacity-90" />
          </div>
          <div className="w-1/3 text-left">
            <div className="inline-block bg-slate-50 border border-slate-200 p-2 rounded-xl text-right shadow-sm">
              <p className="font-bold text-xs text-slate-800 mb-1">رقم العقد: <span className="font-mono text-red-600">{currentContract?.contractNumber || '---'}</span></p>
              <p className="font-bold text-xs text-slate-800 flex items-center justify-end gap-1">
                التاريخ: 
                <span className="font-mono min-w-[70px] text-center">
                  {new Date(form.contractDate || currentContract?.createdAt || new Date()).toLocaleDateString('en-GB')}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-4 relative z-10 shrink-0">
          <h2 className="text-xl font-black inline-block border-b-[3px] border-slate-800 pb-1 px-8 shadow-sm bg-white rounded-t-xl">عقد تجهيز وتنصيب منظومة طاقة شمسية</h2>
        </div>

        {/* Introduction */}
        <div className="text-xs font-bold leading-relaxed mb-4 text-justify relative z-10 bg-slate-50 border border-slate-200 p-2.5 rounded-xl shrink-0">
          <p>
            بعون الله تعالى، تم الاتفاق بين <span className="font-black text-red-700">الطرف الأول (شركة أنوار الإبداع لمنظومات الطاقة الشمسية)</span> وبين <span className="font-black text-red-700">الطرف الثاني السيد/ة: ( {customer?.name || '________________'} )</span> على تجهيز وتنصيب منظومة طاقة شمسية حسب المواصفات الفنية المذكورة أدناه.
          </p>
        </div>

        {/* Specifications Grid */}
        {((form.systemType || currentContract?.systemType) ||
          (form.inverterType || currentContract?.inverterType) ||
          ((form.panelCount || currentContract?.panelCount) > 0) ||
          (form.panelWattage || currentContract?.panelWattage) ||
          ((form.batteryCount || currentContract?.batteryCount) > 0) ||
          (form.batteryType || currentContract?.batteryType)) && (
          <div className="mb-4 border border-slate-300 rounded-xl overflow-hidden shadow-sm relative z-10 bg-white shrink-0">
            <div className="bg-slate-100 px-4 py-1.5 border-b border-slate-300 font-black text-slate-800 text-[11px]">المواصفات الفنية للمنظومة</div>
            <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-200 text-[11px] font-bold">
              {(form.systemType || currentContract?.systemType) && (
                <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">نوع المنظومة:</span>
                  <span className="text-slate-900">{form.systemType || currentContract?.systemType}</span>
                </div>
              )}
              {((form.inverterCount || currentContract?.inverterCount) > 0) && (
                <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">عدد الإنفيرترات:</span>
                  <span className="text-slate-900 font-mono">{form.inverterCount || currentContract?.inverterCount} إنفيرتر</span>
                </div>
              )}
              {(form.inverterType || currentContract?.inverterType) && (
                <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">نوع الإنفيرتر:</span>
                  <span className="text-slate-900">{form.inverterType || currentContract?.inverterType}</span>
                </div>
              )}
              {((form.panelCount || currentContract?.panelCount) > 0) && (
                <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">عدد الألواح:</span>
                  <span className="text-slate-900 font-mono">{form.panelCount || currentContract?.panelCount} لوح</span>
                </div>
              )}
              {(form.panelWattage || currentContract?.panelWattage) && (
                <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">قدرة اللوح:</span>
                  <span className="text-slate-900">{form.panelWattage || currentContract?.panelWattage} W</span>
                </div>
              )}
              {((form.batteryCount || currentContract?.batteryCount) > 0) && (
                <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">عدد البطاريات:</span>
                  <span className="text-slate-900 font-mono">{form.batteryCount || currentContract?.batteryCount} بطارية</span>
                </div>
              )}
              {(form.batteryType || currentContract?.batteryType) && (
                <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">نوع البطارية:</span>
                  <span className="text-slate-900">{form.batteryType || currentContract?.batteryType}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financials */}
        <div className="mb-4 flex gap-3 relative z-10 shrink-0">
          <div className="flex-1 border-[2px] border-slate-800 rounded-xl p-2 text-center bg-slate-50">
            <p className="text-[10px] font-bold text-slate-500 mb-0.5">قيمة العقد الكلية</p>
            <p className="text-sm font-black text-slate-900 font-mono" dir="ltr">{formatIQD(form.contractTotal || currentContract?.contractTotal || 0)}</p>
          </div>
          <div className="flex-1 border border-emerald-500 rounded-xl p-2 text-center bg-emerald-50">
            <p className="text-[10px] font-bold text-emerald-600 mb-0.5">المبلغ المدفوع (المقدم)</p>
            <p className="text-sm font-black text-emerald-700 font-mono" dir="ltr">{formatIQD(form.paidAmount || currentContract?.paidAmount || 0)}</p>
          </div>
          <div className="flex-1 border border-rose-500 rounded-xl p-2 text-center bg-rose-50">
            <p className="text-[10px] font-bold text-rose-600 mb-0.5">المبلغ المتبقي (الذمة)</p>
            <p className="text-sm font-black text-rose-700 font-mono" dir="ltr">{formatIQD(form.remainingAmount || currentContract?.remainingAmount || 0)}</p>
          </div>
        </div>

        {/* Warranty */}
        {((form.panelWarranty || currentContract?.panelWarranty) || 
          (form.inverterWarranty || currentContract?.inverterWarranty) || 
          (form.batteryWarranty || currentContract?.batteryWarranty)) && (
          <div className="mb-4 relative z-10 shrink-0">
            <h3 className="text-xs font-black border-b-[2px] border-slate-200 pb-1 mb-2">فترة الضمان والصيانة الشاملة</h3>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-bold">
              {(form.panelWarranty || currentContract?.panelWarranty) && (
                <li className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[9px]">ضمان الألواح</span>
                  <span className="text-slate-900">{form.panelWarranty || currentContract?.panelWarranty}</span>
                </li>
              )}
              {(form.inverterWarranty || currentContract?.inverterWarranty) && (
                <li className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[9px]">ضمان الإنفيرتر</span>
                  <span className="text-slate-900">{form.inverterWarranty || currentContract?.inverterWarranty}</span>
                </li>
              )}
              {(form.batteryWarranty || currentContract?.batteryWarranty) && (
                <li className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[9px]">ضمان البطاريات</span>
                  <span className="text-slate-900">{form.batteryWarranty || currentContract?.batteryWarranty}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Terms */}
        <div className="mb-2 space-y-1.5 text-[11px] font-bold text-justify leading-relaxed relative z-10 bg-slate-50 border border-slate-200 p-2.5 rounded-xl shrink-0">
          <p>
            - تتعهد الشركة بتجهيز وتنصيب وتشغيل المنظومة وفق المواصفات المذكورة وبأفضل المعايير الهندسية.
          </p>
          <p className="text-rose-700">
            - يلتزم الطرف الثاني (العميل) بالمحافظة على المنظومة وعدم إجراء أي تعديل أو صيانة من قبل أي جهة غير معتمدة من شركتنا، وبخلاف ذلك يسقط حق المطالبة بالضمان نهائياً.
          </p>
          <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl mt-2 text-amber-900">
            <span className="font-black text-amber-700 mb-0.5 block">ملاحظة هامة:</span>
            السعر النهائي المذكور في هذا العقد <span className="font-black text-rose-600">غير شامل</span> تكلفة تجهيز كيبل AC الممتد من موقع البطاريات والإنفيرتر إلى موقع البورد الخارجي (ATS)، ويتم احتساب هذه التكلفة لاحقاً حسب قياس المستخدم
          </div>
          <p className="text-center font-black mt-2 pt-2 border-t border-slate-200 text-[10px]">
            * يعتبر هذا العقد ملزماً للطرفين من تاريخ التوقيع أدناه *
          </p>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end pt-4 mt-2 relative z-10 shrink-0">
          <div className="text-center space-y-3 w-1/3">
            <p className="font-black text-slate-800 text-xs">الطرف الأول (الشركة)</p>
            <div className="h-8 flex items-end justify-center">
              <span className="text-slate-400 font-medium text-[10px]">التوقيع والختم</span>
            </div>
            <p className="font-bold text-slate-900 text-xs">شركة أنوار الإبداع</p>
          </div>
          
          <div className="text-center space-y-3 w-1/3">
            <p className="font-black text-slate-800 text-xs">الطرف الثاني (العميل)</p>
            <div className="h-8 flex items-end justify-center">
              <span className="text-slate-400 font-medium text-[10px]">توقيع العميل</span>
            </div>
            <p className="font-bold text-slate-900 text-xs">{customer?.name || '_________________'}</p>
          </div>
        </div>
      </div>
    );
  };

  if (activeView === 'list') {
    return (
      <div className="space-y-6 animate-fade-in relative z-10 print:hidden">
        <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200/50 shrink-0">
              <FileSignature className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">العقود القانونية والمواثيق</h1>
              <p className="text-slate-500 text-sm mt-1.5 font-medium">إصدار، طباعة، وتوثيق عقود تجهيز منظومات الطاقة.</p>
            </div>
          </div>
          {permissions.contracts?.create || permissions.invoices?.create ? (
            <div className="flex gap-2">
              <button
                onClick={() => { setForm({...defaultForm, isLegacy: false}); setEditingId(null); setActiveView('editor'); }}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-5 h-5"/> صياغة عقد جديد
              </button>
              <button
                onClick={() => { setForm({...defaultForm, isLegacy: true}); setEditingId(null); setActiveView('editor'); }}
                className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                <FileText className="w-5 h-5"/> صياغة عقد قديم
              </button>
            </div>
          ) : null}
        </div>

        <div className="glass-card p-6 rounded-[2rem] shadow-sm">
          <div className="relative mb-6 max-w-md">
            <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث برقم العقد، اسم العميل، أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-indigo-500/50 rounded-xl py-3 pr-12 pl-4 font-semibold shadow-sm"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/50">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-100/50 text-slate-600 font-black border-b border-white/50">
                <tr>
                  <th className="p-4 rounded-tr-xl">رقم العقد</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">المنظومة</th>
                  <th className="p-4">إجمالي العقد</th>
                  <th className="p-4">تاريخ التحرير</th>
                  <th className="p-4 text-center rounded-tl-xl">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/50">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-bold bg-white/30">لا توجد عقود مسجلة.</td>
                  </tr>
                ) : (
                  filteredContracts.map(c => {
                    const displayName = getContractCustomerName(c);
                    return (
                      <tr key={c.id} className="hover:bg-white/60 transition-colors">
                        <td className="p-4 font-mono font-bold text-indigo-700 text-xs">
                          {c.contractNumber}
                          {c.isLegacy && (
                            <span className="mr-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200">يدوي</span>
                          )}
                        </td>
                        <td className="p-4 font-black text-slate-800">{displayName}</td>
                        <td className="p-4 font-bold text-slate-600 text-xs">
                          <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{c.systemType || 'غير محدد'}</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-800" dir="ltr">{formatIQD(c.contractTotal)}</td>
                        <td className="p-4 font-bold text-slate-500 text-xs">{new Date(c.createdAt).toLocaleDateString('en-GB')}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { startEdit(c); setActiveView('preview'); }}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                              title="طباعة ومعاينة"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSaveContractImage(c)}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                              title="تنزيل وحفظ العقد كصورة PNG على الجهاز (بدون توجيه للواتساب)"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleShareWhatsAppImage(c)}
                              className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                              title="إرسال العقد كصورة عبر الواتساب"
                            >
                              <WhatsAppIcon className="w-4 h-4" />
                            </button>
                            {(permissions.contracts?.edit || permissions.invoices?.edit) && (
                              <button
                                onClick={() => startEdit(c)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                                title="تعديل العقد"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {(permissions.contracts?.delete || permissions.invoices?.delete) && (
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                title="حذف العقد"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- EDITOR VIEW ---
  if (activeView === 'editor') {
    const customerInvs = invoices.filter(i => i.customerId === parseInt(form.customerId || '0'));
    
    return (
      <div className="space-y-6 animate-fade-in print:hidden">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
            <FileText className={isLegacyMode ? 'text-amber-500' : 'text-indigo-500'} />
            {editingId ? 'تحرير العقد' : (isLegacyMode ? 'إضافة عقد قديم (يدوي)' : 'إنشاء عقد جديد')}
            {isLegacyMode && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-200">وضع يدوي</span>}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('preview')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 transition"
            >
              <Eye className="w-4 h-4" /> معاينة الطباعة
            </button>
            <button
              onClick={() => { setActiveView('list'); setEditingId(null); resetForm(); }}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl flex items-center gap-2 transition"
            >
              <X className="w-4 h-4" /> إلغاء
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            
            {/* Customer Information */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-5">
              <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3">معلومات الطرف الثاني (العميل)</h3>
              {isLegacyMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم العميل *</label>
                    <input
                      type="text"
                      value={form.manualCustomerName}
                      onChange={e => setForm({...form, manualCustomerName: e.target.value})}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm"
                      placeholder="الاسم الكامل"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">رقم الهاتف</label>
                    <input
                      type="text"
                      value={form.manualCustomerPhone}
                      onChange={e => setForm({...form, manualCustomerPhone: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm"
                      placeholder="07XX-XXX-XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">العنوان</label>
                    <input
                      type="text"
                      value={form.manualCustomerAddress}
                      onChange={e => setForm({...form, manualCustomerAddress: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm"
                      placeholder="المحافظة - المنطقة - الشارع"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">رقم الفاتورة (اختياري)</label>
                    <input
                      type="text"
                      value={form.manualInvoiceNumber}
                      onChange={e => setForm({...form, manualInvoiceNumber: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm font-mono"
                      placeholder="مثال: INV-2025-0001"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم العميل *</label>
                    <select
                      value={form.customerId}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                      required
                    >
                      <option value="">-- اختر العميل --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ربط بفاتورة (اختياري لسحب المبالغ)</label>
                    <select
                      value={form.invoiceId}
                      onChange={(e) => handleInvoiceChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 font-bold text-sm font-mono"
                      disabled={!form.customerId}
                    >
                      <option value="">-- بدون ربط --</option>
                      {customerInvs.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - {new Date(inv.date || new Date()).toLocaleDateString()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Technical Specifications */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-5">
              <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3">المواصفات الفنية للمنظومة والضمان</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ العقد</label>
                  <input type="date" value={form.contractDate} onChange={e => setForm({...form, contractDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نوع المنظومة بشكل عام</label>
                  <input type="text" value={form.systemType} onChange={e => setForm({...form, systemType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm" placeholder="مثال: 5KW Hybrid System" />
                </div>

                {/* Panels Checkbox & Fields */}
                <div className="md:col-span-2 mt-2 bg-slate-50 border border-slate-200 p-4 rounded-xl transition-all">
                  <label className="flex items-center gap-3 font-black text-slate-800 cursor-pointer w-fit">
                    <input type="checkbox" checked={form.includePanels} onChange={e => setForm({...form, includePanels: e.target.checked})} className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    تضمين ألواح شمسية في العقد
                  </label>
                  {form.includePanels && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-200 animate-fade-in">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">عدد الألواح</label>
                        <input type="number" min="0" value={form.panelCount || ''} placeholder="0" onChange={e => setForm({...form, panelCount: parseInt(e.target.value) || 0})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">قدرة اللوح (Wattage)</label>
                        <input type="text" value={form.panelWattage} onChange={e => setForm({...form, panelWattage: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm" placeholder="مثال: 550W Jinko" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">ضمان الألواح</label>
                        <input type="text" value={form.panelWarranty} onChange={e => setForm({...form, panelWarranty: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm" placeholder="مثال: 10 سنوات" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Inverter Checkbox & Fields */}
                <div className="md:col-span-2 mt-2 bg-slate-50 border border-slate-200 p-4 rounded-xl transition-all">
                  <label className="flex items-center gap-3 font-black text-slate-800 cursor-pointer w-fit">
                    <input type="checkbox" checked={form.includeInverter} onChange={e => setForm({...form, includeInverter: e.target.checked})} className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    تضمين إنفيرتر في العقد
                  </label>
                  {form.includeInverter && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-200 animate-fade-in">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">عدد الإنفيرترات</label>
                        <input type="number" min="0" value={form.inverterCount || ''} placeholder="0" onChange={e => setForm({...form, inverterCount: parseInt(e.target.value) || 0})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">نوع وموديل الإنفيرتر</label>
                        <input type="text" value={form.inverterType} onChange={e => setForm({...form, inverterType: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm" placeholder="مثال: 5KW Deye" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">ضمان الإنفيرتر</label>
                        <input type="text" value={form.inverterWarranty} onChange={e => setForm({...form, inverterWarranty: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm" placeholder="مثال: سنة واحدة" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Batteries Checkbox & Fields */}
                <div className="md:col-span-2 mt-2 bg-slate-50 border border-slate-200 p-4 rounded-xl transition-all">
                  <label className="flex items-center gap-3 font-black text-slate-800 cursor-pointer w-fit">
                    <input type="checkbox" checked={form.includeBatteries} onChange={e => setForm({...form, includeBatteries: e.target.checked})} className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    تضمين بطاريات في العقد
                  </label>
                  {form.includeBatteries && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-200 animate-fade-in">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">عدد البطاريات</label>
                        <input type="number" min="0" value={form.batteryCount || ''} placeholder="0" onChange={e => setForm({...form, batteryCount: parseInt(e.target.value) || 0})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">نوع البطارية</label>
                        <input type="text" value={form.batteryType} onChange={e => setForm({...form, batteryType: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm" placeholder="مثال: 200Ah Lithium" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">ضمان البطاريات</label>
                        <input type="text" value={form.batteryWarranty} onChange={e => setForm({...form, batteryWarranty: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm" placeholder="مثال: سنتان" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* Financial Summary */}
            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white space-y-6">
              <h3 className="font-black text-amber-400 border-b border-white/10 pb-3 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> الأمور المالية</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">القيمة الكلية للعقد (دينار)</label>
                <input type="text" value={form.contractTotal ? form.contractTotal.toLocaleString('en-US') : ''} placeholder="0" onChange={e => { const val = parseInt(e.target.value.replace(/,/g, '')); setForm({...form, contractTotal: isNaN(val) ? 0 : val}); }} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 font-black text-lg focus:ring-2 focus:ring-emerald-500 font-mono" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-2">المبلغ المدفوع (مقدم)</label>
                <input type="text" value={form.paidAmount ? form.paidAmount.toLocaleString('en-US') : ''} placeholder="0" onChange={e => { const val = parseInt(e.target.value.replace(/,/g, '')); setForm({...form, paidAmount: isNaN(val) ? 0 : val}); }} className="w-full bg-white/10 border border-emerald-500/50 rounded-xl p-3 font-black text-lg focus:ring-2 focus:ring-emerald-500 font-mono" dir="ltr" />
              </div>
              <div className="pt-4 border-t border-white/10">
                <label className="block text-xs font-bold text-rose-300 mb-1">المتبقي على العميل (دينار)</label>
                <div className="text-3xl font-black text-white font-mono" dir="ltr">{formatIQD(form.remainingAmount)}</div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-4 mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'جاري الحفظ...' : 'حفظ واستخراج العقد'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // --- PREVIEW / PRINT VIEW ---
  return (
    <div className="flex flex-col h-full bg-slate-200/50 -mx-4 md:-mx-8 -my-4 md:-my-8 print:m-0 print:bg-white print:static print:overflow-visible print:h-auto overflow-hidden relative z-50">
      
      {/* Print Controls Bar */}
      <div className="bg-slate-900 p-4 shadow-xl flex justify-between items-center print:hidden sticky top-0 z-50 rounded-b-3xl overflow-x-auto gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition shrink-0 text-sm"
          >
            <Printer className="w-4 h-4" /> طباعة / تصدير PDF
          </button>

          <button
            onClick={() => handleSaveContractImage()}
            disabled={actionLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition shrink-0 text-sm disabled:opacity-50"
            title="تحميل وحفظ صورة العقد مباشرة على الجهاز وبدون فتح الواتساب"
          >
            <Download className="w-4 h-4" />
            <span>{actionLoading ? 'جاري حفظ الصورة...' : 'حفظ وتنزيل كصورة PNG'}</span>
          </button>

          <button
            onClick={() => handleShareWhatsAppImage()}
            disabled={actionLoading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition shrink-0 text-sm disabled:opacity-50"
            title="نسخ صورة العقد والتوجه للواتساب"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>إرسال عبر الواتساب</span>
          </button>

          <button
            onClick={() => handleShareWhatsAppText()}
            className="px-4 py-2.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-700/60 font-bold rounded-xl flex items-center gap-2 transition shrink-0 text-xs"
            title="إرسال ملخص العقد كرسالة نصية على الواتساب"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
            <span>إرسال نصياً</span>
          </button>

          <button
            onClick={() => setActiveView('editor')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center gap-2 transition shrink-0 text-xs"
          >
            <Edit2 className="w-4 h-4" /> تعديل
          </button>
        </div>
        <button
          onClick={() => { setActiveView('list'); setEditingId(null); resetForm(); }}
          className="p-2.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* The Printable Page Canvas (Screen Preview) */}
      <div className="flex-1 overflow-y-auto py-8 print:hidden">
        <div className="print-wrapper scale-[0.8] sm:scale-100 origin-top flex justify-center">
           {renderPrintableContract()}
        </div>
      </div>

      {/* UNTRANSFORMED OFFSCREEN CONTAINER FOR PNG IMAGE GENERATION */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none z-[-9999] bg-white print:hidden" dir="rtl">
        {renderPrintableContract(true)}
      </div>

      {/* SEPARATE PRINT LAYOUT PORTAL */}
      {createPortal(
        <div className="hidden print:block print-portal-container text-black bg-white" dir="rtl" style={{ margin: 0, padding: 0, boxSizing: 'border-box' }}>
          {renderPrintableContract()}
        </div>,
        document.body
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          .contract-print-page {
             box-shadow: none !important;
             margin: 0 auto !important;
             width: 100% !important;
             background: white !important;
             page-break-after: avoid;
             page-break-inside: avoid;
          }
          
          /* Force colors to ensure they show up regardless of dark mode */
          .contract-print-page * { color: #000 !important; }
          .contract-print-page .text-red-600 { color: #dc2626 !important; }
          .contract-print-page .text-rose-700 { color: #be123c !important; }
          .contract-print-page .text-emerald-700 { color: #047857 !important; }
          .contract-print-page .text-rose-600 { color: #e11d48 !important; }
          .contract-print-page .text-emerald-600 { color: #059669 !important; }
          
          /* Force borders */
          .contract-print-page .border-slate-800 { border-color: #1e293b !important; }
          .contract-print-page .border-slate-200, .contract-print-page .border-slate-300 { border-color: #cbd5e1 !important; }
          .contract-print-page .border-emerald-500 { border-color: #10b981 !important; }
          .contract-print-page .border-rose-500 { border-color: #f43f5e !important; }
          
          /* Force backgrounds */
          .contract-print-page .bg-slate-100 { background-color: #f1f5f9 !important; }
          .contract-print-page .bg-slate-50 { background-color: #f8fafc !important; }
          .contract-print-page .bg-emerald-50 { background-color: #ecfdf5 !important; }
          .contract-print-page .bg-rose-50 { background-color: #fff1f2 !important; }
          .contract-print-page .bg-amber-50 { background-color: #fffbeb !important; }
        }
      `}</style>
    </div>
  );
}
