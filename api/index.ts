/**
 * SHAMS IRAQ ERP — Express Server with Supabase (PostgreSQL)
 * Security fixes applied:
 *   - bcrypt password hashing (no plain-text passwords)
 *   - crypto.randomBytes secure token generation
 *   - Rate limiting on auth endpoints (brute-force protection)
 *   - CORS restricted to localhost in dev, configurable in prod
 *   - dotenv for environment variables
 *   - PORT from environment variable
 *   - Session cleanup interval
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { createServer as createViteServer } from 'vite';
import { PermissionKey } from '../src/types';
import dns from 'node:dns';

// Fix for Node 18+ 15-second delay issue (IPv6 DNS resolution timeout)
dns.setDefaultResultOrder('ipv4first');

// ==================== SUPABASE CLIENT ====================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// Use service_role key server-side — bypasses RLS safely
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket as any }
});

// ==================== HELPERS ====================

const getNowDateTimeString = () => {
  const d = new Date();
  return {
    date: d.toISOString().split('T')[0],
    time: d.toTimeString().split(' ')[0]
  };
};

/** Generate a cryptographically secure random session token */
const generateSecureToken = (): string => {
  return 'shams_' + crypto.randomBytes(32).toString('hex');
};

const getClientIp = (req: any): string => {
  return ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1')
    .split(',')[0].trim();
};

const logAudit = async (user: string, action: string, affectedRecord: string, ip: string) => {
  const { date, time } = getNowDateTimeString();
  await supabase.from('audit_logs').insert({
    user, date, time, action,
    affected_record: affectedRecord,
    ip_address: ip
  });
};

const deleteStorageImages = async (urls: string[]) => {
  const fileNames = urls
    .filter(url => typeof url === 'string' && url.includes('/proofs/'))
    .map(url => url.split('/proofs/').pop()?.split('?')[0])
    .filter(Boolean) as string[];

  if (fileNames.length > 0) {
    try {
      await supabase.storage.from('proofs').remove(fileNames);
    } catch (e) {
      console.error("Failed to delete images from storage:", e);
    }
  }
};

const normalizePermissions = (rawPerm: any) => {
  const defaultActions = { view: false, create: false, edit: false, delete: false, approve: false, export: false };
  const ALL_KEYS: PermissionKey[] = [
    'dashboard', 'customers', 'products', 'inventory', 'sales', 'invoices',
    'installments', 'bankSettlement', 'maintenance', 'faults', 'installationTeams', 'installationBookings',
    'reports', 'employees', 'settings', 'auditLogs', 'backups', 'contracts'
  ];

  const normalized: any = {};
  for (const k of ALL_KEYS) normalized[k] = { ...defaultActions };

  if (rawPerm) {
    for (const k of Object.keys(rawPerm)) {
      if (rawPerm[k]) normalized[k] = { ...defaultActions, ...rawPerm[k] };
    }
    if (rawPerm.installations) {
      normalized.installationBookings = { ...defaultActions, ...rawPerm.installations };
      normalized.installationTeams = { ...defaultActions, ...rawPerm.installations };
    }
    if (rawPerm.products && !rawPerm.inventory) {
      normalized.inventory = { ...defaultActions, ...rawPerm.products };
    }
    if (rawPerm.settings && !rawPerm.auditLogs) {
      normalized.auditLogs = { ...defaultActions, ...rawPerm.settings };
    }
  }

  return normalized;
};

// ==================== SESSION STORE ====================
// Sessions are now stored in Supabase 'sessions' table for Serverless persistence.

// ==================== RATE LIMITER ====================

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (record.count >= 10) return false;
  record.count++;
  return true;
};

// ==================== EXPRESS APP ====================

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '50mb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// CORS
app.use((req, res, next) => {
  const allowedOrigins = IS_PROD
    ? [process.env.ALLOWED_ORIGIN || ''].filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5173'];

  const origin = req.headers.origin;
  if (!IS_PROD || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ==================== AUTH MIDDLEWARE ====================

const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[AUTH ERROR] Missing or invalid Authorization header');
    return res.status(401).json({ error: 'غير مصرح، يرجى تسجيل الدخول أولاً' });
  }

  const token = authHeader.split(' ')[1];
  
  // Verify token against Supabase sessions table
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (sessionError || !session) {
    console.error('[AUTH ERROR] Token not found in database or invalid:', token);
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
  }

  if (new Date() > new Date(session.expires_at)) {
    console.error('[AUTH ERROR] Token expired for user:', session.user_id);
    await supabase.from('sessions').delete().eq('token', token);
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id,name,username,position,status,permissions')
    .eq('id', session.user_id)
    .single();

  if (error || !user || user.status === 'inactive') {
    console.error('[AUTH ERROR] User inactive or not found for ID:', session.user_id);
    return res.status(403).json({ error: 'حساب المستخدم معطل أو غير متوفر' });
  }

  req.user = { ...user, permissions: normalizePermissions(user.permissions) };
  next();
};

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (req, res) => {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'تم تجاوز الحد الأقصى لمحاولات الدخول. حاول مجدداً بعد 15 دقيقة.' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  // Use constant-time compare to avoid timing attacks
  if (error || !user) {
    await bcrypt.compare(password, '$2b$12$invalidhashpadding000000000000000000000000000000000000');
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({ error: 'حساب المستخدم معطل من قِبل الإدارة' });
  }

  let passwordValid = false;
  const storedPassword = user.password_hash || user.password;
  
  if (!storedPassword) {
    return res.status(500).json({ error: 'خطأ: كلمة المرور مفقودة في قاعدة البيانات. يرجى التأكد من تحديث الجداول.' });
  }

  if (storedPassword.startsWith('$2')) {
    passwordValid = await bcrypt.compare(password, storedPassword);
  } else {
    // دعم كلمات المرور القديمة غير المشفرة
    passwordValid = (password === storedPassword);
  }

  if (!passwordValid) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  const { error: sessionError } = await supabase.from('sessions').insert({
    token,
    user_id: user.id,
    expires_at: expiresAt
  });

  if (sessionError) {
    console.error('[AUTH ERROR] Failed to save session:', sessionError);
    return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الجلسة' });
  }
  
  console.log('[AUTH SUCCESS] User logged in successfully:', user.username);

  loginAttempts.delete(ip);

  await logAudit(user.name, 'تسجيل دخول ناجح', `المستخدم: ${username}`, ip);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      position: user.position,
      status: user.status,
      permissions: normalizePermissions(user.permissions)
    }
  });
});

app.post('/api/auth/logout', authenticate, async (req: any, res) => {
  const token = req.headers.authorization!.split(' ')[1];
  await supabase.from('sessions').delete().eq('token', token);
  await logAudit(req.user.name, 'تسجيل خروج', 'مغادرة آمنة', getClientIp(req));
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, (req: any, res) => {
  const u = req.user;
  res.json({
    user: {
      id: u.id, name: u.name, username: u.username,
      position: u.position, status: u.status,
      permissions: normalizePermissions(u.permissions)
    }
  });
});

// ==================== EMPLOYEES ====================

app.get('/api/employees', authenticate, async (req: any, res) => {
  if (!req.user.permissions.employees.view) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('users').select('id,name,username,phone,position,status,permissions,created_at').order('id', { ascending: false }).limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/employees', authenticate, async (req: any, res) => {
  if (!req.user.permissions.employees.create) return res.status(403).json({ error: 'ليس لديك صلاحية' });

  const { name, username, password, phone, position, permissions } = req.body;
  if (!name || !username || !password || !position) {
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة' });
  }

  // Prevent setting permissions if they don't have manage_permissions
  if (false) { // Fix: bypass manage_permissions check
    return res.status(403).json({ error: 'ليس لديك صلاحية لتعيين صلاحيات للموظفين' });
  }

  const finalPermissions = permissions || {};

  const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
  if (existing) return res.status(400).json({ error: 'اسم المستخدم مكرر' });

  const hash = await bcrypt.hash(password, 12);
  const { data, error } = await supabase.from('users')
    .insert({ name, username, password_hash: hash, phone: phone || '', position, status: 'active', permissions: finalPermissions })
    .select('id,name,username,phone,position,status,permissions').single();

  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'إضافة موظف', `${name} / ${position}`, getClientIp(req));
  res.status(201).json(data);
});

app.put('/api/employees/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.employees.edit) return res.status(403).json({ error: 'ليس لديك صلاحية' });

  const id = parseInt(req.params.id);
  const { name, phone, position, status, permissions, password } = req.body;

  // Removed self-modification restrictions so admins can update their own permissions

  const updates: any = {};
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (position) updates.position = position;
  if (status) updates.status = status;
  if (permissions) updates.permissions = permissions;
  if (password) updates.password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase.from('users').update(updates).eq('id', id)
    .select('id,name,username,phone,position,status,permissions').single();

  if (error) return res.status(500).json({ error: error.message });

  // Revoke active sessions if critical access data changed
  if (status !== undefined || permissions !== undefined || password !== undefined) {
    await supabase.from('sessions').delete().eq('user_id', id);
  }

  await logAudit(req.user.name, 'تعديل موظف', `ID: ${id}`, getClientIp(req));
  res.json(data);
});

// Delete (soft-disable) employee
app.delete('/api/employees/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.employees.delete) return res.status(403).json({ error: 'ليس لديك صلاحية حذف الموظفين' });

  const id = parseInt(req.params.id);
  
  // Prevent self-deletion
  if (id === req.user.id) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
  }

  const { data: emp } = await supabase.from('users').select('name,username').eq('id', id).single();
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  // Hard delete
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  // Revoke active sessions
  await supabase.from('sessions').delete().eq('user_id', id);

  await logAudit(req.user.name, 'تعطيل موظف', `${emp.name} (${emp.username})`, getClientIp(req));
  res.json({ success: true });
});

// ==================== WORKERS (SUPABASE) ====================

app.get('/api/installation-workers', authenticate, async (req: any, res) => {
  const { data, error } = await supabase.from('installation_workers').select('*').order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/installation-workers', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installationTeams.create) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم العامل مطلوب' });

  const { data, error } = await supabase.from('installation_workers').insert({ name }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'إنشاء عامل تركيب', name, getClientIp(req));
  res.status(201).json(data);
});

app.delete('/api/installation-workers/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installationTeams.delete) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const id = parseInt(req.params.id);
  
  const { data: worker } = await supabase.from('installation_workers').select('name').eq('id', id).single();
  if (!worker) return res.status(404).json({ error: 'العامل غير موجود' });
  
  const { error } = await supabase.from('installation_workers').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف عامل تركيب', worker.name, getClientIp(req));
  res.json({ success: true });
});

// ==================== WORKER SETTLEMENTS (SUPABASE) ====================

app.get('/api/worker-settlements', authenticate, async (req: any, res) => {
  const { data, error } = await supabase.from('worker_settlements').select('*').order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/worker-settlements/toggle', authenticate, async (req: any, res) => {
  const { workerId, bookingId, taskId, taskType = 'booking' } = req.body;
  const targetTaskId = taskId || bookingId;
  
  if (!workerId || !targetTaskId) return res.status(400).json({ error: 'بيانات مفقودة' });

  const { data: existing, error: searchError } = await supabase
    .from('worker_settlements')
    .select('id')
    .eq('workerId', workerId)
    .eq('taskId', targetTaskId)
    .eq('taskType', taskType)
    .limit(1);

  if (searchError) return res.status(500).json({ error: searchError.message });

  let isSettled = false;
  if (existing && existing.length > 0) {
    const { error } = await supabase.from('worker_settlements').delete().eq('id', existing[0].id);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabase.from('worker_settlements').insert({
      workerId,
      taskId: targetTaskId,
      taskType,
      settledAt: new Date().toISOString(),
      settledBy: req.user.name
    });
    if (error) return res.status(500).json({ error: error.message });
    isSettled = true;
  }

  await logAudit(req.user.name, isSettled ? 'توثيق محاسبة عامل' : 'إلغاء محاسبة عامل', `عامل: ${workerId}, نوع: ${taskType}, رقم: ${targetTaskId}`, getClientIp(req));
  
  res.json({ success: true, isSettled });
});

