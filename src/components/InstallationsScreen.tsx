/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import {
  Users, Calendar, Plus, Search, MapPin, CheckSquare, Check, History,
  Trash2, X, Sparkles, User, Info, LayoutGrid, Clock, Briefcase, Phone, Receipt, Eye, DollarSign,
  Printer, Wrench, Car, FileText, Edit, Wallet, CreditCard, ChevronDown, ChevronUp, Coins, FileSignature
} from 'lucide-react';
import PreliminaryBookingsSegment from './PreliminaryBookingsSegment';

interface InstallationsScreenProps {
  permissions: any;
  currentUser?: any;
}

const parseJsonArray = (val: any): any[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error("Failed to parse JSON array:", e);
    }
  }
  return [];
};

export default function InstallationsScreen({ permissions, currentUser }: InstallationsScreenProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  const [activeSegment, setActiveSegment] = useState<'calendar' | 'teams' | 'workers' | 'preliminary'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [bookingTab, setBookingTab] = useState<'pending' | 'completed' | 'cancelled'>('pending');
  const [viewingTeamStats, setViewingTeamStats] = useState<any>(null);
  const [workerLimit, setWorkerLimit] = useState(50);
  const [workersReady, setWorkersReady] = useState(false);

  // Team Expenses State & Handlers
  const [viewingTeamExpenses, setViewingTeamExpenses] = useState<any | null>(null);
  const [teamExpenseCards, setTeamExpenseCards] = useState<any[]>([]);
  const [teamExpensesLoading, setTeamExpensesLoading] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    title: '',
    totalAmount: '',
    cardDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [newItemForm, setNewItemForm] = useState<Record<number, { description: string; amount: string; itemDate: string }>>({});

  const handleOpenTeamExpenses = async (team: any) => {
    setViewingTeamExpenses(team);
    setIsAddCardOpen(false);
    setExpandedCardId(null);
    setNewCardForm({
      title: '',
      totalAmount: '',
      cardDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    try {
      setTeamExpensesLoading(true);
      const res = await api.getTeamExpenseCards(team.id);
      setTeamExpenseCards(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error('فشل في تحميل كروت صرفيات الطاقم');
      setTeamExpenseCards([]);
    } finally {
      setTeamExpensesLoading(false);
    }
  };

  const handleCreateExpenseCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingTeamExpenses) return;
    if (!newCardForm.title.trim() || !newCardForm.totalAmount || parseFloat(newCardForm.totalAmount) <= 0) {
      toast.error('يرجى كتابة عنوان الكارت والمبلغ المضاف');
      return;
    }

    try {
      setActionLoading(true);
      const created = await api.createTeamExpenseCard(viewingTeamExpenses.id, {
        title: newCardForm.title.trim(),
        totalAmount: parseFloat(newCardForm.totalAmount),
        cardDate: newCardForm.cardDate,
        notes: newCardForm.notes.trim()
      });
      toast.success('تمت إضافة كارت الصرفيات بنجاح!');
      setTeamExpenseCards(prev => [created, ...prev]);
      setIsAddCardOpen(false);
      setNewCardForm({ title: '', totalAmount: '', cardDate: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err: any) {
      toast.error(err.message || 'فشل إضافة كارت الصرفيات');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpenseCard = async (cardId: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكارت وجميع السجلات المصروفة بدخله؟')) return;
    try {
      setActionLoading(true);
      await api.deleteTeamExpenseCard(cardId);
      toast.success('تم حذف الكارت بنجاح');
      setTeamExpenseCards(prev => prev.filter(c => c.id !== cardId));
      if (expandedCardId === cardId) setExpandedCardId(null);
    } catch (err: any) {
      toast.error('فشل حذف الكارت');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddExpenseItem = async (cardId: number, e: React.FormEvent) => {
    e.preventDefault();
    const itemData = newItemForm[cardId];
    if (!itemData || !itemData.description?.trim() || !itemData.amount || parseFloat(itemData.amount) <= 0) {
      toast.error('يرجى تحديد بيان الغرض والمبلغ المصروف');
      return;
    }

    try {
      setActionLoading(true);
      const newItem = await api.addTeamExpenseItem(cardId, {
        description: itemData.description.trim(),
        amount: parseFloat(itemData.amount),
        itemDate: itemData.itemDate || new Date().toISOString().split('T')[0]
      });
      toast.success('تم تسديد/تسجيل غرض الصرف بنجاح');

      setTeamExpenseCards(prev => prev.map(card => {
        if (card.id === cardId) {
          const updatedItems = [...(card.items || []), newItem];
          const spentAmount = updatedItems.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
          return {
            ...card,
            spentAmount,
            remainingAmount: card.totalAmount - spentAmount,
            items: updatedItems
          };
        }
        return card;
      }));

      setNewItemForm(prev => ({
        ...prev,
        [cardId]: { description: '', amount: '', itemDate: new Date().toISOString().split('T')[0] }
      }));
    } catch (err: any) {
      toast.error(err.message || 'فشل إضافة المصروف');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpenseItem = async (cardId: number, itemId: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      setActionLoading(true);
      await api.deleteTeamExpenseItem(itemId);
      toast.success('تم حذف المصروف بنجاح');

      setTeamExpenseCards(prev => prev.map(card => {
        if (card.id === cardId) {
          const updatedItems = (card.items || []).filter((it: any) => it.id !== itemId);
          const spentAmount = updatedItems.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
          return {
            ...card,
            spentAmount,
            remainingAmount: card.totalAmount - spentAmount,
            items: updatedItems
          };
        }
        return card;
      }));
    } catch (err: any) {
      toast.error('فشل حذف المصروف');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSegmentChange = (segment: 'calendar' | 'teams' | 'workers' | 'preliminary') => {
    setActiveSegment(segment);
    setSearchQuery('');
    if (segment === 'workers') {
      setWorkersReady(false);
      setWorkerLimit(50);
    } else {
      setWorkersReady(false);
    }
  };

  const [workersLoading, setWorkersLoading] = useState(false);
  const [workersLoaded, setWorkersLoaded] = useState(false);

  useEffect(() => {
    if (activeSegment === 'workers') {
      // Only mark ready when not loading AND we've attempted a fetch
      if (!workersLoading && workersLoaded) {
        const frame = requestAnimationFrame(() => setWorkersReady(true));
        return () => cancelAnimationFrame(frame);
      }
    } else {
      setWorkersReady(false);
    }
  }, [activeSegment, workersLoading, workersLoaded]);

  const [workers, setWorkers] = useState<any[]>([]);
  const [workerSettlements, setWorkerSettlements] = useState<any[]>([]);
  const [workerPayments, setWorkerPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<any[]>([]);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [viewingWorkerStats, setViewingWorkerStats] = useState<any>(null);
  const [workerPaymentAmounts, setWorkerPaymentAmounts] = useState<Record<string, number>>({});
  const [workerPaidInAdvance, setWorkerPaidInAdvance] = useState<Record<string, boolean>>({});
  const [settlementAmount, setSettlementAmount] = useState('');

  // Worker Fees Editing modal for existing bookings
  const [editingWorkerFeesBooking, setEditingWorkerFeesBooking] = useState<any>(null);
  const [editingBookingWorkerFees, setEditingBookingWorkerFees] = useState<Record<string, number>>({});
  const [editingBookingWorkerPaidInAdvance, setEditingBookingWorkerPaidInAdvance] = useState<Record<string, boolean>>({});

  // Teams form state & Printing state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [printingTeam, setPrintingTeam] = useState<any | null>(null);
  const [teamForm, setTeamForm] = useState<{
    name: string;
    leader: string;
    members: string[];
    vehicleType: string;
    vehicleNumber: string;
    vehicleNotes: string;
    equipment: Array<{ name: string; quantity: number | string; notes: string }>;
  }>({
    name: '',
    leader: '',
    members: [],
    vehicleType: '',
    vehicleNumber: '',
    vehicleNotes: '',
    equipment: []
  });

  const handleAddEquipmentRow = () => {
    setTeamForm(prev => ({
      ...prev,
      equipment: [...prev.equipment, { name: '', quantity: 1, notes: '' }]
    }));
  };

  const handleRemoveEquipmentRow = (index: number) => {
    setTeamForm(prev => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== index)
    }));
  };

  const handleEquipmentChange = (index: number, field: 'name' | 'quantity' | 'notes', value: any) => {
    setTeamForm(prev => {
      const updated = [...prev.equipment];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, equipment: updated };
    });
  };

  const [isTeamPrintPreviewOpen, setIsTeamPrintPreviewOpen] = useState(false);
  const [teamPrintCustomDate, setTeamPrintCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [teamPrintCustomTitle, setTeamPrintCustomTitle] = useState<string>('');
  const [teamPrintCustomNotes, setTeamPrintCustomNotes] = useState<string>('');

  const handleOpenTeamPrintPreview = (target: any) => {
    setPrintingTeam(target);
    setTeamPrintCustomDate(new Date().toISOString().split('T')[0]);
    setTeamPrintCustomTitle(target === 'all' ? 'كشف طواقم التركيبات الميدانية والعِدة الكلية' : `سند استلام عِدَة وطاقم تركيب: ${target.name}`);
    setTeamPrintCustomNotes('');
    setIsTeamPrintPreviewOpen(true);
  };

  const handleTriggerTeamPrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Bookings form state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    customerId: '',
    invoiceId: '',
    teamId: '',
    isManualTeam: false,
    manualLeader: '',
    manualMembers: [] as string[],
    installationDate: '',
    appointmentTime: '09:00',
    notes: '',
    address: '',
    preliminarySystemType: '',
    preliminaryAmount: ''
  });
  
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ id: 0, date: '', customerName: '' });

  const [linkInvoiceModalOpen, setLinkInvoiceModalOpen] = useState(false);
  const [bookingToLink, setBookingToLink] = useState<any>(null);
  const [linkInvoiceId, setLinkInvoiceId] = useState('');

  const workerStatsData = React.useMemo(() => {
    if (!viewingWorkerStats) return { completedInstallations: [], workerMnts: [], workerFaults: [], totalMaintenanceAndFaults: 0 };
    
    const workerTeams = teams.filter(t => t.leader === viewingWorkerStats.name || (Array.isArray(t.members) ? t.members.includes(viewingWorkerStats.name) : t.members?.includes(viewingWorkerStats.name)));
    const teamIds = workerTeams.map(t => t.id);

    const isCustomTeamMatch = (teamName: string, workerName: string) => {
      if (!teamName || typeof teamName !== 'string' || !teamName.startsWith('مخصص |')) return false;
      const parts = teamName.split('|').map(s => s.trim());
      if (parts.length < 3) return teamName.includes(workerName);
      const leader = parts[1];
      const members = parts[2].split('،').map(s => s.trim());
      return leader === workerName || members.includes(workerName);
    };

    const completedInstallations = bookings.filter(b => 
      b.status === 'completed' && 
      (teamIds.includes(b.assignedTeamId) || isCustomTeamMatch(b.assignedTeamName, viewingWorkerStats.name))
    );
    
    const workerMnts = taskAssignments.filter(ta => ta.taskType === 'maintenance' && teamIds.includes(ta.teamId))
      .map(ta => maintenance.find(m => m.id === ta.taskId && (m.status === 'repaired' || m.status === 'closed'))).filter(Boolean);
    const workerFaults = taskAssignments.filter(ta => ta.taskType === 'fault' && teamIds.includes(ta.teamId))
      .map(ta => faults.find(f => f.id === ta.taskId && (f.status === 'repaired' || f.status === 'closed'))).filter(Boolean);
      
    return {
      completedInstallations,
      workerMnts,
      workerFaults,
      totalMaintenanceAndFaults: workerMnts.length + workerFaults.length
    };
  }, [viewingWorkerStats, teams, bookings, taskAssignments, maintenance, faults]);

  const getBookingWorkerDetails = React.useCallback((b: any) => {
    let leader = '';
    let members: string[] = [];

    if (b.assignedTeamId) {
      const team = teams.find(t => t.id === b.assignedTeamId);
      if (team) {
        leader = team.leader || '';
        members = Array.isArray(team.members) 
          ? team.members 
          : (typeof team.members === 'string' ? team.members.split('،').map((s: string) => s.trim()) : []);
      }
    }

    if (!leader && b.assignedTeamName && b.assignedTeamName.startsWith('مخصص |')) {
      const parts = b.assignedTeamName.split('|').map((s: string) => s.trim());
      if (parts.length >= 2) leader = parts[1];
      if (parts.length >= 3) members = parts[2].split('،').map((s: string) => s.trim());
    }

    // Get payments for this booking
    const bPayments = workerPayments.filter(p => 
      String(p.task_id || p.taskId) === String(b.id) && 
      (p.task_type === 'booking' || p.taskType === 'booking')
    );

    // Add any worker names that exist in payments but aren't in members/leader
    bPayments.forEach(p => {
      const wName = p.worker_name || p.workerName;
      if (wName && wName !== leader && !members.includes(wName)) {
        members.push(wName);
      }
    });

    const allWorkers = Array.from(new Set([leader, ...members].filter(Boolean)));

    const workerDetails = allWorkers.map(name => {
      const p = bPayments.find(pay => (pay.worker_name || pay.workerName) === name);
      const amount = p ? parseFloat(p.amount) || 0 : 0;
      const isPaid = p ? Boolean(p.description?.includes('(تم المحاسبة)')) : false;

      return {
        name,
        isLeader: name === leader,
        amount,
        isPaid,
        hasRecord: Boolean(p)
      };
    });

    const totalWorkerCost = workerDetails.reduce((sum, w) => sum + w.amount, 0);

    return { leader, members, workerDetails, totalWorkerCost, bPayments };
  }, [teams, workerPayments]);

  const openWorkerFeesEditor = (booking: any) => {
    setEditingWorkerFeesBooking(booking);
    const { workerDetails } = getBookingWorkerDetails(booking);
    const initialAmounts: Record<string, number> = {};
    const initialPaid: Record<string, boolean> = {};

    workerDetails.forEach(w => {
      initialAmounts[w.name] = w.amount;
      initialPaid[w.name] = w.isPaid;
    });

    setEditingBookingWorkerFees(initialAmounts);
    setEditingBookingWorkerPaidInAdvance(initialPaid);
  };

  const handleSaveWorkerFeesForBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkerFeesBooking) return;

    try {
      setActionLoading(true);
      const selectedCustomer = customers.find(c => c.id === editingWorkerFeesBooking.customerId);
      const customerName = selectedCustomer?.name || editingWorkerFeesBooking.customerName || '';

      const { workerDetails } = getBookingWorkerDetails(editingWorkerFeesBooking);
      const allWorkerNames = Array.from(new Set([...workerDetails.map(w => w.name), ...Object.keys(editingBookingWorkerFees)]));

      const paymentEntries = allWorkerNames
        .filter(name => (editingBookingWorkerFees[name] || 0) > 0 || editingBookingWorkerPaidInAdvance[name])
        .map(workerName => {
          const amount = editingBookingWorkerFees[workerName] || 0;
          const workerObj = workers.find(w => w.name === workerName);
          return {
            workerId: workerObj?.id || 0,
            workerName,
            taskId: editingWorkerFeesBooking.id,
            taskType: 'booking',
            amount,
            customerName,
            isPaidInAdvance: editingBookingWorkerPaidInAdvance[workerName] || false,
            description: `تركيب منظومة - ${customerName}`
          };
        });

      await api.saveTaskWorkerPayments(editingWorkerFeesBooking.id, 'booking', paymentEntries);
      toast.success('تم تحديث أجور العمال وحفظ تفاصيلهم بنجاح');
      setEditingWorkerFeesBooking(null);

      // Reload worker payments
      const wp = await api.getWorkerPayments().catch(() => []);
      if (Array.isArray(wp)) setWorkerPayments(wp);
    } catch (err: any) {
      toast.error(err.message || 'فشل في حفظ أجور العمال');
    } finally {
      setActionLoading(false);
    }
  };

  const loadCoreData = async () => {
    try {
      setLoading(true);
      const [tRes, bRes, cRes, iRes] = await Promise.all([
        api.getTeams().catch(() => []),
        api.getBookings().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getInvoices().catch(() => [])
      ]);

      setTeams(Array.isArray(tRes) ? tRes : (tRes?.data || []));
      setBookings(Array.isArray(bRes) ? bRes : (bRes?.data || []));
      setCustomers((Array.isArray(cRes) ? cRes : (cRes?.data || [])).filter((c: any) => !c.isDeleted));
      setInvoices(Array.isArray(iRes) ? iRes : (iRes?.data || []));
    } catch (err) {
      toast.error('فشل في تحميل بيانات طواقم التركيبات الأساسية');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkersData = async () => {
    if (workersLoaded || workersLoading) return;
    try {
      setWorkersLoading(true);
      const [wRes, wsRes, mntRes, faultRes, taRes, wpRes] = await Promise.all([
        api.getWorkers().catch(() => []),
        api.getWorkerSettlements().catch(() => []),
        api.getMaintenance().catch(() => []),
        api.getFaults().catch(() => []),
        api.getTaskAssignments?.().catch(() => []) || [],
        api.getWorkerPayments().catch(() => [])
      ]);

      setWorkers(Array.isArray(wRes) ? wRes : []);
      setWorkerSettlements(Array.isArray(wsRes) ? wsRes : []);
      setMaintenance(Array.isArray(mntRes) ? mntRes : []);
      setFaults(Array.isArray(faultRes) ? faultRes : []);
      setTaskAssignments(Array.isArray(taRes) ? taRes : []);
      setWorkerPayments(Array.isArray(wpRes) ? wpRes : []);
      setWorkersLoaded(true);
    } catch (err) {
      toast.error('فشل في تحميل بيانات العمال');
    } finally {
      setWorkersLoading(false);
    }
  };

  useEffect(() => {
    loadCoreData();
    loadWorkersData();
  }, []);

  // Submit new team
  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name || teamForm.members.length === 0) {
      toast.error('يرجى كتابة اسم الطاقم واختيار أعضائه الأساسيين');
      return;
    }

    try {
      setActionLoading(true);
      
      const formattedVehicle = teamForm.vehicleType || teamForm.vehicleNumber
        ? `${teamForm.vehicleType ? teamForm.vehicleType.trim() : ''} ${teamForm.vehicleNumber ? '- رقم: ' + teamForm.vehicleNumber.trim() : ''}`.trim()
        : '';
        
      const payload = {
        name: teamForm.name,
        leader: teamForm.leader,
        members: teamForm.members,
        vehicle: formattedVehicle,
        vehicleType: (teamForm.vehicleType || '').trim(),
        vehicleNumber: (teamForm.vehicleNumber || '').trim(),
        vehicleNotes: (teamForm.vehicleNotes || '').trim(),
        equipment: teamForm.equipment.filter(e => e.name && e.name.trim() !== '')
      };

      if (editingTeamId) {
        const updated = await api.updateTeam(editingTeamId, payload);
        toast.success('تم تحديث الطاقم بنجاح');
        setTeams(prev => prev.map(t => t.id === editingTeamId ? updated : t));
      } else {
        const created = await api.createTeam(payload);
        toast.success('تم تكوين وتسجيل طاقم التركيب الكهروضوئي بنجاح!');
        setTeams(prev => [...prev, created]);
      }

      setIsTeamModalOpen(false);
      setEditingTeamId(null);
      setTeamForm({ name: '', leader: '', members: [], vehicleType: '', vehicleNumber: '', vehicleNotes: '', equipment: [] });
    } catch (err: any) {
      toast.error(err.message || 'حدثت مشكلة أثناء الحفظ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;
    try {
      setActionLoading(true);
      const created = await api.createWorker({ name: newWorkerName.trim() });
      toast.success('تم إضافة العامل بنجاح');
      setWorkers([...workers, created]);
      setNewWorkerName('');
    } catch (err: any) {
      toast.error('فشل إضافة العامل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWorker = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العامل؟ سيتم إزالته من السجلات.')) return;
    try {
      setActionLoading(true);
      await api.deleteWorker(id);
      toast.success('تم حذف العامل بنجاح');
      setWorkers(workers.filter(w => w.id !== id));
    } catch (err: any) {
      toast.error('فشل حذف العامل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSettlement = async (workerId: number, bookingId: number, taskId?: number, taskType?: string) => {
    const tTaskType = taskType || 'booking';
    const targetTaskId = taskId || bookingId;
    
    // منع إلغاء المحاسبة - إذا كانت مسجلة مسبقاً نتجاهل الطلب
    const existingIndex = workerSettlements.findIndex(s => 
      s.workerId === workerId && s.taskId === targetTaskId && (s.taskType === tTaskType || (!s.taskType && tTaskType === 'booking'))
    );
    if (existingIndex >= 0) {
      toast.error('تم توثيق هذه المحاسبة مسبقاً ولا يمكن إلغاؤها');
      return;
    }
    
    const originalSettlements = [...workerSettlements];
    setWorkerSettlements(prev => [...prev, {
      id: Date.now(),
      workerId,
      taskId: targetTaskId,
      taskType: tTaskType,
      settledAt: new Date().toISOString()
    }]);
    
    try {
      const res = await api.toggleWorkerSettlement(workerId, bookingId, taskId, taskType);
      if (res.isSettled) {
        toast.success('تم توثيق محاسبة العامل عن هذه المهمة');
      }
      
      api.getWorkerSettlements().then(wsRes => {
        if (Array.isArray(wsRes)) setWorkerSettlements(wsRes);
      }).catch(() => {});
    } catch (err: any) {
      toast.error('فشل في حفظ المحاسبة');
      setWorkerSettlements(originalSettlements);
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطاقم نهائياً؟')) return;
    try {
      setActionLoading(true);
      await api.deleteTeam(id);
      toast.success('تم حذف الطاقم بنجاح');
      setTeams(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      toast.error('فشل في حذف الطاقم');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditTeamModal = (t: any) => {
    setEditingTeamId(t.id);

    let eqList: any[] = [];
    if (Array.isArray(t.equipment)) eqList = t.equipment;
    else if (typeof t.equipment === 'string') {
      try { eqList = JSON.parse(t.equipment); } catch(e) { eqList = []; }
    }

    setTeamForm({
      name: t.name || '',
      leader: t.leader || '',
      members: Array.isArray(t.members) ? t.members : (t.members ? t.members.split('،').map((m:string)=>m.trim()) : []),
      vehicleType: t.vehicleType || (t.vehicle ? t.vehicle.split(' - ')[0] || '' : ''),
      vehicleNumber: t.vehicleNumber || (t.vehicle ? t.vehicle.split(' - ')[1]?.replace('رقم: ', '') || '' : ''),
      vehicleNotes: t.vehicleNotes || '',
      equipment: eqList.map((item: any) => ({
        name: item.name || '',
        quantity: item.quantity || 1,
        notes: item.notes || ''
      }))
    });
    setIsTeamModalOpen(true);
  };

  // Submit new booking installation
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim values and check if they are empty
    const customerId = bookingForm.customerId?.trim();
    const invoiceId = bookingForm.invoiceId?.trim();
    const teamId = bookingForm.teamId?.trim();
    const installationDate = bookingForm.installationDate?.trim();
    const appointmentTime = bookingForm.appointmentTime?.trim() || '09:00';
    const prelimSys = bookingForm.preliminarySystemType?.trim();
    const prelimAmt = bookingForm.preliminaryAmount?.trim();

    if (!customerId || !installationDate) {
      toast.error('يرجى تحديد العميل والتاريخ');
      return;
    }
    if (!invoiceId && !prelimSys) {
      toast.error('يرجى إدخال نوع المنظومة أو حجم العمل للحجز المبدئي');
      return;
    }

    const isManual = bookingForm.isManualTeam;
    if (!isManual && !teamId) {
      toast.error('يرجى تحديد طاقم التركيب');
      return;
    }
    if (isManual && (!bookingForm.manualLeader || bookingForm.manualMembers.length === 0)) {
      toast.error('يرجى تحديد مسؤول وأعضاء الطاقم المخصص');
      return;
    }

    try {
      setActionLoading(true);
      
      let finalNotes = bookingForm.notes?.trim() || '';
      if (!invoiceId) {
        finalNotes = `[حجز مبدئي | المنظومة: ${prelimSys} | المبلغ: ${prelimAmt || 'غير محدد'}]\n${finalNotes}`.trim();
      }
      
      const payload: any = {
        customerId: parseInt(customerId),
        invoiceId: invoiceId ? parseInt(invoiceId) : null,
        appointmentDate: installationDate,
        appointmentTime: appointmentTime + ':00',
        notes: finalNotes
      };

      if (isManual) {
        // إرسال بيانات الطاقم المخصص مباشرة بدون إنشاء سجل طاقم
        payload.customTeamLeader = bookingForm.manualLeader;
        payload.customTeamMembers = bookingForm.manualMembers;
      } else {
        payload.assignedTeamId = parseInt(teamId);
      }

      const created = await api.createBooking(payload);

      // Save worker payment amounts
      const selectedCustomer = customers.find(c => c.id === parseInt(customerId));
      const customerName = selectedCustomer?.name || '';
      const allWorkerNames = Array.from(new Set([...Object.keys(workerPaymentAmounts), ...Object.keys(workerPaidInAdvance)]));
      const paymentEntries = allWorkerNames
        .filter(workerName => {
          const amt = workerPaymentAmounts[workerName] || 0;
          return amt > 0 || workerPaidInAdvance[workerName];
        })
        .map((workerName) => {
          const amount = workerPaymentAmounts[workerName] || 0;
          const worker = workers.find(w => w.name === workerName);
          return {
            workerId: worker?.id || 0,
            workerName,
            taskId: created.id,
            taskType: 'booking',
            amount,
            customerName,
            isPaidInAdvance: workerPaidInAdvance[workerName] || false,
            description: `تركيب منظومة - ${customerName}`
          };
        });

      if (paymentEntries.length > 0) {
        try {
          await api.createBulkWorkerPayments(paymentEntries);
        } catch (e) {
          console.error('Failed to save worker payments:', e);
        }
      }

      toast.success('تم حجز وتثبيت موعد تركيب المنظومة بنجاح في تقويم الشركة الكلي!');
      setIsBookingModalOpen(false);
      setBookingForm({ customerId: '', invoiceId: '', teamId: '', isManualTeam: false, manualLeader: '', manualMembers: [], installationDate: '', appointmentTime: '09:00', notes: '', address: '', preliminarySystemType: '', preliminaryAmount: '' });
      setWorkerPaymentAmounts({});
      setWorkerPaidInAdvance({});
      setBookings(prev => [...prev, created]);
      // Reload worker payments
      api.getWorkerPayments().then(wp => { if (Array.isArray(wp)) setWorkerPayments(wp); }).catch(() => {});
    } catch (err: any) {
      toast.error(err.message || 'فشل في تثبيت الحجز');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: number, status: 'inprogress' | 'completed' | 'cancelled') => {
    try {
      setActionLoading(true);
      const payload: any = { status };

      if (status === 'completed') {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
        const timeStr = now.toLocaleTimeString('ar-IQ', { hour: 'numeric', minute: '2-digit', hour12: true });
        const existingBooking = bookings.find(b => b.id === bookingId);
        const currentNotes = existingBooking?.notes || '';
        
        if (!currentNotes.includes('تم التثبيت فعلياً في:')) {
          payload.notes = (currentNotes + `\n[تم التثبيت فعلياً في: ${dateStr} الساعة ${timeStr}]`).trim();
        }
      }

      const updated = await api.updateBooking(bookingId, payload);
      toast.success('تم تحديث حالة التركيب بنجاح');
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      
      if (status === 'completed') {
        setBookingTab('completed');
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث الحالة');
    } finally {
      setActionLoading(false);
    }
  };

  const submitReschedule = async () => {
    if(!rescheduleData.date) return toast.error('يرجى تحديد تاريخ جديد للتأجيل');
    try {
      setActionLoading(true);
      const updated = await api.updateBooking(rescheduleData.id, { 
        appointmentDate: rescheduleData.date,
        status: 'rescheduled'
      });
      toast.success('تم تأجيل موعد التركيب بنجاح');
      setBookings(prev => prev.map(b => b.id === rescheduleData.id ? updated : b));
      setRescheduleModalOpen(false);
    } catch (err: any) {
      toast.error('فشل في التأجيل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInvoiceId || !bookingToLink) return;
    try {
      setActionLoading(true);
      const updated = await api.updateBooking(bookingToLink.id, { invoiceId: linkInvoiceId });
      setBookings(prev => prev.map(b => b.id === bookingToLink.id ? updated : b));
      toast.success('تم ربط الفاتورة بنجاح وتحويل الحجز إلى رسمي');
      setLinkInvoiceModalOpen(false);
      setBookingToLink(null);
      setLinkInvoiceId('');
    } catch (err: any) {
      toast.error(err.message || 'فشل في ربط الفاتورة');
    } finally {
      setActionLoading(false);
    }
  };

  // Calendar logic preview: grouping bookings by calendar day for visual grid view representation!
  const getDaysInCurrentMonthList = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Get first day of month and total days
    const totalDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return d.toISOString().split('T')[0];
    });
  };

  const filteredBookings = bookings.filter(b => 
    (b.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.assignedTeamName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTabBookings = filteredBookings.filter(b => {
    if (bookingTab === 'pending') return b.status === 'scheduled' || b.status === 'rescheduled';
    if (bookingTab === 'completed') return b.status === 'completed';
    if (bookingTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const filteredWorkers = workers.filter(w => 
    (w.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.id.toString().includes(searchQuery)
  );

  const renderPrintPortal = () => {
    if (!printingTeam) return null;
    const printTeamsList = printingTeam === 'all' ? teams : [printingTeam];
    const printDate = teamPrintCustomDate || new Date().toLocaleDateString('ar-IQ');

    return createPortal(
      <div className="hidden print:block print-portal-container text-slate-900 bg-white" dir="rtl" style={{ margin: 0, padding: '20px 25px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
        {printTeamsList.map((teamItem, tIndex) => {
          const eqList: any[] = Array.isArray(teamItem.equipment)
            ? teamItem.equipment
            : (typeof teamItem.equipment === 'string'
              ? JSON.parse(teamItem.equipment || '[]')
              : []);
          const membersList = Array.isArray(teamItem.members)
            ? teamItem.members
            : (teamItem.members ? String(teamItem.members).split(/[,,]+/).map(m => m.trim()) : []);

          return (
            <div key={teamItem.id || tIndex} className={`${tIndex > 0 ? 'page-break-before pt-8 border-t-2 border-slate-400 mt-8' : ''}`}>
              {/* Header with Logo */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <img
                    src="/images/anwar-logo-dark.png"
                    alt="Logo"
                    className="h-16 w-auto object-contain"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">أنوار الإبداع للطاقة الشمسية</h1>
                    <p className="text-xs text-slate-600 font-bold mt-1">سند رسمية وتسلّم عِدَة وأدوات طواقم التركيبات الميدانية</p>
                  </div>
                </div>
                <div className="text-left font-mono text-xs">
                  <div className="font-bold text-slate-900">التاريخ: {printDate}</div>
                  <div className="text-slate-600 mt-0.5 font-bold">رمز الطاقم: #{teamItem.id}</div>
                </div>
              </div>

              {/* Title Header */}
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-900 bg-slate-100 border border-slate-300 p-2.5 rounded text-center">
                  {teamPrintCustomTitle || `سند استلام عِدَة وطاقم تركيب: ${teamItem.name}`}
                </h2>
              </div>

              {/* Team Info Header */}
              <div className="grid grid-cols-2 gap-4 border-2 border-slate-900 p-4 rounded-lg mb-6 bg-slate-50">
                <div>
                  <span className="font-black text-slate-700 block text-xs">اسم الطاقم الفني:</span>
                  <span className="font-black text-slate-900 text-base">{teamItem.name}</span>
                </div>
                <div>
                  <span className="font-black text-slate-700 block text-xs">قائد / مسؤول الطاقم:</span>
                  <span className="font-black text-slate-900 text-base">{teamItem.leader || 'غير محدد'}</span>
                </div>
                <div className="col-span-2 border-t border-slate-300 pt-2 mt-1">
                  <span className="font-black text-slate-700 block text-xs mb-1">كادر وفنيي الفريق:</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {membersList.length > 0 ? membersList.join(' ، ') : 'لا يوجد أعضاء مسجلين'}
                  </span>
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="border border-slate-900 p-4 rounded-lg mb-6 bg-white">
                <h3 className="font-black text-xs text-slate-900 mb-2 underline">تفاصيل مركبة / سيارة الطاقم:</h3>
                <div className="grid grid-cols-3 gap-3 text-xs font-bold">
                  <div>
                    <span className="text-slate-600 block text-[11px]">نوع السيارة / الموديل:</span>
                    <span className="text-slate-900">{teamItem.vehicleType || teamItem.vehicle || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">رقم السيارة / اللوحة:</span>
                    <span className="text-slate-900 font-mono">{teamItem.vehicleNumber || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">ملاحظات المركبة:</span>
                    <span className="text-slate-900">{teamItem.vehicleNotes || 'لا توجد ملاحظات'}</span>
                  </div>
                </div>
              </div>

              {/* Equipment Inventory Table */}
              <div className="mb-8">
                <h3 className="font-black text-sm text-slate-900 mb-3 flex items-center justify-between">
                  <span>جدول العِدَة والأدوات المسلّمة للطاقم:</span>
                  <span className="text-xs font-normal text-slate-600">عدد العناصر المسجلة: {eqList.length}</span>
                </h3>
                <table className="w-full text-right text-xs border-collapse border-2 border-slate-900">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-black border-b-2 border-slate-900">
                      <th className="border border-slate-900 p-2.5 w-12 text-center">#</th>
                      <th className="border border-slate-900 p-2.5">اسم / نوع العدة والأداة</th>
                      <th className="border border-slate-900 p-2.5 w-24 text-center">العدد</th>
                      <th className="border border-slate-900 p-2.5">ملاحظات / حالة العدة التسليمية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eqList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="border border-slate-900 p-4 text-center text-slate-500 italic">
                          لم يتم تسجيل أي عِدَة أو أدوات خاصة بهذا الطاقم حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      eqList.map((eqItem: any, eqIdx: number) => (
                        <tr key={eqIdx} className="border-b border-slate-400">
                          <td className="border border-slate-900 p-2.5 text-center font-mono font-bold">{eqIdx + 1}</td>
                          <td className="border border-slate-900 p-2.5 font-bold text-slate-900">{eqItem.name}</td>
                          <td className="border border-slate-900 p-2.5 text-center font-mono font-black text-slate-900">{eqItem.quantity || 1}</td>
                          <td className="border border-slate-900 p-2.5 font-semibold text-slate-700">{eqItem.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {teamPrintCustomNotes && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 font-semibold">
                  ملاحظة طباعة: {teamPrintCustomNotes}
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-900 text-center text-xs font-black mt-12">
                <div>
                  <p className="mb-10 text-slate-800">توقيع مسؤول الطاقم (المستلم)</p>
                  <p className="text-slate-400 font-mono">......................................</p>
                </div>
                <div>
                  <p className="mb-10 text-slate-800">توقيع أمين المخزن (المسلّم)</p>
                  <p className="text-slate-400 font-mono">......................................</p>
                </div>
                <div>
                  <p className="mb-10 text-slate-800">توقيع وتصديق الإدارة</p>
                  <p className="text-slate-400 font-mono">......................................</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>,
      document.body
    );
  };

  return (
    <div className="space-y-8 animate-fade-in relative z-10 max-w-7xl mx-auto pb-12">
      
      {/* Visual Title Banner */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-200/50 liquid-icon-wrapper shrink-0">
            <Calendar className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">تقويم الحجوزات وإدارة طواقم التركيب الكهروضوئية</h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">تنظيم ومحاذاة طواقم المهندسين، فرز تواريخ تجهيز منظومات الألواح والبطاريات.</p>
          </div>
        </div>

        <div className="flex bg-white/40 p-1.5 rounded-2xl border border-white shadow-inner shrink-0">
          <button 
            onClick={() => handleSegmentChange('calendar')}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeSegment === 'calendar' ? 'bg-slate-900 text-amber-500 shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            تقويم التركيبات
          </button>
          <button 
            onClick={() => handleSegmentChange('teams')}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeSegment === 'teams' ? 'bg-slate-900 text-amber-500 shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            إدارة طواقم التركيب
          </button>
          <button 
            onClick={() => handleSegmentChange('preliminary')}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeSegment === 'preliminary' ? 'bg-slate-900 text-amber-500 shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            الحجوزات المبدئية
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="glass-card p-5 rounded-[2rem] shadow-lg flex items-center gap-4 border border-white/80">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-500 pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-emerald-500/50 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-semibold focus:outline-none shadow-sm transition-all text-slate-800 placeholder-slate-400"
            placeholder="بحث باسم الزبون، الفريق المسؤول، عنوان التركيب وتجهيز الطاقة..."
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {activeSegment === 'calendar' && permissions.installationBookings?.create && (
            <button 
              onClick={() => setIsBookingModalOpen(true)}
              className="px-6 py-3.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-950 transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-emerald-400"/>
              حجز موعد تركيب
            </button>
          )}

          {activeSegment === 'teams' && (
            <div className="flex items-center gap-2">
              {teams.length > 0 && (
                <button
                  onClick={() => handleOpenTeamPrintPreview('all')}
                  className="px-4 py-3.5 bg-white/80 hover:bg-white text-slate-800 font-bold text-sm rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 transition cursor-pointer active:scale-95"
                  title="معاينة وطباعة كافة طواقم التركيب وعدتهم"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">طباعة كافة الطواقم</span>
                </button>
              )}
              {permissions.installationTeams?.create && (
                <button 
                  onClick={() => {
                    setEditingTeamId(null);
                    setTeamForm({ name: '', leader: '', members: [], vehicleType: '', vehicleNumber: '', vehicleNotes: '', equipment: [] });
                    setIsTeamModalOpen(true);
                  }}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-200/50 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-white"/>
                  إضافة طاقم تركيب جديد
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="mt-6">
        {/* SEGMENT 1: VISUAL CALENDAR BOOKINGS GRID & LISTS */}
        {activeSegment === 'calendar' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Calendar Interactive Block List (5 Cols) */}
                <div className="lg:col-span-5 glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/80 shadow-lg h-[600px] flex flex-col justify-between hover:shadow-xl transition-shadow">
                  <div>
                    <h3 className="font-black text-slate-800 text-base mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      تتبع تواريخ هذا الشهر هجائياً
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mb-6 bg-white/40 p-3 rounded-xl border border-white shadow-inner">يعرض توافق وقائدي الفرق للترتيب الكهروضوئي في الشهر الحالي لضمان منع التضارب.</p>
                  </div>

                  {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                      <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-4 shadow-lg shadow-amber-200/50"></div>
                      <p className="font-bold">جاري تحميل بيانات التقويم...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-7 gap-2 align-content-start">
                    {getDaysInCurrentMonthList().map((dateStr, idx) => {
                      const day = parseInt(dateStr.split('-')[2]);
                      const dayBookings = bookings.filter(b => b.appointmentDate === dateStr);
                      const hasBooking = dayBookings.length > 0;
                      const hasPending = dayBookings.some(b => b.status === 'scheduled' || b.status === 'rescheduled');

                      return (
                        <div 
                          key={idx}
                          className={`min-h-[3.5rem] py-1.5 px-1 rounded-xl flex flex-col items-center justify-center cursor-pointer border text-xs font-black select-none shadow-sm transition-all hover:scale-105 ${
                            hasBooking 
                              ? hasPending 
                                ? 'bg-amber-50/50 text-slate-800 border-amber-200 shadow-amber-100'
                                : 'bg-emerald-50/50 text-slate-800 border-emerald-200 shadow-emerald-100'
                              : 'bg-white/60 text-slate-500 hover:bg-white/90 border-white hover:text-slate-800'
                          }`}
                          title={hasBooking ? `${dayBookings.length} حجوزات في هذا اليوم` : 'لا يوجد حجز'}
                        >
                          <span className="text-sm">{day}</span>
                          {hasBooking && (
                            <div className="flex flex-wrap justify-center gap-1 mt-1">
                              {dayBookings.map((b, bIdx) => (
                                <span 
                                  key={bIdx}
                                  className={`w-2 h-2 rounded-full shadow-sm ${
                                    b.status === 'completed' ? 'bg-emerald-500' : 
                                    b.status === 'cancelled' ? 'bg-rose-500' : 
                                    'bg-amber-500'
                                  }`}
                                  title={`الزبون: ${b.customerName}`}
                                ></span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-xs text-slate-600 bg-white/60 p-4 rounded-2xl border border-white shadow-inner mt-6 font-bold space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></div>
                      <span>علامة باللون الأصفر: حجوزات جارية الصعود.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
                      <span>علامة باللون الأخضر: حجوزات مكتملة ومغذاة بالكامل.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"></div>
                      <span>علامة باللون الأحمر: الحجز ملغى.</span>
                    </div>
                  </div>
                  </>
                )}
                </div>

                {/* Bookings current active workflow list (7 Cols) */}
                <div className="lg:col-span-7 glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/80 shadow-lg flex flex-col h-[600px] hover:shadow-xl transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-white/60 shrink-0 gap-4">
                    <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-emerald-500" /> أجندة التنفيذ: ({activeTabBookings.length})
                    </h3>
                    <div className="flex bg-white/50 p-1.5 rounded-xl border border-white shadow-inner shrink-0 text-xs w-full sm:w-auto">
                      <button
                        onClick={() => setBookingTab('pending')}
                        className={`flex-1 sm:flex-none px-4 py-2 font-black rounded-lg transition-all ${
                          bookingTab === 'pending' ? 'bg-amber-100 text-amber-800 shadow-sm border border-amber-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        الانتظار
                      </button>
                      <button
                        onClick={() => setBookingTab('completed')}
                        className={`flex-1 sm:flex-none px-4 py-2 font-black rounded-lg transition-all ${
                          bookingTab === 'completed' ? 'bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        تم التركيب
                      </button>
                      <button
                        onClick={() => setBookingTab('cancelled')}
                        className={`flex-1 sm:flex-none px-4 py-2 font-black rounded-lg transition-all ${
                          bookingTab === 'cancelled' ? 'bg-rose-100 text-rose-800 shadow-sm border border-rose-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ملغى
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {activeTabBookings.length === 0 ? (
                      <p className="text-center py-20 text-slate-500 text-sm font-bold bg-white/40 rounded-2xl border border-white border-dashed">لا يوجد أي حجوزات في هذه القائمة.</p>
                    ) : (
                      activeTabBookings.map((b) => {
                        const { workerDetails, totalWorkerCost } = getBookingWorkerDetails(b);
                        return (
                        <div key={b.id} className="p-5 rounded-2xl border border-white/80 bg-white/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all text-sm group">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div>
                              <h4 className="font-black text-slate-900 text-base group-hover:text-emerald-600 transition-colors">{b.customerName}</h4>
                              {!b.invoiceId || b.invoiceNumber === 'مبدئي' ? (
                                <span className="bg-amber-100 text-amber-800 px-2.5 py-1.5 rounded-lg text-[10px] font-black border border-amber-200 flex items-center gap-1 mt-1 shadow-sm w-fit">
                                  <Sparkles className="w-3 h-3" /> حجز مبدئي
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-[10px] font-black border border-emerald-200 block mt-1 shadow-sm w-fit">
                                  فاتورة {b.invoiceNumber}
                                </span>
                              )}
                              <div className="text-xs text-slate-500 mt-2 font-bold space-y-1">
                                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> تاريخ المهمة: <span className="font-mono text-slate-800">{b.appointmentDate}</span></div>
                                {b.appointmentTime && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> وقت التركيب: <span className="font-mono text-slate-800">{b.appointmentTime.substring(0, 5)}</span></div>}
                                {(() => {
                                  const inv = invoices.find(i => i.id === b.invoiceId);
                                  return (
                                    <>
                                      {inv?.customerPhone && (
                                        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-200/50">
                                          <Phone className="w-3.5 h-3.5 text-blue-500"/> رقم هاتف الزبون: <span className="font-mono text-blue-700 bg-blue-50 px-1.5 rounded" dir="ltr">{inv.customerPhone}</span>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black shadow-sm border ${
                              b.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : b.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {b.status === 'scheduled' ? 'مجدول وبانتظار التركيب' : b.status === 'rescheduled' ? 'تم إعادة الجدولة' : b.status === 'cancelled' ? 'ملغى' : 'تم التركيب والتشغيل'}
                            </span>
                          </div>

                          {b.notes && (
                            <div className="text-xs text-slate-600 bg-white/60 p-3 rounded-xl border border-slate-100 mt-4 font-semibold leading-relaxed">
                              {b.notes.split('\n').map((line: string, i: number) => {
                                if (line.startsWith('[تم التثبيت فعلياً في:')) {
                                  return (
                                    <span key={i} className="block mt-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2 shadow-sm">
                                      <Check className="w-4 h-4" />
                                      {line.replace('[', '').replace(']', '')}
                                    </span>
                                  );
                                }
                                return <span key={i} className="block mb-1 last:mb-0">{line}</span>;
                              })}
                            </div>
                          )}

                          {/* Workers & Calculated Fees Details Section */}
                          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 mt-4 space-y-3">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 pb-2.5">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />
                                <span className="font-black text-slate-800 text-xs">تفاصيل الطاقم والعمال المكلفين:</span>
                                <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-xs">{b.assignedTeamName}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {totalWorkerCost > 0 && (
                                  <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                    مجموع أجور العمال: {formatIQD(totalWorkerCost)}
                                  </span>
                                )}
                                <button
                                  onClick={() => openWorkerFeesEditor(b)}
                                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold text-[11px] rounded-lg border border-emerald-200 shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="عرض وتعديل أجور عمال هذه المنظومة"
                                >
                                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                  تعديل أجور العمال
                                </button>
                              </div>
                            </div>

                            {workerDetails.length === 0 ? (
                              <div className="text-[11px] text-slate-400 font-bold italic">لم يتم تعيين عمال محددين لهذا الحجز حتى الآن.</div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {workerDetails.map((w, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/60 text-xs">
                                    <div className="flex items-center gap-2">
                                      <User className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="font-bold text-slate-800">{w.name}</span>
                                      {w.isLeader && (
                                        <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">مسؤول</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {w.amount > 0 ? (
                                        <span className="font-mono font-black text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{formatIQD(w.amount)}</span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-semibold">لم يحدد أجر</span>
                                      )}
                                      
                                      {w.isPaid ? (
                                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">تم المحاسبة</span>
                                      ) : w.amount > 0 ? (
                                        <span className="text-[9px] font-black bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">مستحق</span>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>


                          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/60 mt-5 pt-4 text-xs gap-4">
                            <span className="text-slate-500 font-bold bg-white/60 px-3 py-1.5 rounded-lg border border-white shadow-sm">الطاقم التعبوي: <strong className="text-slate-800">{b.assignedTeamName}</strong></span>
                            
                            <div className="flex flex-wrap gap-2 justify-center w-full sm:w-auto">
                              {permissions.installationBookings?.viewInvoice && (
                              <button 
                                onClick={async () => {
                                  // أولاً: ابحث في الفواتير المحملة محلياً
                                  const inv = invoices.find(i => i.id === b.invoiceId);
                                  if (inv) {
                                    setViewingInvoice(inv);
                                  } else {
                                    // ثانياً: اجلب الفاتورة من API مخصص لا يحتاج صلاحية الفواتير الكاملة
                                    try {
                                      const fetchedInv = await api.getBookingInvoice(b.id);
                                      setViewingInvoice(fetchedInv);
                                    } catch {
                                      toast.error('تعذّر جلب بيانات الفاتورة');
                                    }
                                  }
                                }}
                                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-black rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
                              >
                                <Receipt className="w-3.5 h-3.5"/> تفاصيل المنظومة
                              </button>
                              )}
                              {b.status !== 'completed' && b.status !== 'cancelled' && (
                                <>
                                  {!b.invoiceId || b.invoiceNumber === 'مبدئي' ? (
                                    <button 
                                      onClick={() => {
                                        setBookingToLink(b);
                                        setLinkInvoiceId('');
                                        setLinkInvoiceModalOpen(true);
                                      }}
                                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1.5"
                                    >
                                      <Receipt className="w-3.5 h-3.5"/> ربط فاتورة
                                    </button>
                                  ) : null}
                                  <button 
                                    onClick={() => {
                                      setRescheduleData({ id: b.id, date: b.appointmentDate, customerName: b.customerName });
                                      setRescheduleModalOpen(true);
                                    }}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black rounded-xl border border-amber-200 shadow-sm disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1.5"
                                  >
                                    <Calendar className="w-3.5 h-3.5"/> تأجيل/تعديل
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateBookingStatus(b.id, 'completed')}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1.5"
                                  >
                                    <CheckSquare className="w-3.5 h-3.5"/> تأكيد التشغيل
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateBookingStatus(b.id, 'cancelled')}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 font-black rounded-xl border border-rose-200 shadow-sm disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1.5"
                                  >
                                    <X className="w-3.5 h-3.5"/> إلغاء المهمة
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SEGMENT 2: INSTALLATION TEAMS DIRECTORY */}
            {activeSegment === 'teams' && (
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-16 text-slate-500 text-sm font-bold flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>تحميل طواقم وقوائم الفئات...</span>
                  </div>
                ) : teams.length === 0 ? (
                  <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg border border-white/50">
                    لا يوجد أي طواقم هندسية معرفة في النظام حالياً.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {teams.map((t) => (
                      <div key={t.id} className="glass-card rounded-[2.5rem] p-7 md:p-9 border border-white/80 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 space-y-6">
                        <div className="flex items-center gap-4 border-b border-white/60 pb-5">
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50 shrink-0">
                            <Users className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-lg">{t.name}</h4>
                            <p className="text-xs text-slate-500 mt-1 font-bold">رمز الطاقم: <span className="font-mono bg-white/60 px-2 py-0.5 rounded shadow-sm border border-slate-100">{t.id}</span></p>
                          </div>
                        </div>

                        <div className="space-y-4 text-xs font-semibold">
                          <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                            <span className="text-slate-500 flex items-center gap-1.5 text-xs"><User className="w-4 h-4 text-emerald-600"/> مسؤول الفريق:</span>
                            <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-xl shadow-sm text-xs">{t.leader || 'غير معين'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 flex items-center gap-1.5 mb-2 text-xs"><Users className="w-4 h-4 text-emerald-600"/> المهندسين والفنيين المعينين:</span>
                            <p className="text-slate-700 bg-white/60 p-4 rounded-2xl border border-white shadow-inner leading-relaxed font-bold text-xs">
                              {Array.isArray(t.members) ? t.members.join('، ') : t.members}
                            </p>
                          </div>

                          {/* Vehicle Details */}
                          <div>
                            <span className="text-slate-500 flex items-center gap-1.5 mb-1.5 font-bold text-xs">
                              <Car className="w-4 h-4 text-emerald-600" /> تفاصيل المركبة والآلية:
                            </span>
                            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1 text-slate-800">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs">{t.vehicleType || (t.vehicle ? t.vehicle.split(' - ')[0] : 'نوع غير محدد')}</span>
                                <span className="font-mono font-black text-xs bg-slate-200 px-2.5 py-0.5 rounded text-slate-700">
                                  {t.vehicleNumber || (t.vehicle ? t.vehicle.split(' - ')[1] : 'بدون رقم')}
                                </span>
                              </div>
                              {t.vehicleNotes && (
                                <p className="text-[11px] text-slate-500 font-medium italic border-t border-slate-200/60 pt-1 mt-1">
                                  {t.vehicleNotes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Equipment Details */}
                          <div>
                            <span className="text-slate-500 flex items-center gap-1.5 mb-1.5 font-bold text-xs">
                              <Wrench className="w-4 h-4 text-emerald-600" /> عِدَة وأدوات الطاقم ({Array.isArray(t.equipment) ? t.equipment.length : 0}):
                            </span>
                            {Array.isArray(t.equipment) && t.equipment.length > 0 ? (
                              <div className="bg-white/80 rounded-2xl border border-slate-200 shadow-inner overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-right text-xs">
                                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-black">
                                    <tr>
                                      <th className="p-2 w-8 text-center">#</th>
                                      <th className="p-2">اسم العدة</th>
                                      <th className="p-2 w-16 text-center">العدد</th>
                                      <th className="p-2">ملاحظات</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {t.equipment.map((eq: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                                        <td className="p-2 font-bold text-slate-800">{eq.name}</td>
                                        <td className="p-2 text-center font-mono font-black text-emerald-700">{eq.quantity || 1}</td>
                                        <td className="p-2 text-slate-500 text-[11px]">{eq.notes || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-slate-400 text-xs italic bg-slate-50 p-3 rounded-xl border border-slate-100">لا توجد عِدَة مسجلة للطاقم.</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-200/60 mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                          <button 
                            onClick={() => setViewingTeamStats(t)}
                            className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs text-xs cursor-pointer"
                            title="سجل التفاصيل والإنجازات"
                          >
                            <History className="w-4 h-4"/> إنجازات
                          </button>
                          <button 
                            onClick={() => handleOpenTeamExpenses(t)}
                            className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs text-xs cursor-pointer"
                            title="إدارة ميزانية وصرفيات الطاقم"
                          >
                            <Wallet className="w-4 h-4"/> الصرفيات
                          </button>
                          <button 
                            onClick={() => handleOpenTeamPrintPreview(t)}
                            className="py-2.5 px-3 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs text-xs cursor-pointer"
                            title="معاينة وطباعة كشف العدة والطاقم"
                          >
                            <Printer className="w-4 h-4"/> طباعة
                          </button>
                          {permissions.installationTeams?.edit && (
                            <button 
                              onClick={() => openEditTeamModal(t)}
                              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs text-xs cursor-pointer"
                            >
                              <Edit className="w-4 h-4"/> تعديل
                            </button>
                          )}
                          {permissions.installationTeams?.delete && (
                            <button 
                              onClick={() => handleDeleteTeam(t.id)}
                              className="py-2.5 px-3 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 font-bold rounded-xl transition-all flex items-center justify-center shadow-xs text-xs cursor-pointer"
                              title="حذف الطاقم"
                            >
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


      </div>

      {/* CREATE / EDIT TEAM MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <h4 className="font-black text-sm flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400"/> {editingTeamId ? 'تعديل بيانات وطاقم التركيبات' : 'تسجيل طاقم تركيبات كهرضوئية جديد'}</h4>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleTeamSubmit} className="p-6 md:p-8 text-sm space-y-5 bg-white/60 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="block font-black text-slate-800 mb-2">اسم الفريق الفني الرئيسي *</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all"
                  placeholder="مثال: فريق الرصافة الأول للبطاريات"
                  required
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-2">قائد أو مسؤول الفريق</label>
                <select
                  value={teamForm.leader}
                  onChange={(e) => setTeamForm({ ...teamForm, leader: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all"
                >
                  <option value="">-- يرجى اختيار المسؤول --</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.name}>{w.name}</option>
                  ))}
                </select>
                {workers.length === 0 && <p className="text-xs text-rose-500 font-bold mt-1.5">يرجى إضافة عمال في قسم "إدارة العمال" أولاً لتتمكن من تعيينهم كقادة.</p>}
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-2">أسماء كادر وفنيي الفريق *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white border border-slate-200 rounded-xl p-4 max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                  {workers.map(w => (
                    <label key={w.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-all border border-transparent hover:border-slate-100">
                      <input
                        type="checkbox"
                        checked={teamForm.members.includes(w.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTeamForm(prev => ({ ...prev, members: [...prev.members, w.name] }));
                          } else {
                            setTeamForm(prev => ({ ...prev, members: prev.members.filter(m => m !== w.name) }));
                          }
                        }}
                        className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <span className="font-bold text-sm text-slate-700">{w.name}</span>
                    </label>
                  ))}
                  {workers.length === 0 && <span className="text-slate-400 text-xs font-bold col-span-full">قائمة العمال فارغة، قم بإضافتهم من تبويب "إدارة العمال".</span>}
                </div>
              </div>

              {/* تفاصيل السيارة والآلية */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <label className="font-black text-slate-800 flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-600" />
                  معلومات سيارة وآلية الطاقم:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">نوع السيارة / الموديل</label>
                    <input
                      type="text"
                      value={teamForm.vehicleType}
                      onChange={(e) => setTeamForm({ ...teamForm, vehicleType: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all text-xs"
                      placeholder="مثال: تويوتا بيضاء دبل قمارة"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">رقم السيارة / اللوحة</label>
                    <input
                      type="text"
                      value={teamForm.vehicleNumber}
                      onChange={(e) => setTeamForm({ ...teamForm, vehicleNumber: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all text-xs"
                      placeholder="مثال: 3543 بغداد"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ملاحظات السيارة (اختياري)</label>
                  <input
                    type="text"
                    value={teamForm.vehicleNotes}
                    onChange={(e) => setTeamForm({ ...teamForm, vehicleNotes: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all text-xs"
                    placeholder="ملاحظات الحالة، السائق المسؤول، لون السيارة..."
                  />
                </div>
              </div>

              {/* عِدَة وأدوات الطاقم */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <label className="font-black text-slate-800 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-600" />
                    عِدَة وأدوات الطاقم المعينة:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddEquipmentRow}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة عدة / أداة
                  </button>
                </div>

                {teamForm.equipment.length === 0 ? (
                  <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs font-bold">
                    لم يتم إدراج أي عِدَة حتى الآن. انقر على "إضافة عدة / أداة" لإضافة عناصر.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs max-h-48 custom-scrollbar">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 font-black">
                        <tr>
                          <th className="p-2.5 w-10 text-center">#</th>
                          <th className="p-2.5">اسم / نوع العدة</th>
                          <th className="p-2.5 w-24">العدد</th>
                          <th className="p-2.5">ملاحظات</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teamForm.equipment.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-2 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleEquipmentChange(idx, 'name', e.target.value)}
                                placeholder="مثال: دريل شحن 24v"
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => handleEquipmentChange(idx, 'quantity', e.target.value)}
                                placeholder="1"
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => handleEquipmentChange(idx, 'notes', e.target.value)}
                                placeholder="ملاحظة أو رقم تسلسلي..."
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveEquipmentRow(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <CheckSquare className="w-4 h-4"/>
                  )}
                  <span>{actionLoading ? 'جاري الحفظ...' : (editingTeamId ? 'تحديث الطاقم' : 'حقن الطاقم')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORKER STATS MODAL */}
      {viewingWorkerStats && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[80] p-4 animate-fade-in">
          <div className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <h4 className="font-black text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-400"/> سجل أعمال وإحصائيات العامل الميداني</h4>
              <button onClick={() => setViewingWorkerStats(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 text-sm flex-1 overflow-y-auto custom-scrollbar bg-white/60 space-y-6">
              <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50 shrink-0">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h5 className="font-black text-xl text-slate-800">{viewingWorkerStats.name}</h5>
                  <span className="text-xs font-bold text-slate-500 mt-1 block flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> تاريخ الإضافة: {new Date(viewingWorkerStats.created_at || new Date()).toLocaleDateString('ar-IQ')}</span>
                </div>
              </div>

              {(() => {
                const { completedInstallations, workerMnts, workerFaults, totalMaintenanceAndFaults } = workerStatsData;
                return (
                  <div className="space-y-6">
                    {/* INSTALLATIONS */}
                    <div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between mb-4">
                        <span className="font-bold text-white flex items-center gap-2"><CheckSquare className="w-4 h-4 text-emerald-400"/> منظومات شارك بتركيبها</span>
                        <span className="font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-400/20 text-lg shadow-sm">{completedInstallations.length}</span>
                      </div>
                      
                      {completedInstallations.length > 0 ? (
                        <div className="space-y-3">
                          {completedInstallations.map(b => {
                            const assignedTeam = teams.find(t => t.id === b.assignedTeamId);
                            const customer = customers.find(c => c.id === b.customerId);
                            const address = b.address || customer?.address || 'غير متوفر';
                            const isSettled = workerSettlements.some(s => 
                              s.workerId === viewingWorkerStats.id && 
                              (s.taskId === b.id || s.bookingId === b.id) &&
                              (s.taskType === 'booking' || !s.taskType)
                            );
                            const inv = invoices.find(i => i.id === b.invoiceId);
                            
                            return (
                              <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all group">
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <h6 className="font-black text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">{b.customerName}</h6>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{b.appointmentDate}</span>
                                  </div>
                                  
                                  <div className="text-[11px] text-slate-600 space-y-1.5 font-bold">
                                    {inv && <p className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-slate-400"/> رقم الفاتورة: <span className="bg-slate-50 px-1 rounded border border-slate-100">{inv.invoiceNumber}</span></p>}
                                    <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-400"/> العنوان: {address}</p>
                                    {assignedTeam && <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-400"/> الطاقم المسؤول: {assignedTeam.name}</p>}
                                  </div>
                                </div>
                                
                                <div className="w-full sm:w-auto shrink-0 flex flex-col items-center gap-2 border-t sm:border-t-0 sm:border-r border-slate-100 pt-3 sm:pt-0 sm:pr-4">
                                  {currentUser?.permissions?.workerSettlement?.approve ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!isSettled) handleToggleSettlement(viewingWorkerStats.id, b.id, b.id, 'booking');
                                      }}
                                      disabled={actionLoading || isSettled}
                                      className={`w-full sm:w-36 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 border ${
                                        isSettled 
                                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700 cursor-not-allowed opacity-80' 
                                          : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95'
                                      }`}
                                    >
                                      <CheckSquare className="w-4 h-4" />
                                      {isSettled ? '✅ تم المحاسبة' : 'محاسبة وأجر'}
                                    </button>
                                  ) : (
                                    isSettled && (
                                      <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl font-black flex items-center gap-2">
                                        <CheckSquare className="w-4 h-4" />
                                        تم المحاسبة
                                      </span>
                                    )
                                  )}
                                  {isSettled && (
                                    <div className="flex flex-col items-center gap-1 mt-2">
                                      <span className="text-[9px] text-emerald-600 font-black bg-emerald-100/50 px-2 py-0.5 rounded-full border border-emerald-200">الرصيد مدفوع 💸</span>
                                      {(() => {
                                        const settlement = workerSettlements.find(s => s.workerId === viewingWorkerStats.id && (s.taskId === b.id || s.bookingId === b.id) && (s.taskType === 'booking' || !s.taskType));
                                        if (settlement && settlement.settledAt) {
                                          return <span className="text-[9px] font-bold text-slate-500 text-center" dir="ltr">{new Date(settlement.settledAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>;
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                          <p className="text-xs text-slate-400 font-bold">لم يشارك في تركيب منظومات بعد.</p>
                        </div>
                      )}
                    </div>

                    {/* MAINTENANCE AND FAULTS */}
                    <div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between mb-4">
                        <span className="font-bold text-white flex items-center gap-2"><Briefcase className="w-4 h-4 text-rose-400"/> صيانات وأعطال أتمها</span>
                        <span className="font-black text-rose-400 bg-rose-400/10 px-3 py-1 rounded-lg border border-rose-400/20 text-lg shadow-sm">{totalMaintenanceAndFaults}</span>
                      </div>
                      
                      {totalMaintenanceAndFaults > 0 ? (
                        <div className="space-y-3">
                          {[...workerMnts.map((m:any) => ({ ...m, _type: 'maintenance', _label: 'صيانة وقائية' })), ...workerFaults.map((f:any) => ({ ...f, _type: 'fault', _label: 'معالجة عطل' }))].map((t:any) => {
                            const customer = customers.find(c => c.id === t.customerId);
                            const address = customer?.address || 'غير متوفر';
                            const isSettled = workerSettlements.some(s => 
                              s.workerId === viewingWorkerStats.id && 
                              s.taskId === t.id &&
                              s.taskType === t._type
                            );
                            const ta = taskAssignments.find(a => a.taskId === t.id && a.taskType === t._type);
                            const assignedTeam = teams.find(team => team.id === ta?.teamId);
                            
                            return (
                              <div key={`${t._type}-${t.id}`} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-300 hover:shadow-md transition-all group">
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <h6 className="font-black text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{customer?.name || 'غير معروف'}</h6>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${t._type === 'fault' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>{t._label}</span>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{t.createdDate || (t.created_at ? new Date(t.created_at).toLocaleDateString('en-CA') : 'غير متوفر')}</span>
                                  </div>
                                  
                                  <div className="text-[11px] text-slate-600 space-y-1.5 font-bold">
                                    <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-400"/> العنوان: {address}</p>
                                    {assignedTeam && <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-400"/> الطاقم المسؤول: {assignedTeam.name}</p>}
                                    {t.description && <p className="flex items-start gap-1.5 text-slate-500"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5"/> التفاصيل: {t.description}</p>}
                                  </div>
                                </div>
                                
                                <div className="w-full sm:w-auto shrink-0 flex flex-col items-center gap-2 border-t sm:border-t-0 sm:border-r border-slate-100 pt-3 sm:pt-0 sm:pr-4">
                                  {currentUser?.permissions?.workerSettlement?.approve ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!isSettled) handleToggleSettlement(viewingWorkerStats.id, t.id, t.id, t._type);
                                      }}
                                      disabled={actionLoading || isSettled}
                                      className={`w-full sm:w-36 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 border ${
                                        isSettled 
                                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700 cursor-not-allowed opacity-80' 
                                          : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95'
                                      }`}
                                    >
                                      <CheckSquare className="w-4 h-4" />
                                      {isSettled ? '✅ تم المحاسبة' : 'محاسبة وأجر'}
                                    </button>
                                  ) : (
                                    isSettled && (
                                      <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl font-black flex items-center gap-2">
                                        <CheckSquare className="w-4 h-4" />
                                        تم المحاسبة
                                      </span>
                                    )
                                  )}
                                  {isSettled && (
                                    <div className="flex flex-col items-center gap-1 mt-2">
                                      <span className="text-[9px] text-emerald-600 font-black bg-emerald-100/50 px-2 py-0.5 rounded-full border border-emerald-200">الرصيد مدفوع 💸</span>
                                      {(() => {
                                        const settlement = workerSettlements.find(s => s.workerId === viewingWorkerStats.id && s.taskId === t.id && s.taskType === t._type);
                                        if (settlement && settlement.settledAt) {
                                          return <span className="text-[9px] font-bold text-slate-500 text-center" dir="ltr">{new Date(settlement.settledAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>;
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                          <p className="text-xs text-slate-400 font-bold">لم يشارك في عمليات صيانة أو أعطال بعد.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-[11px] text-slate-500 font-bold bg-blue-50/80 p-4 rounded-xl border border-blue-100 leading-relaxed flex gap-3 shadow-inner">
                      <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <span>يتم حساب الأعمال المكتملة بناءً على جميع الفرق التي ينتمي أو انتمى إليها هذا العامل والتي أنهت المهمة بنجاح، مما يضمن دقة عالية في حساب المستحقات وعدم نسيان أي سجل.</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SEGMENT 4: PRELIMINARY BOOKINGS */}
      {activeSegment === 'preliminary' && (
        <PreliminaryBookingsSegment 
          permissions={permissions} 
          customers={customers} 
          invoices={invoices}
        />
      )}

      {/* CREATE BOOKING MODAL */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-lg glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h4 className="font-black text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-400"/> حجز وتعيين طاقم تركيب كهروميكانيكي</h4>
              <button 
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setBookingForm({ customerId: '', invoiceId: '', teamId: '', isManualTeam: false, manualLeader: '', manualMembers: [], installationDate: '', appointmentTime: '09:00', notes: '', address: '' });
                }} 
                className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBookingSubmit} className="p-6 md:p-8 text-sm space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white/60">
              
              <div>
                <label className="block font-black text-slate-800 mb-2">العميل لربط الحجز التجهيزي بالمرجع *</label>
                <select
                  value={bookingForm.customerId}
                  onChange={(e) => setBookingForm({ ...bookingForm, customerId: e.target.value, invoiceId: '' })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all"
                  required
                >
                  <option value="">-- اختر العميل المقيد له الفاتورة --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              {bookingForm.customerId && (
                <div className="space-y-4 bg-white/50 p-4 rounded-2xl border border-white shadow-inner">
                  <div>
                    <label className="block font-black text-slate-800 mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-600"/> الفاتورة المرتبطة بالتركيب (اختياري)</label>
                    {invoices.filter(inv => inv.customerId === parseInt(bookingForm.customerId) && inv.status === 'active').length === 0 ? (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <p className="text-amber-800 text-xs font-bold mb-3 flex items-center gap-1">
                          <Info className="w-4 h-4"/>
                          تنبيه: لا توجد فواتير فعالة ومسجلة لهذا العميل. سيتم تسجيله كحجز مبدئي.
                        </p>
                        <select disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-slate-500 font-bold">
                          <option>-- حجز مبدئي (بدون فاتورة) --</option>
                        </select>
                      </div>
                    ) : (
                      <select
                        value={bookingForm.invoiceId}
                        onChange={(e) => setBookingForm({ ...bookingForm, invoiceId: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all"
                      >
                        <option value="">-- حجز مبدئي (بدون فاتورة حالياً) --</option>
                        {invoices
                          .filter(inv => inv.customerId === parseInt(bookingForm.customerId) && inv.status === 'active')
                          .map((inv) => {
                            const isBooked = bookings.some(b => b.invoiceId === inv.id && b.status !== 'cancelled');
                            return (
                              <option key={inv.id} value={inv.id} disabled={isBooked}>
                                فاتورة رقم {inv.invoiceNumber} ({formatIQD(inv.finalAmount)}){isBooked ? ' - (مثبت مسبقاً)' : ''}
                              </option>
                            );
                          })}
                      </select>
                    )}
                  </div>
 
                  {bookingForm.invoiceId && (
                    (() => {
                      const selectedInvoiceDetails = invoices.find(inv => inv.id === parseInt(bookingForm.invoiceId));
                      if (!selectedInvoiceDetails) return null;
                      return (
                        <div className="bg-white border border-emerald-100 p-4 rounded-xl space-y-3 animate-fade-in text-xs shadow-sm">
                          <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
                            <span className="font-black text-slate-800 flex items-center gap-1.5 text-sm">
                              <LayoutGrid className="w-4 h-4 text-amber-500" />
                              المواد والقطع المشتراة:
                            </span>
                            <span className="font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 shadow-sm text-sm font-mono tracking-tighter">
                              {formatIQD(selectedInvoiceDetails.finalAmount)}
                            </span>
                          </div>
                          
                          <div className="max-h-32 overflow-y-auto space-y-2 pr-1 text-xs custom-scrollbar">
                            {selectedInvoiceDetails.items && parseJsonArray(selectedInvoiceDetails.items).length > 0 ? (
                              parseJsonArray(selectedInvoiceDetails.items).map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                  <span className="font-bold text-slate-700">{item.name}</span>
                                  <span className="bg-white border border-slate-200 text-slate-700 font-black px-2 py-1 rounded-md font-mono shadow-sm text-[10px]">
                                    × {item.quantity}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-400 text-xs text-center py-3 font-bold">لا توجد مواد مدرجة في هذه الفاتورة.</p>
                            )}
                          </div>
                          
                          {selectedInvoiceDetails.notes && (
                            <div className="text-xs text-slate-600 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 leading-relaxed font-semibold">
                              <strong>ملاحظة الفاتورة:</strong> {selectedInvoiceDetails.notes}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                  
                  {!bookingForm.invoiceId && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-2xl space-y-4 shadow-sm animate-fade-in">
                      <p className="text-amber-800 text-xs font-black flex items-center gap-2 border-b border-amber-200/50 pb-3">
                        <Sparkles className="w-4 h-4" /> سيتم تسجيل هذا الحجز كحجز مبدئي. يرجى إدخال التفاصيل الأولية للمنظومة أدناه.
                      </p>
                      <div>
                        <label className="block text-xs font-black text-amber-900 mb-1.5">نوع المنظومة / حجم العمل المتوقع *</label>
                        <input type="text" className="w-full bg-white border border-amber-200/60 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 shadow-sm" value={bookingForm.preliminarySystemType || ''} onChange={e => setBookingForm({...bookingForm, preliminarySystemType: e.target.value})} placeholder="مثال: منظومة 5 كيلوواط هايبرد" required={!bookingForm.invoiceId} />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-amber-900 mb-1.5">المبلغ المتوقع / المتفق عليه المبدئي</label>
                        <input type="text" className="w-full bg-white border border-amber-200/60 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 font-mono shadow-sm" value={bookingForm.preliminaryAmount || ''} onChange={e => setBookingForm({...bookingForm, preliminaryAmount: e.target.value})} placeholder="مثال: 5,000,000 د.ع أو $3500" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block font-black text-slate-800">الطاقم الفني المكلّف بالتوجه للميدان *</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, isManualTeam: false })}
                      className={`px-3 py-1.5 rounded-lg transition-all ${!bookingForm.isManualTeam ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      اختيار طاقم جاهز
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, isManualTeam: true })}
                      className={`px-3 py-1.5 rounded-lg transition-all ${bookingForm.isManualTeam ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      تشكيل طاقم مخصص
                    </button>
                  </div>
                </div>

                {!bookingForm.isManualTeam ? (
                  <>
                    <select
                      value={bookingForm.teamId}
                      onChange={(e) => setBookingForm({ ...bookingForm, teamId: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all"
                      required={!bookingForm.isManualTeam}
                    >
                      <option value="">-- اختر طاقم التركيب --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} (المسؤول: {t.leader})</option>
                      ))}
                    </select>

                    {bookingForm.teamId && (
                      (() => {
                        const selectedTeam = teams.find(t => t.id === parseInt(bookingForm.teamId));
                        if (!selectedTeam) return null;
                        const allMembers: string[] = [];
                        if (selectedTeam.leader) allMembers.push(selectedTeam.leader);
                        if (Array.isArray(selectedTeam.members)) {
                          selectedTeam.members.forEach((m: string) => { if (!allMembers.includes(m)) allMembers.push(m); });
                        }
                        return (
                          <div className="mt-3 space-y-3 animate-fade-in">
                            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-3 text-xs shadow-sm">
                              <div className="flex items-center justify-between border-b pb-2.5 border-indigo-100/50">
                                <span className="font-black text-slate-800 flex items-center gap-1.5 text-sm">
                                  <Users className="w-4 h-4 text-indigo-500" />
                                  تفاصيل الطاقم المكلّف:
                                </span>
                                <span className="font-black text-indigo-800 bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200 shadow-sm text-xs">
                                  {selectedTeam.leader || 'لا يوجد مسؤول'}
                                </span>
                              </div>
                              <div className="space-y-2 text-xs text-slate-700">
                                <div className="flex gap-2">
                                  <span className="font-bold text-slate-500 shrink-0">الأعضاء:</span>
                                  <span className="font-semibold leading-relaxed">
                                    {Array.isArray(selectedTeam.members) ? selectedTeam.members.join('، ') : selectedTeam.members}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-bold text-slate-500 shrink-0">الآلية والأسطول:</span>
                                  <span className="font-semibold">{selectedTeam.vehicle || 'غير محدد'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Worker Payment Amounts */}
                            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl shadow-sm">
                              <h4 className="font-black text-slate-800 text-xs mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-amber-600" />
                                تحديد أجور العمال على هذه المهمة
                              </h4>
                              <div className="space-y-2">
                                {allMembers.map((name, idx) => (
                                  <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-amber-100 shadow-sm">
                                    <User className="w-4 h-4 text-slate-500 shrink-0" />
                                    <span className="font-bold text-slate-800 text-xs flex-1">{name}</span>
                                    <div className="flex flex-col items-end gap-1">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="0"
                                          value={workerPaymentAmounts[name] ? Number(workerPaymentAmounts[name]).toLocaleString('en-US') : ''}
                                          onChange={(e) => setWorkerPaymentAmounts(prev => ({ ...prev, [name]: parseInt(e.target.value.replace(/,/g, '')) || 0 }))}
                                          className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono text-left focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                        />
                                        <span className="text-[10px] font-bold text-slate-500 shrink-0">د.ع</span>
                                      </div>
                                      <label className="flex items-center gap-1.5 cursor-pointer mt-1">
                                        <input
                                          type="checkbox"
                                          checked={workerPaidInAdvance[name] || false}
                                          onChange={(e) => setWorkerPaidInAdvance(prev => ({ ...prev, [name]: e.target.checked }))}
                                          className="rounded text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <span className="text-[10px] font-bold text-slate-600">تم محاسبة العامل</span>
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </>
                ) : (
                  <div className="bg-white/60 p-4 rounded-xl border border-slate-200 space-y-4 animate-fade-in shadow-inner">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">أعضاء الطاقم المخصص * (اختر متعدد)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm max-h-32 overflow-y-auto custom-scrollbar">
                        {workers.map(w => (
                          <label key={w.id} className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg border border-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={bookingForm.manualMembers.includes(w.name)}
                              onChange={(e) => {
                                const newMembers = e.target.checked 
                                  ? [...bookingForm.manualMembers, w.name] 
                                  : bookingForm.manualMembers.filter(m => m !== w.name);
                                setBookingForm({ ...bookingForm, manualMembers: newMembers });
                              }}
                              className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700">{w.name}</span>
                          </label>
                        ))}
                        {workers.length === 0 && <span className="text-xs text-rose-500 font-bold col-span-full">لا يوجد عمال متاحين</span>}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">مسؤول الطاقم المخصص *</label>
                      <select
                        value={bookingForm.manualLeader}
                        onChange={(e) => setBookingForm({ ...bookingForm, manualLeader: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                        required={bookingForm.isManualTeam}
                      >
                        <option value="">-- اختر المسؤول --</option>
                        {bookingForm.manualMembers.map((m, idx) => (
                          <option key={idx} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Worker Payment Amounts for Manual Team */}
                    {bookingForm.manualMembers.length > 0 && (
                      <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl shadow-sm">
                        <h4 className="font-black text-slate-800 text-xs mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-amber-600" />
                          تحديد أجور العمال على هذه المهمة
                        </h4>
                        <div className="space-y-2">
                          {bookingForm.manualMembers.map((name, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-amber-100 shadow-sm">
                              <User className="w-4 h-4 text-slate-500 shrink-0" />
                              <span className="font-bold text-slate-800 text-xs flex-1">{name}</span>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="0"
                                    value={workerPaymentAmounts[name] ? workerPaymentAmounts[name].toLocaleString('en-US') : ''}
                                    onChange={(e) => {
                                      const normalizeAmount = (v: string) => {
                                        if (!v) return '';
                                        return v.replace(/[^0-9\u0660-\u0669\u06F0-\u06F9.-]/g, '')
                                                .replace(/[\u0660-\u0669]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
                                                .replace(/[\u06F0-\u06F9]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
                                      };
                                      const val = normalizeAmount(e.target.value).replace(/,/g, '');
                                      const num = parseInt(val);
                                      setWorkerPaymentAmounts(prev => ({ ...prev, [name]: isNaN(num) ? 0 : num }));
                                    }}
                                    className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono text-left focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                  />
                                  <span className="text-[10px] font-bold text-slate-500 shrink-0">د.ع</span>
                                </div>
                                <label className="flex items-center gap-1.5 cursor-pointer mt-1">
                                  <input
                                    type="checkbox"
                                    checked={workerPaidInAdvance[name] || false}
                                    onChange={(e) => setWorkerPaidInAdvance(prev => ({ ...prev, [name]: e.target.checked }))}
                                    className="rounded text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-bold text-slate-600">تم محاسبة العامل</span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block font-black text-slate-800 mb-2">تاريخ التركيب المقترح *</label>
                  <input
                    type="date"
                    value={bookingForm.installationDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, installationDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold font-mono text-slate-700 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-2">وقت الزيارة والمباشرة *</label>
                  <input
                    type="time"
                    value={bookingForm.appointmentTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, appointmentTime: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold font-mono text-slate-700 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-2">شروح وتعليمات كادر الموقع</label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 h-24 resize-none focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-inner font-semibold transition-all"
                  placeholder="مثال: تركيب لوحين طاقة إضافيين وتعديل زوايا التثبيت..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingModalOpen(false);
                    setBookingForm({ customerId: '', invoiceId: '', teamId: '', isManualTeam: false, manualLeader: '', manualMembers: [], installationDate: '', appointmentTime: '09:00', notes: '', address: '' });
                  }}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 transition-all"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || (bookingForm.customerId ? invoices.filter(inv => inv.customerId === parseInt(bookingForm.customerId) && inv.status === 'active').length === 0 : false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Calendar className="w-4 h-4"/>
                  )}
                  <span>تأشير الحجز بالروزنامة</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* INVOICE DETAILS MODAL */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col relative overflow-hidden border border-white/10">
            <div className="p-6 flex items-center justify-between border-b border-white/10 shrink-0">
              <h2 className="text-xl font-black text-amber-500 flex items-center gap-2">
                <Receipt className="w-6 h-6" /> تفاصيل الفاتورة والمنظومة
              </h2>
              <button onClick={() => setViewingInvoice(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
              <div className="space-y-4">
                {/* Customer Section */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                  <h3 className="font-bold text-slate-300 text-sm mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400"/> بيانات الزبون
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium">
                    <div><span className="text-slate-500 block text-xs mb-1">الاسم:</span> <strong className="text-white bg-slate-800 px-3 py-1.5 rounded-lg block">{viewingInvoice.customerName}</strong></div>
                    <div><span className="text-slate-500 block text-xs mb-1">رقم الهاتف:</span> <strong className="text-white font-mono bg-slate-800 px-3 py-1.5 rounded-lg block" dir="ltr">{viewingInvoice.customerPhone || 'غير متوفر'}</strong></div>
                    <div className="md:col-span-2"><span className="text-slate-500 block text-xs mb-1">العنوان:</span> <strong className="text-white bg-slate-800 px-3 py-1.5 rounded-lg block leading-relaxed">{customers.find(c => c.id === viewingInvoice.customerId)?.address || viewingInvoice.customerAddress || 'غير متوفر'}</strong></div>
                  </div>
                </div>
                
                {/* Items Section */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                  <h3 className="font-bold text-emerald-400 text-sm mb-4 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4"/> تفاصيل المواد والمنظومة
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const itemsStr = viewingInvoice.items;
                        const items = typeof itemsStr === 'string' ? JSON.parse(itemsStr) : (itemsStr || []);
                        if(items.length === 0) return <div className="text-slate-500 text-sm bg-slate-800 p-3 rounded-lg">لا توجد مواد مسجلة في الفاتورة</div>;
                        return items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 text-sm">
                            <span className="font-bold text-slate-200">{item.name}</span>
                            <span className="text-slate-300 font-mono text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">الكمية: <strong className="text-white">{item.quantity}</strong></span>
                          </div>
                        ));
                      } catch (e) {
                        return <div className="text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">خطأ في قراءة بيانات المواد</div>;
                      }
                    })()}
                  </div>
                </div>

                {/* Notes Section */}
                {viewingInvoice.notes && (
                  <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20">
                    <h3 className="font-bold text-amber-500 text-sm mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4"/> ملاحظات المبيعات
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed font-medium">{viewingInvoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10 shrink-0 bg-white/5">
              <button 
                onClick={() => setViewingInvoice(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
              >
                إغلاق التفاصيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[80] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center mb-2">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <button onClick={() => setRescheduleModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-800">تأجيل وتعديل موعد الحجز</h2>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  تعديل تاريخ المهمة للزبون: <strong className="text-amber-600">{rescheduleData.customerName}</strong>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ التجهيز الجديد</label>
                  <input 
                    type="date"
                    value={rescheduleData.date}
                    onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold focus:ring-2 focus:ring-amber-500 transition-all text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={submitReschedule}
                    disabled={actionLoading}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-3 rounded-xl shadow-md disabled:opacity-50 transition-all"
                  >
                    {actionLoading ? 'جاري التأجيل...' : 'حفظ موعد التجهيز'}
                  </button>
                  <button
                    onClick={() => setRescheduleModalOpen(false)}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM STATS MODAL */}
      {viewingTeamStats && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-3xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h4 className="font-black text-sm flex items-center gap-2"><History className="w-5 h-5 text-indigo-400"/> إنجازات وتفاصيل طاقم: {viewingTeamStats.name}</h4>
              <button onClick={() => setViewingTeamStats(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              {(() => {
                const isTeamMatch = (b: any) => {
                  if (!b) return false;
                  if (b.assignedTeamId != null && String(b.assignedTeamId) === String(viewingTeamStats.id)) return true;
                  if (b.assignedTeamName && b.assignedTeamName.trim() === viewingTeamStats.name.trim()) return true;
                  if (b.assignedTeamName && b.assignedTeamName.startsWith('مخصص |')) {
                    const parts = b.assignedTeamName.split('|').map((s: string) => s.trim());
                    if (parts.length >= 2 && parts[1] === viewingTeamStats.leader) return true;
                  }
                  return false;
                };

                const teamBookings = bookings.filter(isTeamMatch);
                const completedBookings = teamBookings.filter(b => b.status === 'completed');

                // Maintenance tasks assigned to this team
                const teamMnts = taskAssignments
                  .filter(ta => ta.taskType === 'maintenance' && String(ta.teamId) === String(viewingTeamStats.id))
                  .map(ta => maintenance.find(m => m.id === ta.taskId && (m.status === 'repaired' || m.status === 'closed')))
                  .filter(Boolean);

                // Fault repair tasks assigned to this team
                const teamFaults = taskAssignments
                  .filter(ta => ta.taskType === 'fault' && String(ta.teamId) === String(viewingTeamStats.id))
                  .map(ta => faults.find(f => f.id === ta.taskId && (f.status === 'repaired' || f.status === 'closed')))
                  .filter(Boolean);

                const totalCompletedOps = completedBookings.length + teamMnts.length + teamFaults.length;
                const totalAllOps = teamBookings.length + taskAssignments.filter(ta => String(ta.teamId) === String(viewingTeamStats.id)).length;
                
                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center transform hover:scale-105 transition-all">
                        <div className="text-3xl font-black text-emerald-600 mb-1.5">{completedBookings.length}</div>
                        <div className="text-xs font-bold text-slate-500">منظومات تم تركيبها وتشغيلها</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center transform hover:scale-105 transition-all">
                        <div className="text-3xl font-black text-indigo-600 mb-1.5">{teamMnts.length + teamFaults.length}</div>
                        <div className="text-xs font-bold text-slate-500">صيانات وأعطال أُنجزت</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center transform hover:scale-105 transition-all">
                        <div className="text-3xl font-black text-slate-800 mb-1.5">{totalAllOps}</div>
                        <div className="text-xs font-bold text-slate-500">إجمالي المهام المسندة</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-black text-slate-800 text-sm mb-4 border-b border-slate-200 pb-2.5 flex items-center justify-between">
                        <span>سجل المنظومات المكتملة والتركيبات ({completedBookings.length})</span>
                      </h5>
                      {completedBookings.length === 0 ? (
                        <p className="text-center text-slate-500 text-xs font-bold py-8 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">لم ينجز هذا الطاقم أي منظومات تركيب بعد.</p>
                      ) : (
                        <div className="space-y-3">
                          {completedBookings.map((b, i) => {
                            const customer = customers.find(c => c.id === b.customerId);
                            const address = b.address || customer?.address || 'غير متوفر';
                            return (
                              <div key={b.id || i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs group hover:border-emerald-300 transition-all relative overflow-hidden space-y-2">
                                <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-black text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{b.customerName}</span>
                                    {b.invoiceNumber && <span className="mr-2 font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">فاتورة #{b.invoiceNumber}</span>}
                                  </div>
                                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100 font-mono text-[11px] font-bold">
                                    {b.appointmentDate}
                                  </span>
                                </div>
                                <div className="text-slate-500 font-semibold flex flex-wrap gap-4 text-xs">
                                  <span><strong className="text-slate-700">العنوان:</strong> {address}</span>
                                  {b.appointmentTime && <span><strong className="text-slate-700">الموعد:</strong> {b.appointmentTime.substring(0, 5)}</span>}
                                </div>
                                {b.notes && (
                                  <div className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-medium leading-relaxed">
                                    {b.notes.split('\n').map((line: string, idx: number) => {
                                      if (line.startsWith('[تم التثبيت فعلياً في:')) {
                                        return (
                                          <span key={idx} className="block mt-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-bold flex items-center gap-1.5">
                                            <CheckSquare className="w-3.5 h-3.5" />
                                            {line.replace('[', '').replace(']', '')}
                                          </span>
                                        );
                                      }
                                      return <span key={idx} className="block">{line}</span>;
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {(teamMnts.length > 0 || teamFaults.length > 0) && (
                      <div>
                        <h5 className="font-black text-slate-800 text-sm mb-4 border-b border-slate-200 pb-2.5 flex items-center justify-between">
                          <span>سجل الصيانات والأعطال المنجزة ({teamMnts.length + teamFaults.length})</span>
                        </h5>
                        <div className="space-y-3">
                          {[...teamMnts.map((m: any) => ({ ...m, _label: 'صيانة وقائية', _color: 'indigo' })), ...teamFaults.map((f: any) => ({ ...f, _label: 'معالجة عطل', _color: 'rose' }))].map((t: any, idx: number) => {
                            const customer = customers.find(c => c.id === t.customerId);
                            return (
                              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="font-black text-slate-800 text-sm">{customer?.name || 'غير معروف'}</span>
                                  <span className={`px-2 py-0.5 rounded font-black text-[10px] bg-${t._color}-50 text-${t._color}-700 border border-${t._color}-200`}>{t._label}</span>
                                </div>
                                <div className="text-slate-500 font-semibold text-xs">تاريخ الإنجاز: <span className="font-mono text-slate-700">{t.createdDate || 'غير محدد'}</span></div>
                                {t.description && <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">{t.description}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* EDIT WORKER FEES MODAL */}
      {editingWorkerFeesBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[80] p-4 animate-fade-in">
          <div className="w-full max-w-xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <h4 className="font-black text-sm flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400"/>
                إدارة وتعديل أجور عمال المنظومة
              </h4>
              <button onClick={() => setEditingWorkerFeesBooking(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkerFeesForBooking} className="p-6 text-sm flex-1 overflow-y-auto custom-scrollbar bg-white/60 space-y-5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 text-xs">
                <div className="font-black text-slate-800 text-sm">{editingWorkerFeesBooking.customerName}</div>
                <div className="text-slate-500 font-medium">تاريخ الحجز: <span className="font-mono text-slate-700">{editingWorkerFeesBooking.appointmentDate}</span> | الطاقم: <span className="font-bold text-slate-700">{editingWorkerFeesBooking.assignedTeamName}</span></div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <h5 className="font-black text-slate-800 text-xs flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    تحديد أجور وحالة حساب العمال
                  </h5>
                  <span className="text-[10px] font-bold text-slate-500">أدخل الأجر بالدينار العراقي (IQD)</span>
                </div>

                {(() => {
                  const { workerDetails } = getBookingWorkerDetails(editingWorkerFeesBooking);
                  if (workerDetails.length === 0) {
                    return (
                      <p className="text-xs text-rose-500 font-bold bg-white p-3 rounded-xl border border-rose-200 text-center">
                        لا يوجد عمال مرتبطين بهذا الطاقم حالياً. قم بإدراج أسماء عمال في قائمة العمال.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2.5">
                      {workerDetails.map((w, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                          <User className="w-4 h-4 text-slate-500 shrink-0" />
                          <div className="flex-1">
                            <span className="font-bold text-slate-800 text-xs">{w.name}</span>
                            {w.isLeader && <span className="mr-1.5 text-[9px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">مسؤول</span>}
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="0"
                                value={editingBookingWorkerFees[w.name] ? editingBookingWorkerFees[w.name].toLocaleString('en-US') : ''}
                                onChange={(e) => {
                                  const normalizeAmount = (v: string) => {
                                    if (!v) return '';
                                    return v.replace(/[^0-9\u0660-\u0669\u06F0-\u06F9.-]/g, '')
                                            .replace(/[\u0660-\u0669]/g, d => '٠١٢٣٥٦٧٨٩'.indexOf(d).toString())
                                            .replace(/[\u06F0-\u06F9]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
                                  };
                                  const val = normalizeAmount(e.target.value).replace(/,/g, '');
                                  const num = parseInt(val);
                                  setEditingBookingWorkerFees(prev => ({ ...prev, [w.name]: isNaN(num) ? 0 : num }));
                                }}
                                className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono text-left focus:ring-2 focus:ring-amber-400 focus:outline-none"
                              />
                              <span className="text-[10px] font-bold text-slate-500 shrink-0">د.ع</span>
                            </div>

                            <label className="flex items-center gap-1.5 cursor-pointer mt-1">
                              <input
                                type="checkbox"
                                checked={editingBookingWorkerPaidInAdvance[w.name] || false}
                                onChange={(e) => setEditingBookingWorkerPaidInAdvance(prev => ({ ...prev, [w.name]: e.target.checked }))}
                                className="rounded text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="text-[10px] font-bold text-slate-600">تم محاسبة العامل</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setEditingWorkerFeesBooking(null)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <CheckSquare className="w-4 h-4"/>
                  )}
                  <span>حفظ وتثبيت الأجور</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM PRINT PREVIEW MODAL — rendered via Portal to document.body */}
      {isTeamPrintPreviewOpen && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)' }}
          dir="rtl"
        >
          {/* Controls Bar */}
          <div style={{ background: '#0f172a', color: 'white', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.3)', flexShrink: 0 }}>
                <Printer size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#f1f5f9' }}>معاينة وإعدادات طباعة طواقم التركيب والعِدة</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>يمكنك تعديل التاريخ والعنوان والملاحظات فورياً قبل تنفيذ الطباعة</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              {/* Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '8px 12px', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 900 }}>تاريخ الطباعة:</span>
                <input
                  type="text"
                  value={teamPrintCustomDate}
                  onChange={(e) => setTeamPrintCustomDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  style={{ background: '#020617', color: 'white', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #475569', outline: 'none', width: 140, textAlign: 'center' }}
                />
                <input
                  type="date"
                  value={teamPrintCustomDate}
                  onChange={(e) => setTeamPrintCustomDate(e.target.value)}
                  style={{ background: '#020617', color: '#10b981', fontWeight: 700, fontSize: 12, padding: 6, borderRadius: 8, border: '1px solid #475569', cursor: 'pointer', width: 36 }}
                  title="اختر تاريخ من الرزنامة"
                />
                <button
                  type="button"
                  onClick={() => setTeamPrintCustomDate(new Date().toISOString().split('T')[0])}
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', fontWeight: 700, fontSize: 11, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }}
                >
                  اليوم
                </button>
              </div>

              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '8px 12px', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 900 }}>عنوان الوثيقة:</span>
                <input
                  type="text"
                  value={teamPrintCustomTitle}
                  onChange={(e) => setTeamPrintCustomTitle(e.target.value)}
                  style={{ background: '#020617', color: 'white', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #475569', outline: 'none', width: 220 }}
                />
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '8px 12px', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 900 }}>ملاحظات:</span>
                <input
                  type="text"
                  value={teamPrintCustomNotes}
                  onChange={(e) => setTeamPrintCustomNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  style={{ background: '#020617', color: 'white', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #475569', outline: 'none', width: 176 }}
                />
              </div>

              {/* Print */}
              <button
                type="button"
                onClick={handleTriggerTeamPrint}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#10b981,#0d9488)', color: 'white', fontWeight: 900, borderRadius: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: '1px solid rgba(16,185,129,0.4)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}
              >
                <Printer size={16} />
                طباعة الآن
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsTeamPrintPreviewOpen(false)}
                style={{ padding: 10, background: '#1e293b', color: '#94a3b8', borderRadius: 12, border: '1px solid #334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="إغلاق المعاينة"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Paper Preview */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', background: '#020617', display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'white', color: '#0f172a', width: '100%', maxWidth: '210mm', minHeight: '297mm', padding: '48px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', fontFamily: 'Arial, sans-serif', fontSize: 12, direction: 'rtl' }}>
              {(printingTeam === 'all' ? teams : (printingTeam ? [printingTeam] : [])).map((teamItem: any, tIdx: number) => {
                const eqList: any[] = Array.isArray(teamItem.equipment)
                  ? teamItem.equipment
                  : (typeof teamItem.equipment === 'string'
                    ? JSON.parse(teamItem.equipment || '[]')
                    : []);
                const membersList = Array.isArray(teamItem.members)
                  ? teamItem.members
                  : (teamItem.members ? String(teamItem.members).split(/[,،]+/).map((m: string) => m.trim()) : []);
                return (
                  <div key={teamItem.id || tIdx} style={tIdx > 0 ? { marginTop: 48, paddingTop: 32, borderTop: '2px solid #94a3b8' } : {}}>
                    {/* Header */}
                    <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <img src="/images/anwar-logo-dark.png" alt="Logo" style={{ height: 64, width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 900 }}>أنوار الإبداع للطاقة الشمسية</div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>سند رسمية وتسلّم عِدَة وأدوات طواقم التركيبات الميدانية</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>
                        <div style={{ fontWeight: 700 }}>التاريخ: {teamPrintCustomDate}</div>
                        <div style={{ color: '#475569', marginTop: 4 }}>رمز الطاقم: #{teamItem.id}</div>
                      </div>
                    </div>

                    {/* Title */}
                    <div style={{ marginBottom: 24, textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 900, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
                        {teamPrintCustomTitle || `سند استلام عِدَة وطاقم تركيب: ${teamItem.name}`}
                      </div>
                    </div>

                    {/* Team Info */}
                    <div style={{ border: '2px solid #0f172a', padding: 16, borderRadius: 12, marginBottom: 24, background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>اسم الطاقم:</div>
                        <div style={{ fontSize: 16, fontWeight: 900 }}>{teamItem.name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>القائد / المسؤول:</div>
                        <div style={{ fontSize: 16, fontWeight: 900 }}>{teamItem.leader || 'غير محدد'}</div>
                      </div>
                      <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, marginBottom: 4 }}>كادر وفنيو الفريق:</div>
                        <div style={{ fontWeight: 700, fontSize: 12 }}>{membersList.length > 0 ? membersList.join(' ، ') : 'لا يوجد أعضاء مسجلين'}</div>
                      </div>
                    </div>

                    {/* Vehicle */}
                    <div style={{ border: '1px solid #0f172a', padding: 16, borderRadius: 12, marginBottom: 24, background: 'white' }}>
                      <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8, textDecoration: 'underline' }}>تفاصيل مركبة / سيارة الطاقم:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
                        <div>
                          <div style={{ color: '#475569', fontSize: 11, fontWeight: 700 }}>النوع / الموديل:</div>
                          <div style={{ fontWeight: 900 }}>{teamItem.vehicleType || teamItem.vehicle || 'غير محدد'}</div>
                        </div>
                        <div>
                          <div style={{ color: '#475569', fontSize: 11, fontWeight: 700 }}>رقم اللوحة:</div>
                          <div style={{ fontWeight: 900, fontFamily: 'monospace' }}>{teamItem.vehicleNumber || 'غير محدد'}</div>
                        </div>
                        <div>
                          <div style={{ color: '#475569', fontSize: 11, fontWeight: 700 }}>ملاحظات:</div>
                          <div style={{ fontWeight: 700 }}>{teamItem.vehicleNotes || 'لا توجد'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Equipment Table */}
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                        <span>جدول العِدَة والأدوات المسلّمة للطاقم:</span>
                        <span style={{ fontSize: 12, fontWeight: 400, color: '#475569' }}>عدد العناصر: {eqList.length}</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #0f172a', textAlign: 'right', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#e2e8f0', fontWeight: 900, borderBottom: '2px solid #0f172a' }}>
                            <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: 40, textAlign: 'center' }}>#</th>
                            <th style={{ border: '1px solid #0f172a', padding: '8px 10px' }}>اسم / نوع العدة والأداة</th>
                            <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: 80, textAlign: 'center' }}>العدد</th>
                            <th style={{ border: '1px solid #0f172a', padding: '8px 10px' }}>ملاحظات / الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eqList.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ border: '1px solid #0f172a', padding: 16, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                لم يتم تسجيل أي عِدَة أو أدوات لهذا الطاقم.
                              </td>
                            </tr>
                          ) : (
                            eqList.map((eqItem: any, eqIdx: number) => (
                              <tr key={eqIdx} style={{ background: eqIdx % 2 === 1 ? '#f8fafc' : 'white' }}>
                                <td style={{ border: '1px solid #94a3b8', padding: '7px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{eqIdx + 1}</td>
                                <td style={{ border: '1px solid #94a3b8', padding: '7px 10px', fontWeight: 900 }}>{eqItem.name}</td>
                                <td style={{ border: '1px solid #94a3b8', padding: '7px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900 }}>{eqItem.quantity || 1}</td>
                                <td style={{ border: '1px solid #94a3b8', padding: '7px 10px', color: '#334155' }}>{eqItem.notes || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {teamPrintCustomNotes && (
                      <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                        ملاحظة: {teamPrintCustomNotes}
                      </div>
                    )}

                    {/* Signatures */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, paddingTop: 24, borderTop: '2px solid #0f172a', textAlign: 'center', fontSize: 12, fontWeight: 900, marginTop: 32 }}>
                      {['توقيع مسؤول الطاقم (المستلم)', 'توقيع أمين المخزن (المسلّم)', 'توقيع وتصديق الإدارة'].map(lbl => (
                        <div key={lbl}>
                          <div style={{ marginBottom: 40, color: '#1e293b' }}>{lbl}</div>
                          <div style={{ color: '#94a3b8' }}>......................................</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* TEAM EXPENSES MANAGEMENT MODAL */}
      {viewingTeamExpenses && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[75] p-4 animate-fade-in">
          <div className="w-full max-w-4xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-slate-100 px-6 md:px-8 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base flex items-center gap-2 text-white">
                    سجل ميزانيات وصرفيات طاقم: <span className="text-emerald-400 font-bold">{viewingTeamExpenses.name}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">متابعة الكروت المصروفة وتدقيق الأغراض والمصاريف المتبقية</p>
                </div>
              </div>

              <button 
                onClick={() => setViewingTeamExpenses(null)} 
                className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-2 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              
              {/* Total Summary Cards Bar */}
              {(() => {
                const grandTotalAllocated = teamExpenseCards.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
                const grandTotalSpent = teamExpenseCards.reduce((sum, c) => sum + (c.spentAmount || 0), 0);
                const grandTotalRemaining = grandTotalAllocated - grandTotalSpent;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-bold block">إجمالي الميزانيات المضافة:</span>
                        <span className="text-lg font-black text-blue-600 font-mono">{formatIQD(grandTotalAllocated)}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-bold block">مجموع المصروف الموثّق:</span>
                        <span className="text-lg font-black text-amber-600 font-mono">{formatIQD(grandTotalSpent)}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${grandTotalRemaining >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        <Coins className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-bold block">المبلغ المتبقي الكلي:</span>
                        <span className={`text-lg font-black font-mono ${grandTotalRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatIQD(grandTotalRemaining)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Header to Add New Expense Card */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <h5 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  كروت الميزانية والصرفيات ({teamExpenseCards.length})
                </h5>

                <button
                  onClick={() => setIsAddCardOpen(!isAddCardOpen)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> {isAddCardOpen ? 'إلغاء النافذة' : 'إضافة كارت ميزانية جديد'}
                </button>
              </div>

              {/* Add Card Form Drawer */}
              {isAddCardOpen && (
                <form onSubmit={handleCreateExpenseCard} className="bg-white p-6 rounded-2xl border-2 border-emerald-500/30 shadow-md space-y-4 animate-fade-in">
                  <h6 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> بيانات كارت الميزانية الجديد:
                  </h6>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الكارت / الغرض *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: ميزانية تركيب مشروع حي الجامعة"
                        value={newCardForm.title}
                        onChange={e => setNewCardForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المضاف (دينار) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="200,000"
                        value={newCardForm.totalAmount ? Number(newCardForm.totalAmount).toLocaleString('en-US') : ''}
                        onChange={e => { const val = e.target.value.replace(/,/g, ''); if (!isNaN(Number(val)) || val === '') setNewCardForm(prev => ({ ...prev, totalAmount: val })); }}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الكارت</label>
                      <input
                        type="date"
                        required
                        value={newCardForm.cardDate}
                        onChange={e => setNewCardForm(prev => ({ ...prev, cardDate: e.target.value }))}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الكارت (اختياري)</label>
                    <input
                      type="text"
                      placeholder="أي ملاحظات إضافية عن الغرض من المبلغ"
                      value={newCardForm.notes}
                      onChange={e => setNewCardForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddCardOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? 'جاري الحفظ...' : 'حفظ وإضافة الكارت'}
                    </button>
                  </div>
                </form>
              )}

              {/* Cards Grid */}
              {teamExpensesLoading ? (
                <div className="text-center py-12 text-slate-500 text-xs font-bold flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>تحميل كروت الصرفيات...</span>
                </div>
              ) : teamExpenseCards.length === 0 ? (
                <div className="bg-white text-center py-12 rounded-2xl border border-slate-200 text-slate-400 font-bold text-xs">
                  لا توجد كروت صرفيات مسجلة لهذا الطاقم حالياً. اضغط "إضافة كارت ميزانية جديد" للبدء.
                </div>
              ) : (
                <div className="space-y-4">
                  {teamExpenseCards.map(card => {
                    const isExpanded = expandedCardId === card.id;
                    const percentSpent = card.totalAmount > 0 ? Math.min(100, Math.round((card.spentAmount / card.totalAmount) * 100)) : 0;
                    const isOverBudget = card.remainingAmount < 0;

                    return (
                      <div key={card.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300">
                        
                        {/* Card Main View */}
                        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-white to-slate-50/50">
                          
                          {/* Card Title & Meta */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">{card.title}</span>
                              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                {card.cardDate}
                              </span>
                            </div>
                            {card.notes && (
                              <p className="text-slate-500 text-xs font-medium">{card.notes}</p>
                            )}
                            <p className="text-[10px] text-slate-400">بواسطة: {card.createdBy || 'النظام'}</p>
                          </div>

                          {/* Card Financial Totals */}
                          <div className="flex items-center gap-4 bg-slate-100/70 p-3 rounded-xl border border-slate-200 text-xs shrink-0">
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block">المبلغ المضاف:</span>
                              <span className="font-black font-mono text-slate-900">{formatIQD(card.totalAmount)}</span>
                            </div>

                            <div className="h-7 w-px bg-slate-300"></div>

                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block">المصروف:</span>
                              <span className="font-black font-mono text-amber-700">{formatIQD(card.spentAmount)}</span>
                            </div>

                            <div className="h-7 w-px bg-slate-300"></div>

                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block">المتبقي:</span>
                              <span className={`font-black font-mono px-2 py-0.5 rounded-lg ${isOverBudget ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                                {formatIQD(card.remainingAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                              className={`px-3.5 py-2 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                                isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>جدول الصرفيات ({card.items?.length || 0})</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleDeleteExpenseCard(card.id)}
                              className="p-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-xl transition-all cursor-pointer"
                              title="حذف الكارت"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-rose-500' : percentSpent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${percentSpent}%` }}
                          ></div>
                        </div>

                        {/* Expanded Items Table & Form */}
                        {isExpanded && (
                          <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4 animate-fade-in">
                            
                            {/* Add Item Form */}
                            <form 
                              onSubmit={(e) => handleAddExpenseItem(card.id, e)} 
                              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
                            >
                              <h6 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5 text-emerald-600" /> إضافة غرض / مصروف جديد لهذا الكارت:
                              </h6>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div className="md:col-span-1">
                                  <input
                                    type="text"
                                    required
                                    placeholder="اسم الغرض / البيان (مثال: شراء أسلاك وتثبيت)"
                                    value={newItemForm[card.id]?.description || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setNewItemForm(prev => ({
                                        ...prev,
                                        [card.id]: {
                                          description: val,
                                          amount: prev[card.id]?.amount || '',
                                          itemDate: prev[card.id]?.itemDate || new Date().toISOString().split('T')[0]
                                        }
                                      }));
                                    }}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>

                                <div>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    placeholder="المبلغ المصروف (دينار)"
                                    value={newItemForm[card.id]?.amount ? Number(newItemForm[card.id]?.amount).toLocaleString('en-US') : ''}
                                    onChange={e => {
                                      const val = e.target.value.replace(/,/g, '');
                                      if (!isNaN(Number(val)) || val === '') {
                                        setNewItemForm(prev => ({
                                          ...prev,
                                          [card.id]: {
                                            description: prev[card.id]?.description || '',
                                            amount: val,
                                            itemDate: prev[card.id]?.itemDate || new Date().toISOString().split('T')[0]
                                          }
                                        }));
                                      }
                                    }}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono text-amber-800 outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    required
                                    value={newItemForm[card.id]?.itemDate || new Date().toISOString().split('T')[0]}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setNewItemForm(prev => ({
                                        ...prev,
                                        [card.id]: {
                                          description: prev[card.id]?.description || '',
                                          amount: prev[card.id]?.amount || '',
                                          itemDate: val
                                        }
                                      }));
                                    }}
                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                                  />

                                  <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-slate-900 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
                                  >
                                    خصم وتسجيل
                                  </button>
                                </div>
                              </div>
                            </form>

                            {/* Items List Table */}
                            {card.items && card.items.length > 0 ? (
                              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <table className="w-full text-right text-xs">
                                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="p-2.5 w-10 text-center">#</th>
                                      <th className="p-2.5 w-28">التاريخ</th>
                                      <th className="p-2.5">بيان الغرض / المصروف</th>
                                      <th className="p-2.5 w-36 text-center">المبلغ المصروف</th>
                                      <th className="p-2.5 w-28 text-center">بواسطة</th>
                                      <th className="p-2.5 w-12 text-center">إجراء</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {card.items.map((item: any, idx: number) => (
                                      <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-2 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                                        <td className="p-2 font-mono text-slate-600 text-[11px]">{item.itemDate}</td>
                                        <td className="p-2 font-bold text-slate-900">{item.description}</td>
                                        <td className="p-2 text-center font-mono font-bold text-amber-700">{formatIQD(item.amount)}</td>
                                        <td className="p-2 text-center text-slate-500 text-[11px]">{item.createdBy || '-'}</td>
                                        <td className="p-2 text-center">
                                          <button
                                            onClick={() => handleDeleteExpenseItem(card.id, item.id)}
                                            className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                            title="حذف المصروف"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-black">
                                    <tr>
                                      <td colSpan={3} className="p-2.5 text-slate-800 text-left">مجموع المصروفات بهذا الكارت:</td>
                                      <td className="p-2.5 text-center font-mono text-amber-800 text-sm">{formatIQD(card.spentAmount)}</td>
                                      <td colSpan={2}></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            ) : (
                              <p className="text-center py-6 text-slate-400 text-xs font-bold italic bg-white rounded-xl border border-slate-200">
                                لا توجد مصروفات مسجلة بهذا الكارت بعد.
                              </p>
                            )}

                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* PRINT PORTAL */}
      {renderPrintPortal()}
    </div>
  );
}
