/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import {
  Users, Calendar, Plus, Search, MapPin, CheckSquare, Check, History,
  Trash2, X, Sparkles, User, Info, LayoutGrid, Clock, Briefcase, Phone, Receipt, Eye, DollarSign
} from 'lucide-react';

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
  
  const [activeSegment, setActiveSegment] = useState<'calendar' | 'teams' | 'workers'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [bookingTab, setBookingTab] = useState<'pending' | 'completed' | 'cancelled'>('pending');
  const [viewingTeamStats, setViewingTeamStats] = useState<any>(null);
  const [workerLimit, setWorkerLimit] = useState(50);
  const [workersReady, setWorkersReady] = useState(false);

  const handleSegmentChange = (segment: 'calendar' | 'teams' | 'workers') => {
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
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<any[]>([]);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [viewingWorkerStats, setViewingWorkerStats] = useState<any>(null);

  // Teams form state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [teamForm, setTeamForm] = useState<{name: string; leader: string; members: string[]; vehicleType: string; vehicleNumber: string}>({
    name: '',
    leader: '',
    members: [],
    vehicleType: '',
    vehicleNumber: ''
  });

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
    address: ''
  });
  
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ id: 0, date: '', customerName: '' });

  const workerStatsData = React.useMemo(() => {
    if (!viewingWorkerStats) return { completedInstallations: [], workerMnts: [], workerFaults: [], totalMaintenanceAndFaults: 0 };
    
    const workerTeams = teams.filter(t => t.leader === viewingWorkerStats.name || (Array.isArray(t.members) ? t.members.includes(viewingWorkerStats.name) : t.members?.includes(viewingWorkerStats.name)));
    const teamIds = workerTeams.map(t => t.id);

    const isCustomTeamMatch = (teamName: string, workerName: string) => {
      if (!teamName || !teamName.startsWith('مخصص |')) return false;
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

  const loadCoreData = async () => {
    try {
      setLoading(true);
      const [tRes, bRes, cRes, iRes] = await Promise.all([
        api.getTeams().catch(() => []),
        api.getBookings().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getInvoices().catch(() => [])
      ]);

      setTeams(Array.isArray(tRes) ? tRes : []);
      setBookings(Array.isArray(bRes) ? bRes : []);
      setCustomers(Array.isArray(cRes) ? cRes.filter((c: any) => !c.isDeleted) : []);
      setInvoices(Array.isArray(iRes) ? iRes : []);
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
      const [wRes, wsRes, mntRes, faultRes, taRes] = await Promise.all([
        api.getWorkers().catch(() => []),
        api.getWorkerSettlements().catch(() => []),
        api.getMaintenance().catch(() => []),
        api.getFaults().catch(() => []),
        api.getTaskAssignments?.().catch(() => []) || []
      ]);

      setWorkers(Array.isArray(wRes) ? wRes : []);
      setWorkerSettlements(Array.isArray(wsRes) ? wsRes : []);
      setMaintenance(Array.isArray(mntRes) ? mntRes : []);
      setFaults(Array.isArray(faultRes) ? faultRes : []);
      setTaskAssignments(Array.isArray(taRes) ? taRes : []);
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
        vehicle: formattedVehicle
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
      setTeamForm({ name: '', leader: '', members: [], vehicleType: '', vehicleNumber: '' });
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
    setTeamForm({
      name: t.name || '',
      leader: t.leader || '',
      members: Array.isArray(t.members) ? t.members : (t.members ? t.members.split('،').map((m:string)=>m.trim()) : []),
      vehicleType: t.vehicle ? t.vehicle.split(' - ')[0] || '' : '',
      vehicleNumber: t.vehicle ? t.vehicle.split(' - ')[1] || '' : ''
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

    if (!customerId || !invoiceId || !installationDate) {
      toast.error('يرجى تحديد العميل، الفاتورة والتاريخ');
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
      const payload: any = {
        customerId: parseInt(customerId),
        invoiceId: parseInt(invoiceId),
        appointmentDate: installationDate,
        appointmentTime: appointmentTime + ':00',
        notes: bookingForm.notes?.trim() || ''
      };

      if (isManual) {
        // إرسال بيانات الطاقم المخصص مباشرة بدون إنشاء سجل طاقم
        payload.customTeamLeader = bookingForm.manualLeader;
        payload.customTeamMembers = bookingForm.manualMembers;
      } else {
        payload.assignedTeamId = parseInt(teamId);
      }

      const created = await api.createBooking(payload);
      toast.success('تم حجز وتثبيت موعد تركيب المنظومة بنجاح في تقويم الشركة الكلي!');
      setIsBookingModalOpen(false);
      setBookingForm({ customerId: '', invoiceId: '', teamId: '', isManualTeam: false, manualLeader: '', manualMembers: [], installationDate: '', appointmentTime: '09:00', notes: '', address: '' });
      setBookings(prev => [...prev, created]);
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
      toast.success('تم تأجيل تاريخ الحجز بنجاح');
      setBookings(prev => prev.map(b => b.id === rescheduleData.id ? updated : b));
      setRescheduleModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'فشل التعديل');
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

  const displayedWorkers = filteredWorkers.slice(0, workerLimit);

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
            onClick={() => handleSegmentChange('workers')}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeSegment === 'workers' ? 'bg-slate-900 text-amber-500 shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            إدارة العمال
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

          {activeSegment === 'teams' && permissions.installationTeams?.create && (
            <button 
              onClick={() => setIsTeamModalOpen(true)}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-200/50 active:scale-95 flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-white"/>
              إضافة طاقم تركيب جديد
            </button>
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
                      activeTabBookings.map((b) => (
                        <div key={b.id} className="p-5 rounded-2xl border border-white/80 bg-white/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all text-sm group">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div>
                              <h4 className="font-black text-slate-900 text-base group-hover:text-emerald-600 transition-colors">{b.customerName}</h4>
                              <div className="text-xs text-slate-500 mt-2 font-bold space-y-1">
                                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> تاريخ المهمة: <span className="font-mono text-slate-800">{b.appointmentDate}</span></div>
                                {b.appointmentTime && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> وقت التركيب: <span className="font-mono text-slate-800">{b.appointmentTime.substring(0, 5)}</span></div>}
                                {(() => {
                                  const inv = invoices.find(i => i.id === b.invoiceId);
                                  return (
                                    <>
                                      {b.invoiceNumber && <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> رقم الفاتورة: <span className="font-mono text-slate-800 bg-white/80 px-1.5 rounded">{b.invoiceNumber}</span></div>}
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
                      ))
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {teams.map((t) => (
                      <div key={t.id} className="glass-card rounded-[2rem] p-6 md:p-8 border border-white/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-5">
                        <div className="flex items-center gap-4 border-b border-white/60 pb-5">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-base">{t.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-1 font-bold">رمز الطاقم: <span className="font-mono bg-white/60 px-1.5 py-0.5 rounded shadow-sm border border-slate-100">{t.id}</span></p>
                          </div>
                        </div>

                        <div className="space-y-4 text-xs font-semibold">
                          <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                            <span className="text-slate-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> مسؤول الفريق:</span>
                            <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl shadow-sm">{t.leader || 'غير معين'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 flex items-center gap-1.5 mb-2"><Users className="w-3.5 h-3.5"/> المهندسين والفنيين المعينين:</span>
                            <p className="text-slate-700 bg-white/60 p-3.5 rounded-xl border border-white shadow-inner leading-relaxed">
                              {Array.isArray(t.members) ? t.members.join('، ') : t.members}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 flex items-center gap-1.5 mb-1.5"><Briefcase className="w-3.5 h-3.5"/> آلية التجهيز والأسطول:</span>
                            <p className="text-slate-800 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-100 font-bold">{t.vehicle || 'لم يثبت رقم السيارة'}</p>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-200/50 mt-5 flex flex-col sm:flex-row gap-2">
                          <button 
                            onClick={() => setViewingTeamStats(t)}
                            className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-500 hover:text-white text-indigo-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            title="سجل التفاصيل"
                          >
                            <History className="w-4 h-4"/> إنجازات
                          </button>
                          {permissions.installationTeams?.edit && (
                            <button 
                              onClick={() => openEditTeamModal(t)}
                              className="flex-1 py-2 bg-slate-50 hover:bg-slate-800 hover:text-white text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                              تعديل
                            </button>
                          )}
                          {permissions.installationTeams?.delete && (
                            <button 
                              onClick={() => handleDeleteTeam(t.id)}
                              className="py-2 px-3 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 font-bold rounded-xl transition-all flex items-center justify-center"
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

            {/* SEGMENT 3: WORKERS DIRECTORY */}
            {activeSegment === 'workers' && (
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-[2rem] border border-white/80 shadow-sm flex flex-col sm:flex-row items-end gap-4">
                  <div className="flex-1 w-full">
                    <label className="block font-black text-slate-800 mb-2">إضافة عامل جديد للأسطول الفني</label>
                    <input
                      type="text"
                      value={newWorkerName}
                      onChange={(e) => setNewWorkerName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold"
                      placeholder="اسم العامل (مثال: محمد، علي، عباس...)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddWorker(e as any);
                      }}
                    />
                  </div>
                  <button
                    onClick={handleAddWorker}
                    disabled={actionLoading || !newWorkerName.trim()}
                    className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5"/> إضافة
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {!workersReady ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 font-bold bg-white/40 rounded-3xl border border-white border-dashed">
                      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      جاري تحميل قائمة العمال...
                    </div>
                  ) : filteredWorkers.length === 0 ? (
                     <div className="col-span-full text-center py-12 text-slate-400 font-bold bg-white/40 rounded-3xl border border-white border-dashed">
                       {workers.length === 0 ? "لم يتم إضافة أي عمال حتى الآن. قم بإضافة أسماء العمال من الأعلى ليتم استخدامهم في تشكيل الطواقم." : "لا توجد نتائج مطابقة للبحث."}
                     </div>
                  ) : (
                    <>
                      {displayedWorkers.map(w => (
                      <div key={w.id} className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all group">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-slate-800 text-base flex items-center gap-2">
                            <User className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform"/> {w.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewingWorkerStats(w)} className="text-blue-500 hover:bg-blue-100 p-2 rounded-xl transition-all" title="إحصائيات الإنجاز والمشاركات">
                              <Eye className="w-4 h-4" />
                            </button>
                            {permissions.installationTeams?.delete && (
                              <button onClick={() => handleDeleteWorker(w.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all" title="إزالة العامل نهائياً">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mr-7">معرف النظام: {w.id}</div>
                      </div>
                    ))}
                    </>
                  )}
                </div>

                {!workersLoading && workersLoaded && workersReady && displayedWorkers.length === 0 && (
                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={() => setWorkerLimit(prev => prev + 50)}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      عرض المزيد ({filteredWorkers.length - displayedWorkers.length} متبقي)
                    </button>
                  </div>
                )}
              </div>
            )}
      </div>

      {/* CREATE TEAM MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between border-b border-white/10">
              <h4 className="font-black text-sm flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400"/> تسجيل طاقم تركيبات كهرضوئية</h4>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleTeamSubmit} className="p-6 md:p-8 text-sm space-y-5 bg-white/60">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white border border-slate-200 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col justify-end">
                  <label className="block font-black text-slate-800 mb-2">نوع السيارة أو الآلية</label>
                  <input
                    type="text"
                    value={teamForm.vehicleType}
                    onChange={(e) => setTeamForm({ ...teamForm, vehicleType: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all"
                    placeholder="مثال: تويوتا بيضاء دبل قمارة"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block font-black text-slate-800 mb-2">رقم السيارة</label>
                  <input
                    type="text"
                    value={teamForm.vehicleNumber}
                    onChange={(e) => setTeamForm({ ...teamForm, vehicleNumber: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all"
                    placeholder="مثال: 3543 بغداد"
                  />
                </div>
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

      {/* CREATE TEAM MODAL */}
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
                    <label className="block font-black text-slate-800 mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-600"/> الفاتورة المرتبطة بالتركيب *</label>
                    {invoices.filter(inv => inv.customerId === parseInt(bookingForm.customerId) && inv.status === 'active').length === 0 ? (
                      <p className="text-rose-700 text-xs mt-1 bg-rose-50/80 p-3 rounded-xl border border-rose-200 font-bold shadow-sm">
                        تنبيه: لا توجد فواتير فعالة ومسجلة لهذا العميل. يجب إنشاء فاتورة مبيعات أولاً لحجز تركيب.
                      </p>
                    ) : (
                      <select
                        value={bookingForm.invoiceId}
                        onChange={(e) => setBookingForm({ ...bookingForm, invoiceId: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-bold transition-all"
                        required
                      >
                        <option value="">-- اختر الفاتورة --</option>
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
                        return (
                          <div className="mt-3 bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-3 animate-fade-in text-xs shadow-sm">
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
                        );
                      })()
                    )}
                  </>
                ) : (
                  <div className="bg-white/60 p-4 rounded-xl border border-slate-200 space-y-4 animate-fade-in shadow-inner">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">أعضاء الطاقم המخصص * (اختر متعدد)</label>
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
                      <label className="block text-xs font-black text-slate-700 mb-1.5">مسؤول الطاقم המخصص *</label>
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
          <div className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h4 className="font-black text-sm flex items-center gap-2"><History className="w-4 h-4 text-indigo-400"/> إنجازات وتفاصيل طاقم: {viewingTeamStats.name}</h4>
              <button onClick={() => setViewingTeamStats(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              {(() => {
                const teamBookings = bookings.filter(b => b.assignedTeamId === viewingTeamStats.id);
                const completedBookings = teamBookings.filter(b => b.status === 'completed');
                
                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center transform hover:scale-105 transition-all">
                        <div className="text-4xl font-black text-emerald-600 mb-2">{completedBookings.length}</div>
                        <div className="text-xs font-bold text-slate-500">إجمالي المنظومات المنجزة</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center transform hover:scale-105 transition-all">
                        <div className="text-4xl font-black text-indigo-600 mb-2">{teamBookings.length}</div>
                        <div className="text-xs font-bold text-slate-500">إجمالي المهام الموكلة</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-black text-slate-800 text-sm mb-4 border-b border-slate-200 pb-2">سجل الأعمال والتنصيبات السابقة</h5>
                      {completedBookings.length === 0 ? (
                        <p className="text-center text-slate-500 text-xs font-bold py-8 bg-white rounded-xl border border-dashed border-slate-200 shadow-sm">لم ينجز هذا الطاقم أي منظومات حتى الآن.</p>
                      ) : (
                        <div className="space-y-3">
                          {completedBookings.map((b, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs group hover:border-indigo-200 transition-all relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-black text-slate-900 text-sm">{b.customerName}</span>
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 font-mono text-[10px] font-bold">
                                  {b.appointmentDate}
                                </span>
                              </div>
                              <div className="text-slate-500 font-semibold mb-2">رقم الفاتورة: <span className="font-mono bg-slate-50 px-1 rounded">{b.invoiceNumber}</span></div>
                              {b.notes && b.notes.includes('[تم التثبيت فعلياً في:') && (
                                <div className="text-emerald-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 font-bold flex items-center gap-1.5 mt-2">
                                  <CheckSquare className="w-3.5 h-3.5"/>
                                  {b.notes.split('\n').find((l: string) => l.startsWith('[تم التثبيت فعلياً في:'))?.replace('[', '')?.replace(']', '')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