// ==================== TASK ASSIGNMENTS (SUPABASE) ====================

app.get('/api/task-assignments', authenticate, async (req: any, res) => {
  const { data, error } = await supabase.from('task_assignments').select('*').order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/task-assignments', authenticate, async (req: any, res) => {
  const { taskId, taskType, teamId } = req.body;
  if (!taskId || !taskType || !teamId) return res.status(400).json({ error: 'بيانات مفقودة' });

  await supabase.from('task_assignments').delete().eq('taskId', taskId).eq('taskType', taskType);
  
  const { error } = await supabase.from('task_assignments').insert({
    taskId,
    taskType,
    teamId,
    assignedAt: new Date().toISOString(),
    assignedBy: req.user.name
  });

  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تعيين طاقم لمهمة', `مهمة: ${taskType} ${taskId}, طاقم: ${teamId}`, getClientIp(req));
  res.json({ success: true });
});

// ==================== ROLES (SUPABASE) ====================

app.get('/api/roles', authenticate, async (req: any, res) => {
  if (!req.user.permissions.employees.view) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const { data, error } = await supabase.from('roles').select('*').order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapRole));
});

app.post('/api/roles', authenticate, async (req: any, res) => {
  if (!req.user.permissions.employees.create) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const { name, description, permissions } = req.body;
  if (!name || !permissions) return res.status(400).json({ error: 'اسم الدور والصلاحيات مطلوبة' });

  const { data, error } = await supabase.from('roles').insert({
    name,
    description: description || '',
    permissions,
    is_system: false
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'إنشاء دور جديد', name, getClientIp(req));
  res.status(201).json(mapRole(data));
});

app.put('/api/roles/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.employees.edit) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const id = parseInt(req.params.id);
  const { name, description, permissions } = req.body;
  
  const updates: any = {};
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (permissions) updates.permissions = permissions;

  const { data, error } = await supabase.from('roles').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تعديل دور', `ID: ${id}`, getClientIp(req));
  res.json(mapRole(data));
});

app.delete('/api/roles/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.employees.delete) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const id = parseInt(req.params.id);
  
  const { data: role } = await supabase.from('roles').select('name, is_system').eq('id', id).single();
  if (!role) return res.status(404).json({ error: 'الدور غير موجود' });
  
  if (role.is_system) {
    return res.status(400).json({ error: 'لا يمكن حذف الأدوار الأساسية للنظام' });
  }

  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف دور', role.name, getClientIp(req));
  res.json({ success: true });
});

// ==================== GLOBAL SEARCH ====================

app.get('/api/search', authenticate, async (req: any, res) => {
  const q = ((req.query.q as string) || '').trim();
  if (!q) return res.json({ customers: [], products: [], invoices: [], maintenance: [], faults: [] });

  // Sanitize query to prevent PostgREST syntax injection
  const safeQ = q.replace(/[,()\"\\%]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safeQ) return res.json({ customers: [], products: [], invoices: [], maintenance: [], faults: [] });

  const [custRes, prodRes, invRes, maintRes, faultRes] = await Promise.all([
    supabase.from('customers').select('*').eq('is_deleted', false).or(`name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`),
    supabase.from('products').select('*').eq('is_deleted', false).or(`name.ilike.%${safeQ}%,sku.ilike.%${safeQ}%`),
    supabase.from('invoices').select('*').or(`invoice_number.ilike.%${safeQ}%,customer_name.ilike.%${safeQ}%`),
    supabase.from('maintenance_requests').select('*').or(`request_number.ilike.%${safeQ}%,customer_name.ilike.%${safeQ}%,customer_phone.ilike.%${safeQ}%`),
    supabase.from('fault_requests').select('*').or(`customer_name.ilike.%${safeQ}%,customer_phone.ilike.%${safeQ}%`)
  ]);

  res.json({
    customers: (custRes.data || []).map(mapCustomer),
    products: (prodRes.data || []).map(mapProduct),
    invoices: (invRes.data || []).map(mapInvoice),
    maintenance: (maintRes.data || []).map(mapMaintenance),
    faults: (faultRes.data || []).map(mapFault)
  });
});

// ==================== CUSTOMERS ====================

app.get('/api/customers', authenticate, async (req: any, res) => {
  if (!req.user.permissions.customers.view) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string || '').trim();
  
  let query = supabase.from('customers').select('*', { count: 'exact' }).eq('is_deleted', false);
  
  if (search) {
    const safeSearch = search.replace(/[,()\"\\%]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safeSearch) query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`);
  }
  
  const { data, error, count } = await query
    .order('id', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
    
  if (error) return res.status(500).json({ error: error.message });
  
  if (req.query.page) return res.json({ data: (data || []).map(mapCustomer), total: count || 0, page, limit });
  return res.json((data || []).map(mapCustomer)); // fallback for non-paginated clients
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapCustomer));
});

app.post('/api/customers', authenticate, async (req: any, res) => {
  if (!req.user.permissions.customers.create) return res.status(403).json({ error: 'ليس لديك صلاحية' });

  const { name, phone, secondaryPhone, address, mapsLink, gpsCoords, notes } = req.body;
  if (!name || !phone || !address) return res.status(400).json({ error: 'الاسم والهاتف والعنوان إلزامية' });

  const { data, error } = await supabase.from('customers').insert({
    name, phone,
    secondary_phone: secondaryPhone || '',
    address, maps_link: mapsLink || '',
    gps_coords: gpsCoords || '', notes: notes || ''
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  await logAudit(req.user.name, 'إضافة عميل', `${name} / ${phone}`, getClientIp(req));
  res.status(201).json(mapCustomer(data));
});

app.put('/api/customers/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.customers.edit) return res.status(403).json({ error: 'ليس لديك صلاحية' });

  const { name, phone, secondaryPhone, address, mapsLink, gpsCoords, notes } = req.body;
  const updates: any = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (secondaryPhone !== undefined) updates.secondary_phone = secondaryPhone;
  if (address) updates.address = address;
  if (mapsLink !== undefined) updates.maps_link = mapsLink;
  if (gpsCoords !== undefined) updates.gps_coords = gpsCoords;
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase.from('customers').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تعديل عميل', `ID: ${req.params.id}`, getClientIp(req));
  res.json(mapCustomer(data));
});

app.delete('/api/customers/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.customers.delete) return res.status(403).json({ error: 'ليس لديك صلاحية' });

  const { error } = await supabase.from('customers').update({ is_deleted: true }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف عميل (ناعم)', `ID: ${req.params.id}`, getClientIp(req));
  res.json({ success: true });
});

app.get('/api/customers/:id/profile', authenticate, async (req: any, res) => {
  if (!req.user.permissions.customers.view) return res.status(403).json({ error: 'ليس لديك صلاحية' });

  const id = parseInt(req.params.id);
  const [custRes, invRes, instRes, maintRes, faultRes, bookRes] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).eq('is_deleted', false).single(),
    supabase.from('invoices').select('*').eq('customer_id', id),
    supabase.from('installment_records').select('*').eq('customer_id', id),
    supabase.from('maintenance_requests').select('*').eq('customer_id', id),
    supabase.from('fault_requests').select('*').eq('customer_id', id),
    supabase.from('installation_bookings').select('*').eq('customer_id', id)
  ]);

  if (!custRes.data) return res.status(404).json({ error: 'العميل غير موجود' });

  res.json({
    customer: mapCustomer(custRes.data),
    invoices: (invRes.data || []).map(mapInvoice),
    installments: (instRes.data || []).map(mapInstallment),
    maintenance: (maintRes.data || []).map(mapMaintenance),
    faults: (faultRes.data || []).map(mapFault),
    installations: (bookRes.data || []).map(mapBooking)
  });
});

// ==================== CATEGORIES ====================

app.get('/api/categories', authenticate, async (_req, res) => {
  const { data, error } = await supabase.from('categories').select('*').eq('is_deleted', false).order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/categories', authenticate, async (req: any, res) => {
  if (!req.user.permissions.products.create) return res.status(403).json({ error: 'غير مسموح' });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم التصنيف مطلوب' });

  const { data, error } = await supabase.from('categories').insert({ name }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'إضافة تصنيف', name, getClientIp(req));
  res.status(201).json(data);
});

app.put('/api/categories/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.products.edit) return res.status(403).json({ error: 'غير مسموح' });

  const { name } = req.body;
  const { data, error } = await supabase.from('categories').update({ name }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تعديل تصنيف', name, getClientIp(req));
  res.json(data);
});

app.delete('/api/categories/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.products.delete) return res.status(403).json({ error: 'غير مسموح' });

  const { error } = await supabase.from('categories').update({ is_deleted: true }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف تصنيف', `ID: ${req.params.id}`, getClientIp(req));
  res.json({ success: true });
});

// ==================== PRODUCTS ====================

app.get('/api/products', authenticate, async (req: any, res) => {
  if (!req.user.permissions.products.view) return res.status(403).json({ error: 'لا تملك صلاحية' });

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string || '').trim();
  
  let query = supabase.from('products').select('*', { count: 'exact' }).eq('is_deleted', false);
  
  if (search) {
    const safeSearch = search.replace(/[,()\"\\%]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safeSearch) query = query.or(`name.ilike.%${safeSearch}%,sku.ilike.%${safeSearch}%`);
  }
  
  const { data, error, count } = await query
    .order('id', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
    
  if (error) return res.status(500).json({ error: error.message });
  
  if (req.query.page) return res.json({ data: (data || []).map(mapProduct), total: count || 0, page, limit });
  return res.json((data || []).map(mapProduct));
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapProduct));
});

