/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import {
  Users, UserPlus, ShieldCheck, Settings, Search, Eye, EyeOff,
  Trash2, Edit, X, Save, ChevronDown, ChevronUp, Shield,
  UserCog, Lock, Unlock, Plus, AlertTriangle, Check, Copy
} from 'lucide-react';

interface EmployeesScreenProps {
  permissions: any;
  currentUser: any;
}

// Permission categories with Arabic labels and optionally custom actions
const PERMISSION_CATEGORIES = [
  { key: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
  { key: 'customers', label: 'العملاء', icon: '👥' },
  { key: 'products', label: 'المنتجات', icon: '📦' },
  { key: 'inventory', label: 'المخزون', icon: '🏪' },
  { key: 'sales', label: 'المبيعات', icon: '💰' },
  { key: 'invoices', label: 'الفواتير', icon: '🧾' },
  { key: 'installments', label: 'الأقساط', icon: '📅' },
  { key: 'bankSettlement', label: 'تسوية الماستركارد', icon: '🏦' },
  { key: 'maintenance', label: 'الصيانة', icon: '🔧' },
  { key: 'faults', label: 'الأعطال', icon: '⚠️' },
  { key: 'installationTeams', label: 'فرق التركيب', icon: '👷' },
  { 
    key: 'installationBookings', 
    label: 'حجوزات التركيب', 
    icon: '📋',
    customActions: [
      { key: 'view', label: 'عرض' },
      { key: 'create', label: 'إنشاء' },
      { key: 'edit', label: 'تعديل' },
      { key: 'delete', label: 'حذف' },
      { key: 'approve', label: 'موافقة' },
      { key: 'export', label: 'تصدير' },
      { key: 'viewWidget', label: 'عرض الويدجت' },
      { key: 'viewInvoice', label: 'عرض فاتورة الحجز' }
    ]
  },
  { 
    key: 'reports', 
    label: 'التقارير', 
    icon: '📈',
    customActions: [
      { key: 'view', label: 'عرض' },
      { key: 'export', label: 'تصدير (PDF/CSV)' }
    ]
  },
  { key: 'employees', label: 'الموظفين', icon: '🏢' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
  { 
    key: 'auditLogs', 
    label: 'سجل المراجعة', 
    icon: '📜',
    customActions: [
      { key: 'view', label: 'عرض' },
      { key: 'viewWidget', label: 'عرض الويدجت' }
    ]
  },
  { 
    key: 'backups', 
    label: 'النسخ الاحتياطي', 
    icon: '💾',
    customActions: [
      { key: 'export', label: 'تحميل نسخة' },
      { key: 'create', label: 'استعادة نسخة' }
    ]
  },
  { key: 'contracts', label: 'العقود', icon: '📝' },
  { 
    key: 'workerSettlement', 
    label: 'محاسبة العمال', 
    icon: '💰',
    customActions: [
      { key: 'approve', label: 'محاسبة' }
    ]
  }
];

const ACTIONS = [
  { key: 'view', label: 'عرض' },
  { key: 'create', label: 'إنشاء' },
  { key: 'edit', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
  { key: 'approve', label: 'موافقة' },
  { key: 'export', label: 'تصدير' },
  { key: 'viewWidget', label: 'عرض الويدجت' }
];

const DEFAULT_PERMISSIONS = () => {
  const perms: any = {};
  PERMISSION_CATEGORIES.forEach(cat => {
    perms[cat.key] = { view: false, create: false, edit: false, delete: false, approve: false, export: false, viewWidget: false };
  });
  return perms;
};

function EmployeesScreen({ permissions, currentUser }: EmployeesScreenProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');

  // Employee form
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '', username: '', password: '', phone: '', position: '', status: 'active'
  });
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [customPermissions, setCustomPermissions] = useState<any>(DEFAULT_PERMISSIONS());
  const [showPassword, setShowPassword] = useState(false);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);

  // Role form
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [rolePermissions, setRolePermissions] = useState<any>(DEFAULT_PERMISSIONS());

  // Expanded sections in permission matrix
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, roleRes] = await Promise.all([
        api.getEmployees(),
        api.getRoles().catch(() => [])
      ]);
      setEmployees(empRes);
      setRoles(roleRes);
    } catch (err: any) {
      toast.error(err.message || 'فشل في تحميل بيانات الموظفين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== Employee CRUD ====================

  const openEmployeeForm = (emp: any = null) => {
    if (emp) {
      setEditingEmployee(emp);
      setEmployeeForm({
        name: emp.name, username: emp.username, password: '',
        phone: emp.phone || '', position: emp.position, status: emp.status
      });
      setCustomPermissions(emp.permissions || DEFAULT_PERMISSIONS());
      // Try to match existing role
      const matchedRole = roles.find(r => JSON.stringify(r.permissions) === JSON.stringify(emp.permissions));
      setSelectedRoleId(matchedRole?.id || null);
      setUseCustomPermissions(!matchedRole);
    } else {
      setEditingEmployee(null);
      setEmployeeForm({ name: '', username: '', password: '', phone: '', position: '', status: 'active' });
      setCustomPermissions(DEFAULT_PERMISSIONS());
      setSelectedRoleId(roles[0]?.id || null);
      setUseCustomPermissions(false);
    }
    setShowPassword(false);
    setIsEmployeeFormOpen(true);
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name || !employeeForm.username || !employeeForm.position) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (!editingEmployee && !employeeForm.password) {
      toast.error('كلمة المرور مطلوبة للموظف الجديد');
      return;
    }

    const finalPermissions = useCustomPermissions
      ? customPermissions
      : roles.find(r => r.id === selectedRoleId)?.permissions || DEFAULT_PERMISSIONS();

    const payload: any = {
      name: employeeForm.name,
      username: employeeForm.username,
      phone: employeeForm.phone,
    };

    if (editingEmployee && editingEmployee.id === currentUser.id) {
      if (employeeForm.status !== editingEmployee.status) payload.status = employeeForm.status;
      if (employeeForm.position !== editingEmployee.position) payload.position = employeeForm.position;
      if (JSON.stringify(finalPermissions) !== JSON.stringify(editingEmployee.permissions)) payload.permissions = finalPermissions;
    } else {
      payload.status = employeeForm.status;
      payload.position = employeeForm.position;
      payload.permissions = finalPermissions;
    }

    if (employeeForm.password) payload.password = employeeForm.password;

    try {
      setActionLoading(true);
      if (editingEmployee) {
        const updated = await api.updateEmployee(editingEmployee.id, payload);
        toast.success('تم تحديث بيانات الموظف بنجاح');
        setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? updated : e));
      } else {
        const created = await api.createEmployee(payload);
        toast.success('تم إضافة الموظف الجديد بنجاح');
        setEmployees(prev => [...prev, created]);
      }
      setIsEmployeeFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'فشل في حفظ بيانات الموظف');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEmployee = (emp: any) => {
    if (emp.id === currentUser?.id) {
      toast.error('لا يمكنك حذف حسابك الخاص');
      return;
    }
    toast(`هل أنت متأكد من حذف الموظف "${emp.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`, {
      action: {
        label: 'حذف',
        onClick: async () => {
          try {
            setActionLoading(true);
            await api.deleteEmployee(emp.id);
            toast.success('تم حذف الموظف بنجاح');
            setEmployees(prev => prev.filter(e => e.id !== emp.id));
          } catch (err: any) {
            toast.error(err.message || 'فشل في حذف الموظف');
          } finally {
            setActionLoading(false);
          }
        },
      },
      cancel: { label: 'إلغاء', onClick: () => {} },
    });
  };

  const handleToggleStatus = async (emp: any) => {
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    try {
      setActionLoading(true);
      const updated = await api.updateEmployee(emp.id, { status: newStatus });
      toast.success(newStatus === 'active' ? 'تم تفعيل الموظف' : 'تم تعطيل الموظف');
      setEmployees(prev => prev.map(e => e.id === emp.id ? updated : e));
    } catch (err: any) {
      toast.error(err.message || 'فشل في تغيير حالة الموظف');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== Role CRUD ====================

  const openRoleForm = (role: any = null) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({ name: role.name, description: role.description || '' });
      setRolePermissions(role.permissions || DEFAULT_PERMISSIONS());
    } else {
      setEditingRole(null);
      setRoleForm({ name: '', description: '' });
      setRolePermissions(DEFAULT_PERMISSIONS());
    }
    setExpandedSections([]);
    setIsRoleFormOpen(true);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name) {
      toast.error('اسم الدور مطلوب');
      return;
    }

    try {
      setActionLoading(true);
      if (editingRole) {
        const updated = await api.updateRole(editingRole.id, { ...roleForm, permissions: rolePermissions });
        toast.success('تم تحديث الدور بنجاح');
        setRoles(prev => prev.map(r => r.id === editingRole.id ? updated : r));
      } else {
        const created = await api.createRole({ ...roleForm, permissions: rolePermissions });
        toast.success('تم إنشاء الدور الجديد بنجاح');
        setRoles(prev => [...prev, created]);
      }
      setIsRoleFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'فشل في حفظ الدور');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = (role: any) => {
    if (role.isSystem) {
      toast.error('لا يمكن حذف الأدوار الأساسية للنظام');
      return;
    }
    toast(`هل تريد حذف الدور "${role.name}"؟`, {
      action: {
        label: 'حذف',
        onClick: async () => {
          try {
            setActionLoading(true);
            await api.deleteRole(role.id);
            toast.success('تم حذف الدور بنجاح');
            setRoles(prev => prev.filter(r => r.id !== role.id));
          } catch (err: any) {
            toast.error(err.message || 'فشل في حذف الدور');
          } finally {
            setActionLoading(false);
          }
        },
      },
      cancel: { label: 'إلغاء', onClick: () => {} },
    });
  };

  // ==================== Permission Helpers ====================

  const togglePermAction = (perms: any, setPerms: (p: any) => void, category: string, action: string) => {
    setPerms({
      ...perms,
      [category]: { ...perms[category], [action]: !perms[category]?.[action] }
    });
  };

  const toggleAllCategory = (perms: any, setPerms: (p: any) => void, category: string) => {
    const allActive = ACTIONS.every(a => perms[category]?.[a.key]);
    const newVal = !allActive;
    const updated = { ...perms[category] };
    ACTIONS.forEach(a => { updated[a.key] = newVal; });
    setPerms({ ...perms, [category]: updated });
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const countActivePerms = (perms: any, category: string) => {
    if (!perms?.[category]) return 0;
    return ACTIONS.filter(a => perms[category][a.key]).length;
  };

  // ==================== Filtered data ====================

  const filteredEmployees = useMemo(() =>
    employees.filter(e =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.position.toLowerCase().includes(searchQuery.toLowerCase())
    ), [employees, searchQuery]);

  // ==================== Avatar helper ====================

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return name.slice(0, 2);
  };

  const avatarColors = ['bg-indigo-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500', 'bg-cyan-500'];
  const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

  // ==================== Permission Matrix Component ====================

  const PermissionMatrix = ({ perms, setPerms, compact = false }: { perms: any; setPerms: (p: any) => void; compact?: boolean }) => (
    <div className="space-y-2">
      {PERMISSION_CATEGORIES.map(cat => {
        const categoryActions = cat.customActions || ACTIONS;
        const activeCount = categoryActions.filter(a => perms[cat.key]?.[a.key]).length;
        const isExpanded = expandedSections.includes(cat.key);
        const allActive = activeCount === categoryActions.length;

        return (
          <div key={cat.key} className="bg-white/60 border border-white rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
            <button
              type="button"
              onClick={() => toggleSection(cat.key)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-white/80 transition text-right"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">{cat.icon}</span>
                <span className="text-sm font-black text-slate-800">{cat.label}</span>
                <span className={`text-[10px] px-2 py-1 rounded-lg font-black shadow-sm border ${
                  activeCount === 0 ? 'bg-slate-100 text-slate-500 border-slate-200' :
                  allActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                  'bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}>
                  {activeCount}/{categoryActions.length}
                </span>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-white/60 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => toggleAllCategory(perms, setPerms, cat.key)}
                    className={`text-[11px] px-3.5 py-2 rounded-xl font-black transition flex items-center gap-2 shadow-sm ${
                      allActive ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {allActive ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        إلغاء الكل
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        تحديد الكل
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {categoryActions.map(action => {
                    const active = perms[cat.key]?.[action.key] || false;
                    return (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => togglePermAction(perms, setPerms, cat.key, action.key)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm border ${
                          active
                            ? 'bg-indigo-500 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ==================== RENDER ====================

  return (
    <div className="space-y-8 animate-fade-in relative z-10 max-w-7xl mx-auto pb-12">

      {/* Header */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200/50 liquid-icon-wrapper shrink-0">
            <Users className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">إدارة الموظفين والصلاحيات</h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">إنشاء حسابات الموظفين، تعيين الأدوار، وإدارة صلاحيات الوصول الأمنية.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {permissions?.employees?.edit && (
            <button
              onClick={() => openRoleForm()}
              className="px-5 py-2.5 bg-white/60 hover:bg-white text-slate-700 hover:text-slate-900 transition-all text-sm font-bold rounded-xl flex items-center gap-2 border border-white shadow-sm active:scale-95"
            >
              <Shield className="w-4 h-4 text-indigo-500" />
              إنشاء دور جديد
            </button>
          )}
          {permissions?.employees?.create && (
            <button
              onClick={() => openEmployeeForm()}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200/50 transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-white" />
              إضافة موظف
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2 rounded-[2rem] shadow-lg flex gap-2 border border-white/80 max-w-lg mx-auto">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'employees' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'employees' ? 'text-indigo-400' : ''}`} />
          الموظفون ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'roles' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${activeTab === 'roles' ? 'text-indigo-400' : ''}`} />
          الأدوار والصلاحيات ({roles.length})
        </button>
      </div>

      {/* Search Bar */}
      {activeTab === 'employees' && (
        <div className="glass-card p-5 rounded-[2rem] shadow-lg flex flex-col gap-5 border border-white/80">
          <div className="relative">
            <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-indigo-500 pointer-events-none">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-indigo-500/50 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-semibold focus:outline-none shadow-sm transition-all text-slate-800 placeholder-slate-400"
              placeholder="البحث بالاسم، اسم المستخدم، أو المنصب..."
            />
          </div>
        </div>
      )}

      {/* ==================== EMPLOYEES TAB ==================== */}
      {activeTab === 'employees' && (
        loading ? (
          <div className="text-center py-16 text-slate-500 text-sm font-bold flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>جاري تحميل بيانات الموظفين...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg border border-white/50">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p>لا يوجد موظفين مطابقين للبحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEmployees.map(emp => (
              <div
                key={emp.id}
                className={`glass-card rounded-[2rem] p-6 md:p-8 border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group ${
                  emp.status === 'inactive' ? 'border-dashed border-slate-300/60 opacity-80 hover:opacity-100' : 'border-white/80'
                }`}
              >
                <div className="flex items-start justify-between gap-4 border-b border-white/60 pb-5 mb-5">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg ${getAvatarColor(emp.id)}`}>
                      {getInitials(emp.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-black text-base text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{emp.name}</h3>
                        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black shadow-sm border ${
                          emp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {emp.status === 'active' ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-bold">@{emp.username} · {emp.position}</p>
                      {emp.phone && <p className="text-xs text-slate-400 font-mono mt-1.5 bg-white/60 inline-block px-2 py-1 rounded-lg border border-white shadow-sm">{emp.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end mb-4">
                  {permissions.employees.edit && (
                    <>
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        disabled={actionLoading}
                        className={`p-2 rounded-xl transition-all shadow-sm border disabled:opacity-50 ${
                          emp.status === 'active'
                            ? 'bg-slate-50 hover:bg-red-500 hover:text-white text-slate-600 border-slate-200 hover:border-red-500'
                            : 'bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 border-emerald-200 hover:border-emerald-500'
                        }`}
                        title={emp.status === 'active' ? 'تعطيل الموظف' : 'تفعيل الموظف'}
                      >
                        {emp.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEmployeeForm(emp)}
                        className="p-2 bg-indigo-50 hover:bg-indigo-500 hover:text-white text-indigo-600 rounded-xl transition-all shadow-sm border border-indigo-100 hover:border-indigo-500"
                        title="تعديل الموظف"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {permissions.employees.delete && emp.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeleteEmployee(emp)}
                      disabled={actionLoading}
                      className="p-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-all shadow-sm border border-rose-100 hover:border-rose-500 disabled:opacity-50"
                      title="حذف الموظف نهائياً"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Permission summary badges */}
                <div className="mt-auto pt-4 border-t border-white/60">
                  <span className="text-[10px] font-bold text-slate-400 mb-2 block">الصلاحيات الأساسية:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                    {PERMISSION_CATEGORIES.filter(cat => emp.permissions?.[cat.key]?.view).map(cat => (
                      <span key={cat.key} className="text-[10px] bg-white/60 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold border border-white shadow-sm flex items-center gap-1.5">
                        <span className="opacity-70">{cat.icon}</span> {cat.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ==================== ROLES TAB ==================== */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {roles.length === 0 ? (
            <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg border border-white/50">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p>لم يتم إنشاء أدوار بعد</p>
              {permissions.employees.create && (
                <button onClick={() => openRoleForm()} className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-black rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95">
                  إنشاء أول دور
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {roles.map(role => {
                const empCount = employees.filter(e => JSON.stringify(e.permissions) === JSON.stringify(role.permissions)).length;
                return (
                  <div key={role.id} className="glass-card rounded-[2rem] border border-white/80 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group flex flex-col">
                    <div className="flex items-center justify-between gap-4 border-b border-white/60 pb-5 mb-5">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shrink-0 shadow-lg">
                          <Shield className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-black text-base text-slate-900 group-hover:text-indigo-600 transition-colors">{role.name}</h3>
                            {role.isSystem && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-black border border-indigo-100 shadow-sm">نظام</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium truncate">{role.description || 'بدون وصف'}</p>
                          <p className="text-xs font-bold text-indigo-600 mt-2 bg-indigo-50/50 inline-block px-2.5 py-1 rounded-lg border border-indigo-100/50">{empCount} موظف يستخدم هذا الدور</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end mb-4">
                      {permissions.employees.edit && (
                        <button
                          onClick={() => openRoleForm(role)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-500 hover:text-white text-indigo-600 rounded-xl transition-all shadow-sm border border-indigo-100 hover:border-indigo-500"
                          title="تعديل الدور"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {permissions.employees.delete && !role.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          disabled={actionLoading}
                          className="p-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-all shadow-sm border border-rose-100 hover:border-rose-500 disabled:opacity-50"
                          title="حذف الدور"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Permission summary */}
                    <div className="mt-auto pt-4 border-t border-white/60">
                      <span className="text-[10px] font-bold text-slate-400 mb-2 block">تفاصيل الصلاحيات:</span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {PERMISSION_CATEGORIES.map(cat => {
                          const categoryActions = cat.customActions || ACTIONS;
                          const count = categoryActions.filter(a => role.permissions[cat.key]?.[a.key]).length;
                          if (count === 0) return null;
                          return (
                            <span key={cat.key} className={`text-[10px] px-2.5 py-1.5 rounded-lg font-black shadow-sm border flex items-center gap-1.5 ${
                              count === categoryActions.length ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              <span className="opacity-70">{cat.icon}</span> {cat.label} <span className="opacity-50">({count})</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            }
            </div>
          )}
        </div>
      )}

      {/* ==================== EMPLOYEE FORM MODAL ==================== */}
      {isEmployeeFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-3xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h3 className="font-black text-sm flex items-center gap-2">
                <UserCog className="w-5 h-5 text-indigo-400" />
                {editingEmployee ? `تعديل بيانات: ${editingEmployee.name}` : 'إضافة موظف جديد'}
              </h3>
              <button onClick={() => setIsEmployeeFormOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEmployeeSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-white/60 custom-scrollbar">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">الاسم الكامل *</label>
                  <input
                    type="text" value={employeeForm.name}
                    onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all"
                    placeholder="مثال: أحمد محمد العلي"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">اسم المستخدم *</label>
                  <input
                    type="text" value={employeeForm.username}
                    onChange={e => setEmployeeForm({...employeeForm, username: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all text-left"
                    dir="ltr"
                    placeholder="ahmed_ali" disabled={!!editingEmployee}
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">
                    {editingEmployee ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={employeeForm.password}
                      onChange={e => setEmployeeForm({...employeeForm, password: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none pl-12 shadow-sm transition-all text-left"
                      dir="ltr"
                      placeholder={editingEmployee ? '••••••••' : '••••••••'}
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">رقم الهاتف</label>
                  <input
                    type="text" value={employeeForm.phone}
                    onChange={e => setEmployeeForm({...employeeForm, phone: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all text-left"
                    dir="ltr"
                    placeholder="07X XXXX XXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">المنصب / الوظيفة *</label>
                  <input
                    type="text" value={employeeForm.position}
                    onChange={e => setEmployeeForm({...employeeForm, position: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all"
                    placeholder="مثال: محاسب، فني صيانة، مدير فرع"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">الحالة</label>
                  <select
                    value={employeeForm.status}
                    onChange={e => setEmployeeForm({...employeeForm, status: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all"
                  >
                    <option value="active">نشط ومفعل</option>
                    <option value="inactive">معطل ومجمد</option>
                  </select>
                </div>
              </div>

              {/* Role Selection */}
              {(permissions?.employees?.edit || permissions?.employees?.create) && (
                <div className="border-t border-white/60 pt-6">
                  <h4 className="font-black text-base text-slate-800 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    تعيين الصلاحيات والأدوار
                  </h4>

                  {(permissions?.employees?.edit || permissions?.employees?.create) && (
                    <div className="flex bg-white/40 p-1.5 rounded-2xl border border-white shadow-inner mb-6">
                      <button
                        type="button"
                        onClick={() => setUseCustomPermissions(false)}
                        className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                          !useCustomPermissions ? 'bg-slate-900 text-amber-400 shadow-md' : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                        }`}
                      >
                        اختيار دور جاهز
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseCustomPermissions(true)}
                        className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                          useCustomPermissions ? 'bg-slate-900 text-amber-400 shadow-md' : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                        }`}
                      >
                        تخصيص صلاحيات استثنائية
                      </button>
                    </div>
                  )}

                  {(!useCustomPermissions) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {roles.map(role => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRoleId(role.id)}
                          className={`p-4 rounded-2xl border text-right transition-all shadow-sm ${
                            selectedRoleId === role.id
                              ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                              : 'border-white/80 hover:border-indigo-200 bg-white/60 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${selectedRoleId === role.id ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                              <Shield className={`w-5 h-5 ${selectedRoleId === role.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                            </div>
                            <div>
                              <span className="text-sm font-black text-slate-800 block mb-1">{role.name}</span>
                              <p className="text-xs font-semibold text-slate-500">{role.description || 'بدون وصف'}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 p-4 rounded-3xl border border-white/60 shadow-inner">
                      <PermissionMatrix perms={customPermissions} setPerms={setCustomPermissions} />
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 justify-end pt-6 border-t border-white/60">
                <button
                  type="button" onClick={() => setIsEmployeeFormOpen(false)}
                  className="px-6 py-3 bg-white text-slate-700 rounded-xl text-sm font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  إلغاء التعديل
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingEmployee ? 'حفظ التحديثات' : 'تفعيل الموظف الجديد'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ROLE FORM MODAL ==================== */}
      {isRoleFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-4xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                {editingRole ? `تعديل الدور: ${editingRole.name}` : 'بناء دور وصلاحيات جديدة'}
              </h3>
              <button onClick={() => setIsRoleFormOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-white/60 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">اسم الدور *</label>
                  <input
                    type="text" value={roleForm.name}
                    onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all"
                    placeholder="مثال: مدير المبيعات"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">وصف الدور والمسؤوليات</label>
                  <input
                    type="text" value={roleForm.description}
                    onChange={e => setRoleForm({...roleForm, description: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all"
                    placeholder="وصف مختصر لمستوى الوصول..."
                  />
                </div>
              </div>

              <div className="border-t border-white/60 pt-6">
                <h4 className="font-black text-base text-slate-800 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-400" /> مصفوفة الصلاحيات الشاملة
                </h4>
                <div className="bg-slate-50/50 p-4 rounded-3xl border border-white/60 shadow-inner">
                  <PermissionMatrix perms={rolePermissions} setPerms={setRolePermissions} />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-white/60">
                <button
                  type="button" onClick={() => setIsRoleFormOpen(false)}
                  className="px-6 py-3 bg-white text-slate-700 rounded-xl text-sm font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  إلغاء التعديل
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingRole ? 'حفظ التحديثات' : 'اعتماد الدور الجديد'}
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

export default React.memo(EmployeesScreen);