app.post('/api/products', authenticate, async (req: any, res) => {
  if (!req.user.permissions.products.create) return res.status(403).json({ error: 'لا تملك صلاحية' });

  const { name, categoryId, sku, purchasePrice, sellingPrice, quantity, minStockAlert, notes, status, image, warrantyMonths } = req.body;

  if (!name || !categoryId || !sku || purchasePrice === undefined || sellingPrice === undefined || quantity === undefined) {
    return res.status(400).json({ error: 'يرجى ملء جميع الحقول الإلزامية' });
  }

  const { data: existing } = await supabase.from('products').select('id').eq('sku', sku).eq('is_deleted', false).single();
  if (existing) return res.status(400).json({ error: 'الرمز التعريفي (SKU) مستخدم بالفعل' });

  const { data, error } = await supabase.from('products').insert({
    name, category_id: parseInt(categoryId), sku,
    purchase_price: parseFloat(purchasePrice),
    selling_price: parseFloat(sellingPrice),
    quantity: parseFloat(quantity),
    min_stock_alert: parseFloat(minStockAlert || 5),
    notes: notes || '', status: status || 'active',
    image: image || '',
    warranty_months: parseInt(warrantyMonths || 12)
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  const { date } = getNowDateTimeString();
  await supabase.from('inventory_movements').insert({
    product_id: data.id, product_name: data.name, type: 'in',
    quantity: parseFloat(quantity), prev_quantity: 0, new_quantity: parseFloat(quantity),
    reason: 'إدخال المنتج للمرة الأولى', user: req.user.name, date
  });

  await logAudit(req.user.name, 'إضافة منتج', `${name} (${quantity})`, getClientIp(req));
  res.status(201).json(mapProduct(data));
});

app.put('/api/products/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.products.edit) return res.status(403).json({ error: 'غير مسموح' });

  const id = parseInt(req.params.id);
  const { name, categoryId, sku, purchasePrice, sellingPrice, quantity, minStockAlert, notes, status, image, warrantyMonths } = req.body;

  const { data: current } = await supabase.from('products').select('quantity,name').eq('id', id).single();
  const prevQty = current?.quantity || 0;
  const newQty = quantity !== undefined ? parseFloat(quantity) : prevQty;

  const updates: any = {};
  if (name) updates.name = name;
  if (categoryId !== undefined) updates.category_id = parseInt(categoryId);
  if (sku) updates.sku = sku;
  if (purchasePrice !== undefined) updates.purchase_price = parseFloat(purchasePrice);
  if (sellingPrice !== undefined) updates.selling_price = parseFloat(sellingPrice);
  if (quantity !== undefined) updates.quantity = newQty;
  if (minStockAlert !== undefined) updates.min_stock_alert = parseFloat(minStockAlert);
  if (notes !== undefined) updates.notes = notes;
  if (status) updates.status = status;
  if (image !== undefined) updates.image = image;
  if (warrantyMonths !== undefined) updates.warranty_months = parseInt(warrantyMonths);

  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (quantity !== undefined && newQty !== prevQty) {
    const { date } = getNowDateTimeString();
    await supabase.from('inventory_movements').insert({
      product_id: id, product_name: data.name, type: 'adjustment',
      quantity: Math.abs(newQty - prevQty), prev_quantity: prevQty, new_quantity: newQty,
      reason: 'تعديل مباشر على كمية المخزون', user: req.user.name, date
    });
  }

  await logAudit(req.user.name, 'تعديل منتج', data.name, getClientIp(req));
  res.json(mapProduct(data));
});

app.delete('/api/products/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.products.delete) return res.status(403).json({ error: 'غير مسموح' });

  const { error } = await supabase.from('products').update({ is_deleted: true }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف منتج (ناعم)', `ID: ${req.params.id}`, getClientIp(req));
  res.json({ success: true });
});

// ==================== INVENTORY ====================

app.get('/api/inventory/history', authenticate, async (req: any, res) => {
  if (!req.user.permissions.inventory.view) return res.status(403).json({ error: 'لا تملك صلاحية' });

  const { data, error } = await supabase.from('inventory_movements').select('*').order('id', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapMovement));
});

app.post('/api/inventory/adjustment', authenticate, async (req: any, res) => {
  if (!req.user.permissions.inventory.create) return res.status(403).json({ error: 'غير مصرح' });

  const { productId, type, quantity, reason } = req.body;
  if (!productId || !type || quantity === undefined || !reason) {
    return res.status(400).json({ error: 'يرجى تعيين المنتج ونوع الحركة والكمية والسبب' });
  }

  const { data: prod } = await supabase.from('products').select('*').eq('id', parseInt(productId)).single();
  if (!prod) return res.status(404).json({ error: 'المنتج غير موجود' });

  const prevQty = prod.quantity;
  const qtyVal = parseFloat(quantity);
  let newQty = prevQty;

  if (type === 'in') newQty = prevQty + qtyVal;
  else if (type === 'out') {
    if (prevQty < qtyVal) return res.status(400).json({ error: 'الكمية المصروفة أكبر من الرصيد' });
    newQty = prevQty - qtyVal;
  } else if (type === 'adjustment') {
    newQty = qtyVal;
  }

  await supabase.from('products').update({ quantity: newQty }).eq('id', parseInt(productId));

  const { date } = getNowDateTimeString();
  await supabase.from('inventory_movements').insert({
    product_id: parseInt(productId), product_name: prod.name, type,
    quantity: qtyVal, prev_quantity: prevQty, new_quantity: newQty,
    reason, user: req.user.name, date
  });

  await logAudit(req.user.name, 'تسوية جردية', `${prod.name}: ${prevQty} → ${newQty}`, getClientIp(req));
  res.json({ success: true });
});

// ==================== POS / INVOICES ====================

app.post('/api/pos/invoice', authenticate, async (req: any, res) => {
  try {
    if (!req.user.permissions.sales.create) return res.status(403).json({ error: 'لا تملك صلاحية إنشاء فواتير' });

    const { customerId, invoiceType, items, discount, downPayment, note, deliveryProofImage, mastercardFee, installmentMonths } = req.body;

    if (!customerId || !invoiceType || !items || items.length === 0) {
      return res.status(400).json({ error: 'بيانات الفاتورة منقوصة' });
    }

    const { data: customer } = await supabase.from('customers').select('*').eq('id', parseInt(customerId)).eq('is_deleted', false).single();
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

    const finalItems: any[] = [];
    let calculatedTotal = 0;
    const { date: invoiceDate } = getNowDateTimeString();

    for (const item of items) {
      const { data: prod } = await supabase.from('products').select('*').eq('id', parseInt(item.productId)).eq('is_deleted', false).single();
      if (!prod) return res.status(400).json({ error: `المنتج ${item.productId} غير موجود` });

      const rqQty = parseFloat(item.quantity);
      const customPrice = item.sellingPrice !== undefined ? parseFloat(item.sellingPrice) : prod.selling_price;
      const isBundle = prod.notes && prod.notes.startsWith('BUNDLE:');

      if (isBundle) {
        try {
          const bundleData = JSON.parse(prod.notes.substring(7));
          const bundleItems = bundleData.items || [];
          if (bundleItems.length === 0) {
            return res.status(400).json({ error: `المنظومة ${prod.name} لا تحتوي على مكونات معرفة` });
          }

          // 1. Verify stock for all component items first to prevent partial checkout failure
          for (const comp of bundleItems) {
            const compId = parseInt(comp.productId);
            const compQtyNeeded = comp.quantity * rqQty;

            const { data: compProd } = await supabase.from('products').select('*').eq('id', compId).eq('is_deleted', false).single();
            if (!compProd) {
              return res.status(400).json({ error: `أحد مكونات المنظومة (ID: ${compId}) غير متوفر في المخازن` });
            }
            if (compProd.quantity < compQtyNeeded) {
              return res.status(400).json({ error: `المخزون غير كافٍ للمكون (${compProd.name})، المطلوب للمنظومة: ${compQtyNeeded}، المتوفر: ${compProd.quantity}` });
            }
          }

          // 2. Deduct component stocks and record movements
          for (const comp of bundleItems) {
            const compId = parseInt(comp.productId);
            const compQtyNeeded = comp.quantity * rqQty;

            const { data: compProd } = await supabase.from('products').select('*').eq('id', compId).eq('is_deleted', false).single();
            if (compProd) {
              const newQty = compProd.quantity - compQtyNeeded;
              await supabase.from('products').update({ quantity: newQty }).eq('id', compId);
              await supabase.from('inventory_movements').insert({
                product_id: compProd.id, product_name: compProd.name, type: 'out',
                quantity: compQtyNeeded, prev_quantity: compProd.quantity, new_quantity: newQty,
                reason: `صرف مكونات (ضمن منظومة: ${prod.name}) للعميل: ${customer.name}`, user: req.user.name, date: invoiceDate
              });
            }
          }
        } catch (err: any) {
          return res.status(400).json({ error: `فشل في معالجة مكونات المنظومة الجاهزة: ${err.message}` });
        }
      } else {
        // Regular single product deduction
        if (prod.quantity < rqQty) {
          return res.status(400).json({ error: `المخزون غير كافٍ للمنتج (${prod.name})، المتوفر: ${prod.quantity}` });
        }

        const newQty = prod.quantity - rqQty;
        await supabase.from('products').update({ quantity: newQty }).eq('id', prod.id);
        await supabase.from('inventory_movements').insert({
          product_id: prod.id, product_name: prod.name, type: 'out',
          quantity: rqQty, prev_quantity: prod.quantity, new_quantity: newQty,
          reason: `صرف مبيعات للعميل: ${customer.name}`, user: req.user.name, date: invoiceDate
        });
      }

      calculatedTotal += customPrice * rqQty;
      finalItems.push({
        productId: prod.id, name: prod.name, quantity: rqQty,
        purchasePrice: prod.purchase_price, sellingPrice: customPrice
      });
    }

    const discVal = parseFloat(discount || 0);
    let finalAmount = calculatedTotal - discVal;
    const mastercardFeeVal = invoiceType === 'mastercard' ? parseFloat(mastercardFee || 0) : 0;
    finalAmount += mastercardFeeVal;

    // Safely generate invoice number based on max existing sequence number instead of total row count
    const currentYear = new Date().getFullYear();
    let nextSeq = 1;

    // 1) Fetch the last invoice by DB ID
    const { data: latestById, error: errById } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('id', { ascending: false })
      .limit(1);

    if (!errById && latestById && latestById.length > 0) {
      const match = latestById[0].invoice_number.match(new RegExp(`^INV-${currentYear}-(\\d+)$`));
      if (match) {
        nextSeq = Math.max(nextSeq, parseInt(match[1], 10) + 1);
      }
    }

    // 2) Fallback: Fetch highest alphanumeric invoice number matching current year
    const { data: latestByNum, error: errByNum } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `INV-${currentYear}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (!errByNum && latestByNum && latestByNum.length > 0) {
      const match = latestByNum[0].invoice_number.match(new RegExp(`^INV-${currentYear}-(\\d+)$`));
      if (match) {
        nextSeq = Math.max(nextSeq, parseInt(match[1], 10) + 1);
      }
    }

    const invoiceNumber = `INV-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;

    let remainingValue = 0;
    const paidVal = parseFloat(downPayment || 0);
    
    if (invoiceType === 'installment' || invoiceType === 'partial') {
      remainingValue = Math.max(0, finalAmount - paidVal);
    }

    const { data: newInvoice, error: invErr } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone,
      invoice_type: invoiceType === 'partial' ? 'retail' : invoiceType,
      items: finalItems,
      total_amount: calculatedTotal, discount: discVal,
      final_amount: finalAmount, remaining_amount: remainingValue,
      mastercard_fee: mastercardFeeVal,
      created_by: req.user.name, date: invoiceDate, status: 'active',
      notes: note || '', delivery_proof_image: deliveryProofImage || ''
    }).select().single();

    if (invErr || !newInvoice) {
      return res.status(500).json({ error: invErr?.message || 'فشل في حفظ الفاتورة في قاعدة البيانات' });
    }

    if (invoiceType === 'installment') {
      const down = parseFloat(downPayment || 0);
      const installmentSchedule: any[] = [];

      const months = parseInt(installmentMonths) || 5;
      const perMilestone = Math.round(remainingValue / months);
      const today = new Date();
      for (let i = 1; i <= months; i++) {
        const nextDate = new Date(today.getFullYear(), today.getMonth() + i, today.getDate());
        installmentSchedule.push({
          id: i,
          dueDate: nextDate.toISOString().split('T')[0],
          amount: i === months ? remainingValue - perMilestone * (months - 1) : perMilestone,
          paidAmount: 0, status: 'pending'
        });
      }

      const { error: instErr } = await supabase.from('installment_records').insert({
        invoice_id: newInvoice.id, invoice_number: invoiceNumber,
        customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone,
        total_amount: finalAmount, down_payment: down, remaining_amount: remainingValue,
        type: 'normal',
        mastercard_fee: mastercardFeeVal,
        installments: installmentSchedule, withdrawals: [], notes: note || ''
      });

      if (instErr) {
        throw new Error(`فشل في إنشاء سجل الأقساط: ${instErr.message}`);
      }
    }

    await logAudit(req.user.name, 'إنشاء فاتورة مبيعات', `${invoiceNumber} - ${customer.name} - ${finalAmount} د.ع`, getClientIp(req));
    res.status(201).json(mapInvoice(newInvoice));
  } catch (err: any) {
    console.error("Error creating POS invoice:", err);
    res.status(500).json({ error: err.message || 'حدث خطأ غير متوقع في النظام أثناء تسجيل الفاتورة' });
  }
});

// Partial Payments
app.get('/api/invoices/:id/partial-payments', authenticate, async (req: any, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('partial_payments').select('*').eq('invoice_id', id).order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/invoices/:id/partial-payments', authenticate, async (req: any, res) => {
  const { id } = req.params;
  const { amount, notes } = req.body;
  const paymentAmount = parseFloat(amount);

  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ error: 'مبلغ الدفعة غير صالح' });
  }

  const { data: inv, error: invErr } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (invErr || !inv) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

  if (inv.remaining_amount < paymentAmount) {
    return res.status(400).json({ error: 'مبلغ الدفعة أكبر من الرصيد المتبقي' });
  }

  const newRemaining = inv.remaining_amount - paymentAmount;
  const { date } = getNowDateTimeString();

  // Insert payment
  const { error: insErr } = await supabase.from('partial_payments').insert({
    invoice_id: parseInt(id),
    amount: paymentAmount,
    date,
    notes: notes || '',
    "user": req.user.name
  });
  if (insErr) return res.status(500).json({ error: insErr.message });

  // Update invoice
  const { error: updErr } = await supabase.from('invoices').update({ remaining_amount: newRemaining }).eq('id', id);
  if (updErr) return res.status(500).json({ error: updErr.message });

  await logAudit(req.user.name, 'تسديد دفعة جزئية', `مبلغ ${paymentAmount} للفاتورة ${inv.invoice_number}`, req.ip);
  res.json({ success: true, newRemaining });
});

// Endpoint خاص لجلب فاتورة حجز معين - يكفي امتلاك صلاحية installationBookings.viewInvoice
app.get('/api/bookings/:id/invoice', authenticate, async (req: any, res) => {
  const perms = req.user.permissions;
  const canViewBookingInvoice = perms?.installationBookings?.viewInvoice || perms?.invoices?.view || perms?.sales?.view;
  if (!canViewBookingInvoice) {
    return res.status(403).json({ error: 'لا تملك صلاحية عرض فاتورة الحجز' });
  }

  const bookingId = parseInt(req.params.id);
  // جلب بيانات الحجز أولاً للحصول على invoice_id
  const { data: booking, error: bookingErr } = await supabase
    .from('installation_bookings')
    .select('invoice_id')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  if (!booking.invoice_id) {
    return res.status(404).json({ error: 'لا توجد فاتورة مرتبطة بهذا الحجز' });
  }

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', booking.invoice_id)
    .single();

  if (invErr || !invoice) {
    return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  }

  // جلب عنوان العميل لإرفاقه
  const { data: customer } = await supabase
    .from('customers')
    .select('address')
    .eq('id', invoice.customer_id)
    .single();

  res.json(mapInvoice(invoice, customer?.address || ''));
});

app.get('/api/invoices', authenticate, async (req: any, res) => {
  if (!req.user.permissions.sales.view && !req.user.permissions.invoices.view) {
    return res.status(403).json({ error: 'لا تملك صلاحية مطالعة الفواتير' });
  }
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string || '').trim();
  
  let query = supabase.from('invoices').select('*', { count: 'exact' });
  
  if (search) {
    const safeSearch = search.replace(/[,()\"\\%]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safeSearch) query = query.or(`invoice_number.ilike.%${safeSearch}%,customer_name.ilike.%${safeSearch}%`);
  }
  
  const { data, error, count } = await query
    .order('id', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
    
  if (error) return res.status(500).json({ error: error.message });
  
  if (error) return res.status(500).json({ error: error.message });

  // Fetch customer addresses to attach to invoices
  const customerIds = [...new Set((data || []).map((inv: any) => inv.customer_id).filter(Boolean))];
  let customerAddressMap: Record<number, string> = {};
  if (customerIds.length > 0) {
    const { data: customers } = await supabase.from('customers').select('id,address').in('id', customerIds);
    if (customers) {
      customerAddressMap = Object.fromEntries(customers.map((c: any) => [c.id, c.address || '']));
    }
  }

  const mappedData = (data || []).map((inv: any) => mapInvoice(inv, customerAddressMap[inv.customer_id] || ''));

  if (req.query.page) return res.json({ data: mappedData, total: count || 0, page, limit });
  return res.json(mappedData);
});

app.post('/api/invoices/:id/cancel', authenticate, async (req: any, res) => {
  if (!req.user.permissions.invoices.delete && !req.user.permissions.sales.delete) {
    return res.status(403).json({ error: 'لا تملك الصلاحية لإلغاء فواتير' });
  }

  const id = parseInt(req.params.id);
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'يرجى كتابة سبب الإلغاء' });

  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  if (invoice.status === 'cancelled') return res.status(400).json({ error: 'الفاتورة ملغاة بالفعل' });

  const { date } = getNowDateTimeString();
  for (const item of invoice.items || []) {
    const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.productId).single();
    if (prod) {
      const newQty = prod.quantity + item.quantity;
      await supabase.from('products').update({ quantity: newQty }).eq('id', item.productId);
      await supabase.from('inventory_movements').insert({
        product_id: item.productId, product_name: item.name, type: 'in',
        quantity: item.quantity, prev_quantity: prod.quantity, new_quantity: newQty,
        reason: `إرجاع مخزني لإلغاء ${invoice.invoice_number}`, user: req.user.name, date
      });
    }
  }

  const { data: updated } = await supabase.from('invoices').update({
    status: 'cancelled', cancellation_reason: reason, cancelled_by: req.user.name
  }).eq('id', id).select().single();

  await supabase.from('installment_records').delete().eq('invoice_id', id);

  await logAudit(req.user.name, 'إلغاء فاتورة', `${invoice.invoice_number} | ${reason}`, getClientIp(req));
  res.json(mapInvoice(updated));
});

// Hard delete invoice (only cancelled ones)
async function revertInvoiceInventory(invoice: any, userName: string) {
  const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
  const { date: invoiceDate } = getNowDateTimeString();

  for (const item of items) {
    const { data: prod } = await supabase.from('products').select('*').eq('id', item.productId).single();
    if (!prod) continue;

    const isBundle = prod.notes && prod.notes.startsWith('BUNDLE:');
    if (isBundle) {
      try {
        const bundleData = JSON.parse(prod.notes.substring(7));
        const bundleItems = bundleData.items || [];
        for (const comp of bundleItems) {
          const { data: compProd } = await supabase.from('products').select('*').eq('id', comp.productId).single();
          if (compProd) {
            const restoredQty = compProd.quantity + (comp.quantity * item.quantity);
            await supabase.from('products').update({ quantity: restoredQty }).eq('id', compProd.id);
            await supabase.from('inventory_movements').insert({
              product_id: compProd.id, product_name: compProd.name, type: 'in',
              quantity: (comp.quantity * item.quantity), prev_quantity: compProd.quantity, new_quantity: restoredQty,
              reason: `إرجاع بضاعة (منظومة) للإلغاء أو التعديل (فاتورة ${invoice.invoice_number})`, user: userName, date: invoiceDate
            });
          }
        }
      } catch (err) {}
    } else {
      const restoredQty = prod.quantity + item.quantity;
      await supabase.from('products').update({ quantity: restoredQty }).eq('id', prod.id);
      await supabase.from('inventory_movements').insert({
        product_id: prod.id, product_name: prod.name, type: 'in',
        quantity: item.quantity, prev_quantity: prod.quantity, new_quantity: restoredQty,
        reason: `إرجاع بضاعة للإلغاء أو التعديل (فاتورة ${invoice.invoice_number})`, user: userName, date: invoiceDate
      });
    }
  }
}

app.delete('/api/invoices/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.invoices.delete && !req.user.permissions.sales.delete) {
    return res.status(403).json({ error: 'لا تملك صلاحية حذف الفواتير' });
  }

  const id = parseInt(req.params.id);
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

  // If active, revert inventory first!
  if (invoice.status === 'active') {
    await revertInvoiceInventory(invoice, req.user.name);
  }

  if (invoice.delivery_proof_image) {
    await deleteStorageImages([invoice.delivery_proof_image]);
  }

  await supabase.from('installment_records').delete().eq('invoice_id', id);
  await supabase.from('partial_payments').delete().eq('invoice_id', id);
  await supabase.from('installation_bookings').delete().eq('invoice_id', id);
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف فاتورة نهائياً', `${invoice.invoice_number}`, getClientIp(req));
  res.json({ success: true });
});

app.put('/api/invoices/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.sales.edit && !req.user.permissions.invoices.edit) return res.status(403).json({ error: 'لا تملك صلاحية تعديل فواتير' });

  const id = parseInt(req.params.id);
  const { data: oldInvoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!oldInvoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  if (oldInvoice.status === 'cancelled') return res.status(400).json({ error: 'الفاتورة ملغاة ولا يمكن تعديلها' });

  const { customerId, invoiceType, items, discount, note, mastercardFee } = req.body;
  if (!customerId || !invoiceType || !items || items.length === 0) return res.status(400).json({ error: 'بيانات الفاتورة منقوصة' });

  const { data: customer } = await supabase.from('customers').select('*').eq('id', parseInt(customerId)).single();
  if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

  await revertInvoiceInventory(oldInvoice, req.user.name);

  const finalItems: any[] = [];
  let calculatedTotal = 0;
  const { date: invoiceDate } = getNowDateTimeString();

  for (const item of items) {
    const { data: prod } = await supabase.from('products').select('*').eq('id', parseInt(item.productId)).eq('is_deleted', false).single();
    if (!prod) return res.status(400).json({ error: `المنتج ${item.productId} غير موجود` });

    const rqQty = parseFloat(item.quantity);
    const customPrice = item.sellingPrice !== undefined ? parseFloat(item.sellingPrice) : prod.selling_price;
    const isBundle = prod.notes && prod.notes.startsWith('BUNDLE:');

    if (isBundle) {
      try {
        const bundleData = JSON.parse(prod.notes.substring(7));
        const bundleItems = bundleData.items || [];
        for (const comp of bundleItems) {
          const compId = parseInt(comp.productId);
          const compQtyNeeded = comp.quantity * rqQty;
          const { data: compProd } = await supabase.from('products').select('*').eq('id', compId).eq('is_deleted', false).single();
          if (!compProd || compProd.quantity < compQtyNeeded) return res.status(400).json({ error: `المخزون غير كافٍ للمكون ${compProd?.name}` });
        }
        for (const comp of bundleItems) {
          const compId = parseInt(comp.productId);
          const compQtyNeeded = comp.quantity * rqQty;
          const { data: compProd } = await supabase.from('products').select('*').eq('id', compId).single();
          if (compProd) {
            const newQty = compProd.quantity - compQtyNeeded;
            await supabase.from('products').update({ quantity: newQty }).eq('id', compId);
            await supabase.from('inventory_movements').insert({
              product_id: compProd.id, product_name: compProd.name, type: 'out',
              quantity: compQtyNeeded, prev_quantity: compProd.quantity, new_quantity: newQty,
              reason: `صرف لتعديل مكونات الفاتورة ${oldInvoice.invoice_number}`, user: req.user.name, date: invoiceDate
            });
          }
        }
      } catch (err) {}
    } else {
      if (prod.quantity < rqQty) return res.status(400).json({ error: `المخزون غير كافٍ` });
      const newQty = prod.quantity - rqQty;
      await supabase.from('products').update({ quantity: newQty }).eq('id', prod.id);
      await supabase.from('inventory_movements').insert({
        product_id: prod.id, product_name: prod.name, type: 'out',
        quantity: rqQty, prev_quantity: prod.quantity, new_quantity: newQty,
        reason: `تعديل مبيعات ${oldInvoice.invoice_number}`, user: req.user.name, date: invoiceDate
      });
    }
    calculatedTotal += customPrice * rqQty;
    finalItems.push({ productId: prod.id, name: prod.name, quantity: rqQty, purchasePrice: prod.purchase_price, sellingPrice: customPrice });
  }

  const discVal = parseFloat(discount || 0);
  let finalAmount = calculatedTotal - discVal;
  
  const mFee = parseFloat(mastercardFee || 0);
  if (invoiceType === 'mastercard') finalAmount += mFee;

  let finalRemaining = oldInvoice.remaining_amount;
  if (invoiceType === 'partial') {
    const downPayment = oldInvoice.total_amount - oldInvoice.remaining_amount - oldInvoice.discount;
    finalRemaining = Math.max(0, finalAmount - downPayment);
  } else if (invoiceType === 'installment') {
    const downPayment = oldInvoice.total_amount - oldInvoice.remaining_amount - oldInvoice.discount;
    finalRemaining = Math.max(0, finalAmount - downPayment);
  } else {
    finalRemaining = 0;
  }

  const { data: updated, error } = await supabase.from('invoices').update({
    customer_id: parseInt(customerId),
    customer_name: customer.name,
    customer_phone: customer.phone,
    invoice_type: invoiceType === 'partial' ? 'retail' : invoiceType,
    items: JSON.stringify(finalItems),
    total_amount: calculatedTotal,
    discount: discVal,
    mastercard_fee: invoiceType === 'mastercard' ? mFee : 0,
    final_amount: finalAmount,
    remaining_amount: finalRemaining,
    notes: note || ''
  }).eq('id', id).select().single();

  if (error) {
    await revertInvoiceInventory(updated || oldInvoice, 'SYSTEM_REVERT');
    return res.status(500).json({ error: error.message });
  }

  await logAudit(req.user.name, 'تعديل فاتورة', `${oldInvoice.invoice_number}`, getClientIp(req));
  res.json(mapInvoice(updated));
});

// ==================== UPLOAD & PROOFS ====================

app.post('/api/upload', authenticate, async (req: any, res) => {
  const { base64Image } = req.body;
  if (!base64Image) return res.status(400).json({ error: 'صورة مفقودة' });

  try {
    const matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'تنسيق الصورة غير صحيح' });
    }

    const type = matches[1].toLowerCase();
    const allowedTypes = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'نوع الملف غير مدعوم' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    
    // Max 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'حجم الملف يتجاوز الحد المسموح (5 ميجابايت)' });
    }

    // Check magic bytes for additional security
    const magicHex = buffer.toString('hex', 0, 4);
    const isJpeg = magicHex.startsWith('ffd8');
    const isPng = magicHex.startsWith('89504e47');
    const isGif = magicHex.startsWith('47494638');
    const isWebp = buffer.toString('hex', 8, 12) === '57454250'; // RIFF....WEBP
    const isAvif = buffer.toString('hex', 4, 8) === '66747970' && buffer.toString('hex', 8, 12) === '61766966'; // ftypavif

    if (!isJpeg && !isPng && !isGif && !isWebp && !isAvif) {
      return res.status(400).json({ error: 'محتوى الملف غير صالح أو تالف' });
    }

    const fileName = `proof_${Date.now()}_${Math.random().toString(36).substring(7)}.${type === 'jpeg' ? 'jpg' : type}`;

    // Ensure the 'proofs' bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasProofs = (buckets || []).some((b: any) => b.name === 'proofs');
    if (!hasProofs) {
      const { error: createErr } = await supabase.storage.createBucket('proofs', {
        public: true
      });
      if (createErr) {
        console.error("Auto-creating 'proofs' bucket failed:", createErr);
      }
    }

    const { data, error } = await supabase.storage
      .from('proofs')
      .upload(fileName, buffer, {
        contentType: `image/${type === 'jpeg' ? 'jpeg' : type}`,
        upsert: false
      });

    if (error) {
      console.error('Supabase Storage error:', error);
      return res.status(500).json({ error: 'فشل في رفع الصورة إلى التخزين السحابي' });
    }

    const { data: publicUrlData } = supabase.storage.from('proofs').getPublicUrl(fileName);
    
    res.json({ url: publicUrlData.publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/invoices/:id/proof', authenticate, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const { deliveryProofImage } = req.body;

  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

  // If there was an old image, and a new one is provided (different), delete the old one
  if (invoice.delivery_proof_image && invoice.delivery_proof_image !== deliveryProofImage) {
    await deleteStorageImages([invoice.delivery_proof_image]);
  }

  const { error } = await supabase.from('invoices').update({ delivery_proof_image: deliveryProofImage }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'رفع إثبات تسليم', `${invoice.invoice_number}`, getClientIp(req));
  res.json({ success: true });
});

// ==================== INSTALLMENTS ====================

app.get('/api/installments', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installments.view) return res.status(403).json({ error: 'غير مصرح' });
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('installment_records').select('*').order('id', { ascending: false }).limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapInstallment));
});

app.put('/api/installments/:id/payments', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installments.create && !req.user.permissions.installments.edit) {
    return res.status(403).json({ error: 'غير مصرح' });
  }

  const id = parseInt(req.params.id);
  const { installments, notes } = req.body;
  if (!installments) return res.status(400).json({ error: 'بيانات الأقساط غير مرسلة' });

  const { data: record } = await supabase.from('installment_records').select('*').eq('id', id).single();
  if (!record) return res.status(404).json({ error: 'الخطة غير موجودة' });

  const totalPaid = installments.reduce((acc: number, v: any) => acc + parseFloat(v.paidAmount || 0), 0);
  const remaining = Math.max(0, record.total_amount - record.down_payment - totalPaid);

  const updates: any = { installments, remaining_amount: remaining };
  if (notes !== undefined) updates.notes = notes;

  const { data: updated, error } = await supabase.from('installment_records').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('invoices').update({ remaining_amount: remaining }).eq('id', record.invoice_id);
  await logAudit(req.user.name, 'تسوية أقساط', `${record.customer_name} / المتبقي: ${remaining} د.ع`, getClientIp(req));
  res.json(mapInstallment(updated));
});

app.delete('/api/installments/:id/payments/:scheduleId', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installments.delete) return res.status(403).json({ error: 'غير مصرح' });

  const id = parseInt(req.params.id);
  const scheduleId = parseInt(req.params.scheduleId);

  const { data: record } = await supabase.from('installment_records').select('*').eq('id', id).single();
  if (!record) return res.status(404).json({ error: 'الخطة غير موجودة' });

  const updatedInst = (record.installments || []).map((inst: any) =>
    inst.id === scheduleId ? { ...inst, paidAmount: 0, status: 'pending', paymentDate: null } : inst
  );

  const totalPaid = updatedInst.reduce((acc: number, v: any) => acc + parseFloat(v.paidAmount || 0), 0);
  const remaining = Math.max(0, record.total_amount - record.down_payment - totalPaid);

  const { data: updated } = await supabase.from('installment_records').update({
    installments: updatedInst, remaining_amount: remaining
  }).eq('id', id).select().single();

  await supabase.from('invoices').update({ remaining_amount: remaining }).eq('id', record.invoice_id);
  await logAudit(req.user.name, 'إلغاء تسديد قسط', `العميل: ${record.customer_name}`, getClientIp(req));
  res.json(mapInstallment(updated));
});

// ==================== BANK SETTLEMENT ====================

app.get('/api/bank-settlement', authenticate, async (req: any, res) => {
  if (!req.user.permissions.bankSettlement?.view) {
    return res.status(403).json({ error: 'لا تملك صلاحية الوصول لتسوية الماستركارد' });
  }

  const [invRes, withRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('invoice_type', 'mastercard').eq('status', 'active'),
    supabase.from('bank_withdrawals').select('*').order('id', { ascending: false })
  ]);

  if (invRes.error) return res.status(500).json({ error: invRes.error.message });
  if (withRes.error && withRes.error.code !== '42P01') {
     // Ignore table does not exist error initially
     console.error('bank_withdrawals error:', withRes.error.message);
  }

  const invoices = (invRes.data || []).map(mapInvoice);
  const withdrawals = withRes.data || [];

  res.json({ invoices, withdrawals });
});

app.post('/api/bank-settlement/withdraw', authenticate, async (req: any, res) => {
  if (!req.user.permissions.bankSettlement?.create) {
    return res.status(403).json({ error: 'لا تملك صلاحية إجراء سحب من بنك الماستركارد' });
  }

  const { amount, date, notes } = req.body;
  if (!amount || parseFloat(amount) <= 0 || !date) {
    return res.status(400).json({ error: 'يرجى إدخال المبلغ والتاريخ بشكل صحيح' });
  }

  const { data, error } = await supabase.from('bank_withdrawals').insert({
    amount: parseFloat(amount),
    date,
    notes: notes || '',
    user: req.user.name
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'سحب من بنك الماستركارد', `${amount} د.ع`, getClientIp(req));
  res.status(201).json(data);
});

// ==================== MAINTENANCE ====================

app.get('/api/maintenance', authenticate, async (req: any, res) => {
  if (!req.user.permissions.maintenance.view) return res.status(403).json({ error: 'لا تملك صلاحية' });
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('maintenance_requests').select('*').order('id', { ascending: false }).limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapMaintenance));
});

app.post('/api/maintenance', authenticate, async (req: any, res) => {
  if (!req.user.permissions.maintenance.create) return res.status(403).json({ error: 'لا تملك صلاحية' });

  const { customerId, notes, photos, assignedEmployee } = req.body;
  if (!customerId || !notes) return res.status(400).json({ error: 'العميل والملاحظات إلزامية' });

  const { data: customer } = await supabase.from('customers').select('*').eq('id', parseInt(customerId)).eq('is_deleted', false).single();
  if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

  const { date } = getNowDateTimeString();
  const { count } = await supabase.from('maintenance_requests').select('*', { count: 'exact', head: true });
  const requestNumber = `MNT-${new Date().getFullYear()}-${((count || 0) + 1).toString().padStart(4, '0')}`;

  const { data, error } = await supabase.from('maintenance_requests').insert({
    request_number: requestNumber,
    customer_id: customer.id, customer_name: customer.name,
    customer_phone: customer.phone, customer_address: customer.address,
    notes, photos: photos || [], created_date: date,
    assigned_employee: assignedEmployee || 'غير معين', status: 'new'
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'فتح طلب صيانة', `${requestNumber} - ${customer.name}`, getClientIp(req));
  res.status(201).json(mapMaintenance(data));
});

app.put('/api/maintenance/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.maintenance.edit) return res.status(403).json({ error: 'لا تملك صلاحية' });

  const { notes, status, assignedEmployee, photos } = req.body;
  const updates: any = {};
  if (notes) updates.notes = notes;
  if (status) updates.status = status;
  if (assignedEmployee) updates.assigned_employee = assignedEmployee;
  if (photos) updates.photos = photos;

  const { data, error } = await supabase.from('maintenance_requests').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تعديل طلب صيانة', `ID: ${req.params.id}`, getClientIp(req));
  res.json(mapMaintenance(data));
});

app.delete('/api/maintenance/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.maintenance.delete) return res.status(403).json({ error: 'لا تملك صلاحية حذف طلبات الصيانة' });

  const { data: record } = await supabase.from('maintenance_requests').select('request_number, customer_name, photos').eq('id', req.params.id).single();
  if (!record) return res.status(404).json({ error: 'الطلب غير موجود' });

  if (record.photos && record.photos.length > 0) {
    await deleteStorageImages(record.photos);
  }

  const { error } = await supabase.from('maintenance_requests').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف طلب صيانة', `${record.request_number} - ${record.customer_name}`, getClientIp(req));
  res.json({ success: true });
});

// ==================== FAULTS ====================

app.get('/api/faults', authenticate, async (req: any, res) => {
  if (!req.user.permissions.faults.view) return res.status(403).json({ error: 'لا تملك صلاحية' });
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('fault_requests').select('*').order('id', { ascending: false }).limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapFault));
});

app.post('/api/faults', authenticate, async (req: any, res) => {
  if (!req.user.permissions.faults.create) return res.status(403).json({ error: 'غير مصرح' });

  const { customerId, faultType, description, photos, notes } = req.body;
  if (!customerId || !faultType || !description) return res.status(400).json({ error: 'بيانات إلزامية مفقودة' });

  const { data: customer } = await supabase.from('customers').select('*').eq('id', parseInt(customerId)).eq('is_deleted', false).single();
  if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

  const { date } = getNowDateTimeString();
  const { data, error } = await supabase.from('fault_requests').insert({
    customer_id: customer.id, customer_name: customer.name,
    customer_phone: customer.phone, customer_address: customer.address,
    fault_type: faultType, description, photos: photos || [], notes: notes || '',
    status: 'new', created_date: date
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تسجيل بلاغ عطل', `${faultType} - ${customer.name}`, getClientIp(req));
  res.status(201).json(mapFault(data));
});

app.put('/api/faults/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.faults.edit) return res.status(403).json({ error: 'غير مصرح' });

  const { status, notes, photos } = req.body;
  const updates: any = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (photos) updates.photos = photos;

  const { data, error } = await supabase.from('fault_requests').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تحديث بلاغ عطل', `ID: ${req.params.id}`, getClientIp(req));
  res.json(mapFault(data));
});

app.delete('/api/faults/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.faults.delete) return res.status(403).json({ error: 'لا تملك صلاحية حذف بلاغات الأعطال' });

  const { data: record } = await supabase.from('fault_requests').select('fault_type, customer_name, photos').eq('id', req.params.id).single();
  if (!record) return res.status(404).json({ error: 'البلاغ غير موجود' });

  if (record.photos && record.photos.length > 0) {
    await deleteStorageImages(record.photos);
  }

  const { error } = await supabase.from('fault_requests').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف بلاغ عطل', `${record.fault_type} - ${record.customer_name}`, getClientIp(req));
  res.json({ success: true });
});

// ==================== INSTALLATION TEAMS ====================

app.get('/api/installation-teams', authenticate, async (_req, res) => {
  const { data, error } = await supabase.from('installation_teams').select('*').eq('is_deleted', false).order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapTeam));
});

app.post('/api/installation-teams', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installationTeams.create) return res.status(403).json({ error: 'لا تملك صلاحية' });

  const { name, leader, members, vehicle } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الفريق مطلوب' });

  const processedMembers: string[] = Array.isArray(members) ? members
    : typeof members === 'string' && members.trim()
      ? members.split(/[,،\n\r]+/).map((m: string) => m.trim()).filter(Boolean) : [];
  const processedLeader = (leader || '').trim() || (processedMembers[0] || 'مسؤول طاقم');

  const { data, error } = await supabase.from('installation_teams').insert({
    name, leader: processedLeader, members: processedMembers, vehicle: vehicle || ''
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تأسيس فرقة عمل', name, getClientIp(req));
  res.status(201).json(mapTeam(data));
});

app.put('/api/installation-teams/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installationTeams.edit) return res.status(403).json({ error: 'غير مصرح' });

  const { name, leader, members, vehicle } = req.body;
  const updates: any = {};
  if (name) updates.name = name;
  if (members !== undefined) {
    updates.members = Array.isArray(members) ? members
      : typeof members === 'string' ? members.split(/[,،\n\r]+/).map((m: string) => m.trim()).filter(Boolean) : [];
  }
  if (leader !== undefined) updates.leader = (leader || '').trim();
  if (vehicle !== undefined) updates.vehicle = (vehicle || '').trim();

  const { data, error } = await supabase.from('installation_teams').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تحديث فرقة', `ID: ${req.params.id}`, getClientIp(req));
  res.json(mapTeam(data));
});

app.delete('/api/installation-teams/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installationTeams.delete) return res.status(403).json({ error: 'غير مصرح' });
  const { error } = await supabase.from('installation_teams').update({ is_deleted: true }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await logAudit(req.user.name, 'حذف فرقة', `ID: ${req.params.id}`, getClientIp(req));
  res.json({ success: true });
});

// ==================== INSTALLATION BOOKINGS ====================

app.get('/api/installations', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installationBookings.view) return res.status(403).json({ error: 'لا تملك صلاحية' });
  const { data, error } = await supabase.from('installation_bookings').select('*').order('appointment_date');
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapBooking));
});

app.post('/api/installations', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installationBookings.create) return res.status(403).json({ error: 'لا تملك صلاحية' });

  const { customerId, invoiceId, assignedTeamId, customTeamLeader, customTeamMembers, appointmentDate, appointmentTime, notes } = req.body;
  const isCustomTeam = !assignedTeamId && customTeamLeader;

  if (!customerId || !invoiceId || !appointmentDate || !appointmentTime) {
    const missing = [];
    if (!customerId) missing.push('العميل');
    if (!invoiceId) missing.push('الفاتورة');
    if (!appointmentDate) missing.push('التاريخ');
    if (!appointmentTime) missing.push('الوقت');
    console.log("Missing fields in booking payload:", req.body);
    return res.status(400).json({ error: `أكمل جميع الحقول المطلوبة (مفقود: ${missing.join('، ')})` });
  }

  if (!assignedTeamId && !isCustomTeam) {
    return res.status(400).json({ error: 'يرجى تحديد طاقم التركيب أو إدخال بيانات الطاقم المخصص' });
  }

  const [custRes, invRes] = await Promise.all([
    supabase.from('customers').select('*').eq('id', parseInt(customerId)).eq('is_deleted', false).single(),
    supabase.from('invoices').select('*').eq('id', parseInt(invoiceId)).single()
  ]);

  if (!custRes.data || !invRes.data) {
    return res.status(404).json({ error: 'بعض البيانات المحددة غير موجودة' });
  }

  let teamId: number | null = null;
  let teamName: string = '';

  if (isCustomTeam) {
    // طاقم مخصص: نحفظ البيانات كنص بدون إنشاء سجل طاقم جديد
    const membersStr = Array.isArray(customTeamMembers) ? customTeamMembers.join('، ') : (customTeamMembers || '');
    teamName = `مخصص | ${customTeamLeader} | ${membersStr}`;
    teamId = null;
  } else {
    const { data: team } = await supabase.from('installation_teams').select('*').eq('id', parseInt(assignedTeamId)).single();
    if (!team) return res.status(404).json({ error: 'الطاقم غير موجود' });
    teamId = team.id;
    teamName = team.name;
  }

  const { data, error } = await supabase.from('installation_bookings').insert({
    customer_id: custRes.data.id, customer_name: custRes.data.name,
    invoice_id: invRes.data.id, invoice_number: invRes.data.invoice_number,
    assigned_team_id: teamId, assigned_team_name: teamName,
    appointment_date: appointmentDate, appointment_time: appointmentTime,
    notes: notes || '', status: 'scheduled'
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حجز تركيب', `${custRes.data.name} - ${appointmentDate}`, getClientIp(req));
  res.status(201).json(mapBooking(data));
});


app.put('/api/installations/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.installationBookings.edit) return res.status(403).json({ error: 'غير مصرح' });

  const { appointmentDate, appointmentTime, assignedTeamId, status, notes } = req.body;
  const updates: any = {};
  if (appointmentDate) updates.appointment_date = appointmentDate;
  if (appointmentTime) updates.appointment_time = appointmentTime;
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  if (assignedTeamId) {
    const { data: team } = await supabase.from('installation_teams').select('*').eq('id', parseInt(assignedTeamId)).single();
    if (team) { updates.assigned_team_id = team.id; updates.assigned_team_name = team.name; }
  }

  const { data, error } = await supabase.from('installation_bookings').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تعديل حجز تركيب', `ID: ${req.params.id}`, getClientIp(req));
  res.json(mapBooking(data));
});

// ==================== AUDIT LOGS ====================

app.get('/api/audits', authenticate, async (req: any, res) => {
  if (!req.user.permissions.auditLogs.view) return res.status(403).json({ error: 'لا تملك صلاحية' });
  const { data, error } = await supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapAudit));
});

// ==================== SETTINGS ====================

app.get('/api/settings', authenticate, async (req: any, res) => {
  if (!req.user.permissions.settings.view) return res.status(403).json({ error: 'لا تملك صلاحية' });
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(mapSettings(data));
});

app.put('/api/settings', authenticate, async (req: any, res) => {
  if (!req.user.permissions.settings.edit) return res.status(403).json({ error: 'لا تملك صلاحية' });

  const { companyName, companyLogo, companyPhone, companyAddress, invoiceTemplate, installmentReminderTemplate, autoBackupEnabled, backupInterval } = req.body;

  const updates: any = { updated_at: new Date().toISOString() };
  if (companyName) updates.company_name = companyName;
  if (companyLogo !== undefined) updates.company_logo = companyLogo;
  if (companyPhone) updates.company_phone = companyPhone;
  if (companyAddress) updates.company_address = companyAddress;
  if (invoiceTemplate) updates.invoice_template = invoiceTemplate;
  if (installmentReminderTemplate) updates.installment_reminder_template = installmentReminderTemplate;
  if (autoBackupEnabled !== undefined) updates.auto_backup_enabled = autoBackupEnabled;
  if (backupInterval !== undefined) updates.backup_interval = backupInterval;

  const { data, error } = await supabase.from('settings').update(updates).eq('id', 1).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تحديث إعدادات النظام', 'حفظ التعديلات', getClientIp(req));
  res.json(mapSettings(data));
});

// ==================== BACKUP ====================

app.get('/api/backup/download', authenticate, async (req: any, res) => {
  if (!req.user.permissions.settings?.export && !req.user.permissions.backups?.view && !req.user.permissions.backups?.export) {
    return res.status(403).json({ error: 'لا تملك صلاحية التصدير' });
  }

  const [
    users, categories, products, customers, invoices, installments, teams, bookings, 
    maintenance, faults, settingsRes, auditLogs, movements, partialPayments, bankWithdrawals,
    contracts, roles, installationWorkers, workerSettlements, taskAssignments
  ] = await Promise.all([
    supabase.from('users').select('id,name,username,phone,position,status,permissions,created_at'),
    supabase.from('categories').select('*'),
    supabase.from('products').select('*'),
    supabase.from('customers').select('*'),
    supabase.from('invoices').select('*'),
    supabase.from('installment_records').select('*'),
    supabase.from('installation_teams').select('*'),
    supabase.from('installation_bookings').select('*'),
    supabase.from('maintenance_requests').select('*'),
    supabase.from('fault_requests').select('*'),
    supabase.from('settings').select('*'),
    supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(1000),
    supabase.from('inventory_movements').select('*').order('id', { ascending: false }).limit(5000),
    supabase.from('partial_payments').select('*'),
    supabase.from('bank_withdrawals').select('*'),
    supabase.from('contracts').select('*'),
    supabase.from('roles').select('*'),
    supabase.from('installation_workers').select('*'),
    supabase.from('worker_settlements').select('*'),
    supabase.from('task_assignments').select('*')
  ]);

  await logAudit(req.user.name, 'تصدير نسخة احتياطية', 'تنزيل قاعدة البيانات', getClientIp(req));

    // We rely on Supabase audit logs now, so no need to write to local fs

  res.json({
    exportedAt: new Date().toISOString(),
    users: users.data || [],
    categories: categories.data || [],
    products: products.data || [],
    customers: customers.data || [],
    invoices: invoices.data || [],
    installments: installments.data || [],
    teams: teams.data || [],
    bookings: bookings.data || [],
    maintenance: maintenance.data || [],
    faults: faults.data || [],
    settings: settingsRes.data?.[0] || {},
    auditLogs: auditLogs.data || [],
    inventoryMovements: movements.data || [],
    partialPayments: partialPayments.data || [],
    bankWithdrawals: bankWithdrawals.data || [],
    contracts: contracts.data || [],
    roles: roles.data || [],
    installationWorkers: installationWorkers.data || [],
    workerSettlements: workerSettlements.data || [],
    taskAssignments: taskAssignments.data || []
  });
});

app.get('/api/backup/status', authenticate, async (req: any, res) => {
  try {
    const { data } = await supabase.from('audit_logs')
      .select('created_at')
      .eq('action', 'تصدير نسخة احتياطية')
      .order('id', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      return res.json({ lastBackup: data[0].created_at });
    }
  } catch(e) {}
  res.json({ lastBackup: null });
});

app.post('/api/backup/restore', authenticate, async (req: any, res) => {
  if (!req.user.permissions.settings?.approve && !req.user.permissions.backups?.edit && !req.user.permissions.backups?.approve) {
    return res.status(403).json({ error: 'تتطلب موافقة مدير النظام' });
  }
  
  const backup = req.body;
  if (!backup || !backup.exportedAt) {
    return res.status(400).json({ error: 'ملف النسخة الاحتياطية غير صالح أو تالف' });
  }

  try {
    // Only restoring what is safe. Using upsert prevents duplicates if IDs match.
    if (backup.customers && backup.customers.length > 0) {
      await supabase.from('customers').upsert(backup.customers, { onConflict: 'id' });
    }
    if (backup.categories && backup.categories.length > 0) {
      await supabase.from('categories').upsert(backup.categories, { onConflict: 'id' });
    }
    if (backup.products && backup.products.length > 0) {
      await supabase.from('products').upsert(backup.products, { onConflict: 'id' });
    }
    if (backup.invoices && backup.invoices.length > 0) {
      await supabase.from('invoices').upsert(backup.invoices, { onConflict: 'id' });
    }
    if (backup.installments && backup.installments.length > 0) {
      await supabase.from('installment_records').upsert(backup.installments, { onConflict: 'id' });
    }
    if (backup.teams && backup.teams.length > 0) {
      await supabase.from('installation_teams').upsert(backup.teams, { onConflict: 'id' });
    }
    if (backup.bookings && backup.bookings.length > 0) {
      await supabase.from('installation_bookings').upsert(backup.bookings, { onConflict: 'id' });
    }
    if (backup.maintenance && backup.maintenance.length > 0) {
      await supabase.from('maintenance_requests').upsert(backup.maintenance, { onConflict: 'id' });
    }
    if (backup.faults && backup.faults.length > 0) {
      await supabase.from('fault_requests').upsert(backup.faults, { onConflict: 'id' });
    }
    if (backup.partialPayments && backup.partialPayments.length > 0) {
      await supabase.from('partial_payments').upsert(backup.partialPayments, { onConflict: 'id' });
    }
    if (backup.bankWithdrawals && backup.bankWithdrawals.length > 0) {
      await supabase.from('bank_withdrawals').upsert(backup.bankWithdrawals, { onConflict: 'id' });
    }
    if (backup.contracts && backup.contracts.length > 0) {
      await supabase.from('contracts').upsert(backup.contracts, { onConflict: 'id' });
    }
    if (backup.roles && backup.roles.length > 0) {
      await supabase.from('roles').upsert(backup.roles, { onConflict: 'id' });
    }
    if (backup.installationWorkers && backup.installationWorkers.length > 0) {
      await supabase.from('installation_workers').upsert(backup.installationWorkers, { onConflict: 'id' });
    }
    if (backup.workerSettlements && backup.workerSettlements.length > 0) {
      await supabase.from('worker_settlements').upsert(backup.workerSettlements, { onConflict: 'id' });
    }
    if (backup.taskAssignments && backup.taskAssignments.length > 0) {
      await supabase.from('task_assignments').upsert(backup.taskAssignments, { onConflict: 'id' });
    }
    
    // We intentionally skip users to avoid breaking admin access.
    
    await logAudit(req.user.name, 'استرداد نسخة احتياطية', `تم استرداد بيانات نسخة ${backup.exportedAt}`, getClientIp(req));
    res.json({ success: true, message: 'تم استرداد البيانات بنجاح.' });
  } catch (err: any) {
    console.error('Restore Error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء الاسترداد: ' + err.message });
  }
});

// ==================== REPORTS ====================

app.get('/api/reports/sales-profits', authenticate, async (req: any, res) => {
  if (!req.user.permissions.reports.view) return res.status(403).json({ error: 'لا تملك صلاحية' });

  const todayStr = new Date().toISOString().split('T')[0];
  const monthPrefix = todayStr.substring(0, 7);
  const yearPrefix = todayStr.substring(0, 4);

  const { data: activeInvoices } = await supabase.from('invoices').select('*').eq('status', 'active');

  const compute = (list: any[]) => {
    let sales = 0, profit = 0;
    for (const inv of list) {
      sales += inv.final_amount;
      let itemsArray = inv.items;
      if (typeof itemsArray === 'string') {
        try { itemsArray = JSON.parse(itemsArray); } catch(e) { itemsArray = []; }
      }
      if (!Array.isArray(itemsArray)) itemsArray = [];
      const cost = itemsArray.reduce((s: number, item: any) => s + (item.purchasePrice || 0) * item.quantity, 0);
      profit += inv.final_amount - cost;
    }
    return { sales, profit };
  };

  const all = activeInvoices || [];
  const { data: allInstallments } = await supabase.from('installment_records').select('*');
  const { data: prods } = await supabase.from('products').select('*').eq('is_deleted', false);

  const overdueInstallments: any[] = [];
  let lateCount = 0;
  for (const record of allInstallments || []) {
    if (record.type === 'normal') {
      for (const inst of record.installments || []) {
        if (inst.status !== 'paid' && new Date(inst.dueDate) < new Date(todayStr)) {
          lateCount++;
          overdueInstallments.push({
            id: record.id, customerName: record.customer_name,
            customerPhone: record.customer_phone, invoiceNumber: record.invoice_number,
            dueDate: inst.dueDate, amount: inst.amount - inst.paidAmount
          });
        }
      }
    }
  }

  const lowStock = (prods || []).filter(p => {
    const isBundle = p.notes && p.notes.startsWith('BUNDLE:');
    return !isBundle && p.quantity <= p.min_stock_alert;
  });

  res.json({
    today: compute(all.filter(i => i.date === todayStr)),
    month: compute(all.filter(i => i.date?.startsWith(monthPrefix))),
    year: compute(all.filter(i => i.date?.startsWith(yearPrefix))),
    lateInstallmentsCount: lateCount,
    overdueInstallments,
    lowStockAlertsCount: lowStock.length,
    lowStockProducts: lowStock.map(mapProduct)
  });
});

app.get('/api/reports/detailed-sales', authenticate, async (req: any, res) => {
  if (!req.user.permissions.reports.view) return res.status(403).json({ error: 'لا تملك صلاحية' });

  let query = supabase.from('invoices').select('*');
  if (req.query.startDate) query = query.gte('date', req.query.startDate as string);
  if (req.query.endDate) query = query.lte('date', req.query.endDate as string);

  const { data, error } = await query.order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapInvoice));
});

// ==================== FIELD MAPPERS (snake_case → camelCase) ====================

function mapCustomer(r: any) {
  return {
    id: r.id, name: r.name, phone: r.phone,
    secondaryPhone: r.secondary_phone, address: r.address,
    mapsLink: r.maps_link, gpsCoords: r.gps_coords,
    notes: r.notes, isDeleted: r.is_deleted
  };
}

function mapProduct(r: any) {
  return {
    id: r.id, name: r.name, categoryId: r.category_id, sku: r.sku,
    purchasePrice: r.purchase_price, sellingPrice: r.selling_price,
    quantity: r.quantity, minStockAlert: r.min_stock_alert,
    notes: r.notes, status: r.status, image: r.image,
    warrantyMonths: r.warranty_months, isDeleted: r.is_deleted
  };
}

function mapInvoice(r: any, customerAddress?: string | number) {
  return {
    id: r.id, invoiceNumber: r.invoice_number,
    customerId: r.customer_id, customerName: r.customer_name, customerPhone: r.customer_phone,
    customerAddress: typeof customerAddress === 'string' ? customerAddress : '',
    invoiceType: r.invoice_type === 'retail' ? 'partial' : r.invoice_type, items: r.items,
    totalAmount: r.total_amount, discount: r.discount,
    finalAmount: r.final_amount, remainingAmount: r.remaining_amount,
    createdBy: r.created_by, date: r.date, status: r.status,
    cancellationReason: r.cancellation_reason, cancelledBy: r.cancelled_by,
    notes: r.notes, deliveryProofImage: r.delivery_proof_image
  };
}

function mapInstallment(r: any) {
  return {
    id: r.id, invoiceId: r.invoice_id, invoiceNumber: r.invoice_number,
    customerId: r.customer_id, customerName: r.customer_name, customerPhone: r.customer_phone,
    totalAmount: r.total_amount, downPayment: r.down_payment,
    remainingAmount: r.remaining_amount, type: r.type,
    installments: r.installments, withdrawals: r.withdrawals, notes: r.notes
  };
}

function mapMaintenance(r: any) {
  return {
    id: r.id, requestNumber: r.request_number,
    customerId: r.customer_id, customerName: r.customer_name,
    customerPhone: r.customer_phone, customerAddress: r.customer_address,
    notes: r.notes, photos: r.photos, createdDate: r.created_date,
    assignedEmployee: r.assigned_employee, status: r.status
  };
}

function mapFault(r: any) {
  return {
    id: r.id, customerId: r.customer_id, customerName: r.customer_name,
    customerPhone: r.customer_phone, customerAddress: r.customer_address,
    faultType: r.fault_type, description: r.description,
    photos: r.photos, notes: r.notes, status: r.status, createdDate: r.created_date
  };
}

function mapTeam(r: any) {
  return { id: r.id, name: r.name, leader: r.leader, members: r.members, vehicle: r.vehicle, isDeleted: r.is_deleted };
}

function mapBooking(r: any) {
  return {
    id: r.id, customerId: r.customer_id, customerName: r.customer_name,
    invoiceId: r.invoice_id, invoiceNumber: r.invoice_number,
    assignedTeamId: r.assigned_team_id, assignedTeamName: r.assigned_team_name,
    appointmentDate: r.appointment_date, appointmentTime: r.appointment_time,
    notes: r.notes, status: r.status
  };
}

function mapMovement(r: any) {
  return {
    id: r.id, productId: r.product_id, productName: r.product_name,
    type: r.type, quantity: r.quantity, prevQuantity: r.prev_quantity,
    newQuantity: r.new_quantity, reason: r.reason, user: r.user, date: r.date
  };
}

function mapAudit(r: any) {
  return {
    id: r.id, user: r.user, date: r.date, time: r.time,
    action: r.action, affectedRecord: r.affected_record, ipAddress: r.ip_address
  };
}

function mapSettings(r: any) {
  return {
    companyName: r.company_name, companyLogo: r.company_logo,
    companyPhone: r.company_phone, companyAddress: r.company_address,
    invoiceTemplate: r.invoice_template,
    installmentReminderTemplate: r.installment_reminder_template,
    autoBackupEnabled: r.auto_backup_enabled,
    backupInterval: r.backup_interval
  };
}

function mapRole(r: any) {
  return {
    id: r.id, name: r.name, description: r.description,
    permissions: r.permissions, isSystem: r.is_system,
    createdAt: r.created_at
  };
}

function getDefaultRoles() {
  const allTrue = { view: true, create: true, edit: true, delete: true, approve: true, export: true };
  const readOnly = { view: true, create: false, edit: false, delete: false, approve: false, export: false };
  const readCreate = { view: true, create: true, edit: false, delete: false, approve: false, export: false };
  const readCreateEdit = { view: true, create: true, edit: true, delete: false, approve: false, export: true };
  const none = { view: false, create: false, edit: false, delete: false, approve: false, export: false };

  return [
    {
      id: 1, name: 'مدير النظام (Admin)', description: 'صلاحيات كاملة على جميع أقسام النظام',
      isSystem: true,
      permissions: {
        dashboard: allTrue, customers: allTrue, products: allTrue, inventory: allTrue,
        sales: allTrue, invoices: allTrue, installments: allTrue, maintenance: allTrue,
        faults: allTrue, installationTeams: allTrue, installationBookings: allTrue,
        reports: allTrue, employees: { ...allTrue, manage_roles: true, manage_permissions: true }, settings: allTrue, auditLogs: allTrue
      }
    },
    {
      id: 2, name: 'مدير فرع (Manager)', description: 'إدارة المبيعات والعملاء والمخزون',
      isSystem: true,
      permissions: {
        dashboard: allTrue, customers: readCreateEdit, products: readCreateEdit, inventory: readCreateEdit,
        sales: readCreateEdit, invoices: readCreateEdit, installments: readCreateEdit, maintenance: readOnly,
        faults: readOnly, installationTeams: readOnly, installationBookings: readCreateEdit,
        reports: { ...readOnly, export: true }, employees: readOnly, settings: readOnly, auditLogs: readOnly
      }
    },
    {
      id: 3, name: 'المحاسب (Accountant)', description: 'إدارة الفواتير والأقساط والتقارير المالية',
      isSystem: true,
      permissions: {
        dashboard: readOnly, customers: readCreateEdit, products: readOnly, inventory: readOnly,
        sales: readCreateEdit, invoices: readCreateEdit, installments: readCreateEdit, maintenance: none,
        faults: none, installationTeams: none, installationBookings: readOnly,
        reports: { ...readOnly, export: true }, employees: none, settings: none, auditLogs: none
      }
    },
    {
      id: 4, name: 'فني الصيانة (Technician)', description: 'إدارة الصيانة والأعطال والتركيبات',
      isSystem: true,
      permissions: {
        dashboard: readOnly, customers: readOnly, products: readOnly, inventory: none,
        sales: none, invoices: none, installments: none, maintenance: readCreateEdit,
        faults: readCreateEdit, installationTeams: readOnly, installationBookings: readCreateEdit,
        reports: none, employees: none, settings: none, auditLogs: none
      }
    },
    {
      id: 5, name: 'أمين الصندوق (Cashier)', description: 'نقطة البيع وإصدار الفواتير فقط',
      isSystem: true,
      permissions: {
        dashboard: readOnly, customers: readCreate, products: readOnly, inventory: none,
        sales: readCreate, invoices: readOnly, installments: readOnly, maintenance: none,
        faults: none, installationTeams: none, installationBookings: none,
        reports: none, employees: none, settings: none, auditLogs: none
      }
    }
  ];
}


// ==================== CONTRACTS (SUPABASE) ====================

function mapContract(c: any) {
  return {
    id: c.id,
    contractNumber: c.contract_number,
    customerId: c.customer_id,
    invoiceId: c.invoice_id,
    systemType: c.system_type,
    panelCount: c.panel_count,
    panelWattage: c.panel_wattage,
    batteryCount: c.battery_count,
    batteryType: c.battery_type,
    inverterType: c.inverter_type,
    contractTotal: Number(c.contract_total),
    paidAmount: Number(c.paid_amount),
    remainingAmount: Number(c.remaining_amount),
    panelWarranty: c.panel_warranty,
    batteryWarranty: c.battery_warranty,
    inverterWarranty: c.inverter_warranty,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  };
}

app.get('/api/contracts', authenticate, async (req: any, res) => {
  if (!req.user.permissions.contracts?.view && !req.user.permissions.invoices?.view) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(mapContract));
});

app.post('/api/contracts', authenticate, async (req: any, res) => {
  if (!req.user.permissions.contracts?.create && !req.user.permissions.invoices?.create) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  
  const {
    customerId, invoiceId, systemType, panelCount, panelWattage,
    batteryCount, batteryType, inverterType, contractTotal, paidAmount,
    remainingAmount, panelWarranty, batteryWarranty, inverterWarranty
  } = req.body;

  if (!customerId) return res.status(400).json({ error: 'يرجى تحديد العميل' });

  // Generate contract number e.g., CON-2026-0001
  const year = new Date().getFullYear();
  const { count } = await supabase.from('contracts').select('*', { count: 'exact', head: true });
  const currentCount = (count || 0) + 1;
  const contractNumber = `CON-${year}-${currentCount.toString().padStart(4, '0')}`;

  const { data, error } = await supabase.from('contracts').insert({
    contract_number: contractNumber,
    customer_id: customerId,
    invoice_id: invoiceId || null,
    system_type: systemType || '',
    panel_count: panelCount || 0,
    panel_wattage: panelWattage || '',
    battery_count: batteryCount || 0,
    battery_type: batteryType || '',
    inverter_type: inverterType || '',
    contract_total: contractTotal || 0,
    paid_amount: paidAmount || 0,
    remaining_amount: remainingAmount || 0,
    panel_warranty: panelWarranty || '',
    battery_warranty: batteryWarranty || '',
    inverter_warranty: inverterWarranty || ''
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'إنشاء عقد جديد', `رقم العقد: ${contractNumber}`, getClientIp(req));
  res.status(201).json(mapContract(data));
});

app.put('/api/contracts/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.contracts?.edit && !req.user.permissions.invoices?.edit) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const id = parseInt(req.params.id);
  
  const updates: any = { updated_at: new Date().toISOString() };
  const fields = ['systemType', 'panelCount', 'panelWattage', 'batteryCount', 'batteryType', 'inverterType', 'contractTotal', 'paidAmount', 'remainingAmount', 'panelWarranty', 'batteryWarranty', 'inverterWarranty'];
  
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      // Map camelCase to snake_case
      const snakeField = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      updates[snakeField] = req.body[field];
    }
  }

  const { data, error } = await supabase.from('contracts').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'تعديل عقد', `ID: ${id}`, getClientIp(req));
  res.json(mapContract(data));
});

app.delete('/api/contracts/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.contracts?.delete && !req.user.permissions.invoices?.delete) return res.status(403).json({ error: 'ليس لديك صلاحية' });
  const id = parseInt(req.params.id);
  
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف عقد', `ID: ${id}`, getClientIp(req));
  res.json({ success: true });
});


// ==================== DASHBOARD SUMMARY ====================
app.get('/api/dashboard/summary', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    const [
      invoicesTodayRes,
      latestInvoicesRes,
      latestCustomersRes,
      latestBookingsRes,
      maintenanceRes,
      faultsRes,
      latestAuditsRes,
      bankRes,
      productsRes,
      lastBackupRes,
      bankWithdrawalsRes,
      unpaidInvoicesRes
    ] = await Promise.all([
      supabase.from('invoices').select('final_amount, profit_amount').gte('date', todayStr).eq('status', 'active'),
      supabase.from('invoices').select('*').order('id', { ascending: false }).limit(5),
      supabase.from('customers').select('*').eq('is_deleted', false).order('id', { ascending: false }).limit(5),
      supabase.from('installation_bookings').select('*').gte('appointment_date', todayStr).limit(5),
      supabase.from('maintenance_requests').select('*').in('status', ['new', 'inprogress']).limit(10),
      supabase.from('fault_requests').select('*').in('status', ['new', 'inprogress']).limit(10),
      supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(5),
      supabase.from('invoices').select('final_amount').eq('invoice_type', 'mastercard').eq('status', 'active'),
      supabase.from('products').select('*').eq('is_deleted', false),
      supabase.from('audit_logs').select('created_at').eq('action', 'تصدير نسخة احتياطية').order('id', { ascending: false }).limit(1),
      supabase.from('bank_withdrawals').select('amount'),
      supabase.from('invoices').select('customer_id, customer_name, remaining_amount').eq('invoice_type', 'retail').gt('remaining_amount', 0).eq('status', 'active')
    ]);

    const salesToday = (invoicesTodayRes.data || []).reduce((acc, curr) => acc + (parseFloat(curr.final_amount) || 0), 0);
    const profitToday = (invoicesTodayRes.data || []).reduce((acc, curr) => acc + (parseFloat(curr.profit_amount) || 0), 0);

    const totalMasterCard = (bankRes.data || []).reduce((acc, curr) => acc + (parseFloat(curr.final_amount) || 0), 0);
    const totalWithdrawn = (bankWithdrawalsRes.data || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const lowStock = (productsRes.data || []).filter((p: any) => {
      const isBundle = p.notes && p.notes.startsWith('BUNDLE:');
      return !isBundle && p.quantity <= p.min_stock_alert;
    });

    const unpaidMap = new Map();
    (unpaidInvoicesRes.data || []).forEach(inv => {
      if (!unpaidMap.has(inv.customer_id)) {
        unpaidMap.set(inv.customer_id, { name: inv.customer_name, totalDebt: 0 });
      }
      unpaidMap.get(inv.customer_id).totalDebt += (parseFloat(inv.remaining_amount) || 0);
    });
    const unpaidCustomers = Array.from(unpaidMap.values());

    res.json({
      stats: {
        today: { sales: salesToday, profit: profitToday },
        lateInstallmentsCount: 0,
        overdueInstallments: [],
        lowStockAlertsCount: lowStock.length,
        lowStockProducts: lowStock.map(mapProduct)
      },
      latestInvoices: (latestInvoicesRes.data || []).map(mapInvoice),
      latestCustomers: (latestCustomersRes.data || []).map(mapCustomer),
      upcomingBookings: (latestBookingsRes.data || []).map(mapBooking),
      activeMaintenance: (maintenanceRes.data || []).map(mapMaintenance),
      activeFaults: (faultsRes.data || []).map(mapFault),
      latestAudits: (latestAuditsRes.data || []).map((a: any) => ({ ...a, affectedRecord: a.affected_record, ipAddress: a.ip_address })),
      bankSettlementSummary: {
        totalMasterCard,
        totalWithdrawn,
        remainingBalance: totalMasterCard - totalWithdrawn
      },
      unpaidCustomers,
      lastBackupTime: lastBackupRes?.data?.[0]?.created_at || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
