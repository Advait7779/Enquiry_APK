import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { CreateLawyerDTO, FeeSummary, FeeTransaction, IClient, IEnquiry, ILawyer, LawyerFeeBreakdown, UpdateLawyerDTO } from '../types';
import { formatOfficeDate, formatOfficeDay, formatOfficeTime, getOfficeDateRange, getOfficePeriodRange } from '../utils/time';
import { hashPassword } from '../auth';

let prisma: PrismaClient | null = null;
let usePrisma = false;

const DEFAULT_DATA_FILE = path.join(__dirname, '../../data/store.json');

function dataFilePath(): string {
  return process.env.LOCAL_DATA_FILE ? path.resolve(process.env.LOCAL_DATA_FILE) : DEFAULT_DATA_FILE;
}

export interface EnquiryFilter {
  date?: string;
  search?: string;
  start?: string;
  end?: string;
  lawyerId?: string;
}

interface StoreAuditLog {
  id: string;
  enquiryId: string | null;
  action: string;
  changes: Record<string, unknown> | null;
  createdAt: Date;
}

interface StoreNotificationJob {
  id: string;
  enquiryId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  nextAttemptAt: Date;
  lockedAt: Date | null;
  lastError: string | null;
  result: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationJobStatus = StoreNotificationJob['status'];

export interface NotificationJobSummary {
  id: string;
  enquiryId: string;
  clientName: string;
  phoneEnding: string;
  status: NotificationJobStatus;
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  result: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StoreIntegrationSettings {
  encryptedPayload: string;
  updatedAt: Date;
}

interface StoreData {
  clients: IClient[];
  enquiries: IEnquiry[];
  auditLogs: StoreAuditLog[];
  lawyers: any[];
  notificationJobs: StoreNotificationJob[];
  integrationSettings: StoreIntegrationSettings | null;
}

function loadStore(): StoreData {
  const dataFile = dataFilePath();
  const dataDir = path.dirname(dataFile);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    const initial: StoreData = {
      clients: [],
      enquiries: [],
      auditLogs: [],
      lawyers: [],
      notificationJobs: [],
      integrationSettings: null,
    };
    fs.writeFileSync(dataFile, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    return {
      clients: (parsed.clients || []).map((client: any) => ({
        ...client,
        createdAt: new Date(client.createdAt),
        updatedAt: new Date(client.updatedAt),
      })),
      enquiries: (parsed.enquiries || []).map((enquiry: any) => ({
        ...enquiry,
        feesPaid: Number(enquiry.feesPaid ?? 0),
        entryTime: new Date(enquiry.entryTime),
        consultationStartTime: enquiry.consultationStartTime ? new Date(enquiry.consultationStartTime) : null,
        consultationEndTime: enquiry.consultationEndTime ? new Date(enquiry.consultationEndTime) : null,
        deletedAt: enquiry.deletedAt ? new Date(enquiry.deletedAt) : null,
        createdAt: new Date(enquiry.createdAt),
        updatedAt: new Date(enquiry.updatedAt),
      })),
      auditLogs: (parsed.auditLogs || []).map((log: any) => ({
        ...log,
        createdAt: new Date(log.createdAt),
      })),
      lawyers: (Array.isArray(parsed.lawyers) ? parsed.lawyers : []).map((lawyer: any) => ({
        ...lawyer,
        assignedTasks: Array.isArray(lawyer.assignedTasks) ? lawyer.assignedTasks : [],
        isActive: lawyer.isActive !== false,
        authVersion: Number.isInteger(lawyer.authVersion) ? lawyer.authVersion : 1,
        createdAt: new Date(lawyer.createdAt || Date.now()),
        updatedAt: new Date(lawyer.updatedAt || Date.now()),
      })),
      notificationJobs: (Array.isArray(parsed.notificationJobs) ? parsed.notificationJobs : []).map((job: any) => ({
        ...job,
        attempts: Number.isInteger(job.attempts) ? job.attempts : 0,
        nextAttemptAt: new Date(job.nextAttemptAt || Date.now()),
        lockedAt: job.lockedAt ? new Date(job.lockedAt) : null,
        createdAt: new Date(job.createdAt || Date.now()),
        updatedAt: new Date(job.updatedAt || Date.now()),
      })),
      integrationSettings: parsed.integrationSettings?.encryptedPayload
        ? {
            encryptedPayload: String(parsed.integrationSettings.encryptedPayload),
            updatedAt: new Date(parsed.integrationSettings.updatedAt || Date.now()),
          }
        : null,
    };
  } catch (error) {
    console.error('Local data store could not be read:', error);
    throw new Error('Local data store is corrupted or unreadable. Restore it from backup before continuing.');
  }
}

function saveStore(data: StoreData): void {
  const dataFile = dataFilePath();
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(temporaryFile, dataFile);
}

function addStoreAudit(
  store: StoreData,
  enquiryId: string | null,
  action: string,
  changes: Record<string, unknown> | null,
): void {
  store.auditLogs.unshift({
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    enquiryId,
    action,
    changes,
    createdAt: new Date(),
  });
  if (store.auditLogs.length > 10000) store.auditLogs.length = 10000;
}

function buildPrismaWhere(filter?: EnquiryFilter): any {
  const where: any = { deletedAt: null };
  const conditions: any[] = [];
  if (filter?.search) {
    conditions.push({ OR: [
      { fullName: { contains: filter.search, mode: 'insensitive' } },
      { contactNo: { contains: filter.search, mode: 'insensitive' } },
      { purpose: { contains: filter.search, mode: 'insensitive' } },
      { caseNumber: { contains: filter.search, mode: 'insensitive' } },
      { assignedAdvocate: { contains: filter.search, mode: 'insensitive' } },
    ] });
  }
  if (filter?.lawyerId) {
    conditions.push({ lawyerId: filter.lawyerId });
  }
  if (filter?.date) {
    const { start, end } = getOfficeDateRange(filter.date);
    where.entryTime = { gte: start, lt: end };
  }
  if (filter?.start && filter?.end) {
    where.entryTime = { gte: new Date(filter.start), lt: new Date(filter.end) };
  }
  if (conditions.length > 0) where.AND = conditions;
  return where;
}

function filterStoreEnquiries(enquiries: IEnquiry[], filter?: EnquiryFilter): IEnquiry[] {
  let list = enquiries.filter((enquiry) => !enquiry.deletedAt);
  if (filter?.lawyerId) {
    list = list.filter((enquiry) => enquiry.lawyerId === filter.lawyerId);
  }
  if (filter?.search) {
    const query = filter.search.toLowerCase().trim();
    list = list.filter((enquiry) =>
      enquiry.fullName.toLowerCase().includes(query) ||
      enquiry.contactNo.toLowerCase().includes(query) ||
      enquiry.purpose.toLowerCase().includes(query) ||
      Boolean(enquiry.caseNumber?.toLowerCase().includes(query)) ||
      Boolean(enquiry.assignedAdvocate?.toLowerCase().includes(query)),
    );
  }
  if (filter?.date) {
    const { start, end } = getOfficeDateRange(filter.date);
    list = list.filter((enquiry) => new Date(enquiry.entryTime) >= start && new Date(enquiry.entryTime) < end);
  }
  if (filter?.start && filter?.end) {
    const start = new Date(filter.start);
    const end = new Date(filter.end);
    list = list.filter((enquiry) => new Date(enquiry.entryTime) >= start && new Date(enquiry.entryTime) < end);
  }
  return list.sort((a, b) =>
    new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime() || b.id.localeCompare(a.id));
}

export async function initDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production. Refusing unsafe local-file fallback.');
    }
    console.warn('DATABASE_URL is not set. Using the local development JSON store.');
    usePrisma = false;
    return false;
  }

  prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected successfully via Prisma');
    usePrisma = true;

    return true;
  } catch (error: any) {
    usePrisma = false;
    await prisma.$disconnect().catch(() => undefined);
    prisma = null;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`PostgreSQL connection failed: ${error.message || 'database not reachable'}`);
    }
    console.warn('PostgreSQL connection failed. Using the local development JSON store.');
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) await prisma.$disconnect();
}

export const dbService = {
  async getEnquiriesPage(filter: EnquiryFilter | undefined, page: number, pageSize: number) {
    if (usePrisma && prisma) {
      const where = buildPrismaWhere(filter);
      const [items, total] = await prisma.$transaction([
        prisma.enquiry.findMany({
          where,
          orderBy: [{ entryTime: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.enquiry.count({ where }),
      ]);
      return { items: items as unknown as IEnquiry[], total };
    }

    const list = filterStoreEnquiries(loadStore().enquiries, filter);
    return {
      items: list.slice((page - 1) * pageSize, page * pageSize),
      total: list.length,
    };
  },

  async *iterateEnquiries(filter?: EnquiryFilter, batchSize = 500): AsyncGenerator<IEnquiry[]> {
    if (usePrisma && prisma) {
      let cursor: string | undefined;
      while (true) {
        const batch = await prisma.enquiry.findMany({
          where: buildPrismaWhere(filter),
          orderBy: { id: 'asc' },
          take: batchSize,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (batch.length === 0) break;
        yield batch as unknown as IEnquiry[];
        cursor = batch[batch.length - 1].id;
      }
      return;
    }

    const list = filterStoreEnquiries(loadStore().enquiries, filter);
    for (let index = 0; index < list.length; index += batchSize) {
      yield list.slice(index, index + batchSize);
    }
  },

  async getEnquiryById(id: string, lawyerId?: string): Promise<IEnquiry | null> {
    if (usePrisma && prisma) {
      const found = await prisma.enquiry.findFirst({ where: { id, deletedAt: null, ...(lawyerId ? { lawyerId } : {}) } });
      return found as unknown as IEnquiry | null;
    }
    return loadStore().enquiries.find((enquiry) => enquiry.id === id && !enquiry.deletedAt && (!lawyerId || enquiry.lawyerId === lawyerId)) || null;
  },

  async createEnquiry(data: {
    fullName: string;
    contactNo: string;
    purpose: string;
    caseNumber?: string;
    assignedAdvocate?: string;
    lawyerId?: string;
    feesPaid?: number;
    urgency?: 'Normal' | 'High' | 'Urgent';
  }): Promise<IEnquiry> {
    const entryTime = new Date();
    let assignedAdvocate = data.assignedAdvocate?.trim() || null;
    let lawyerId = data.lawyerId?.trim() || null;

    if (usePrisma && prisma) {
      if (lawyerId && !assignedAdvocate) {
        const lawyer = await prisma.lawyer.findUnique({ where: { id: lawyerId } });
        if (lawyer) assignedAdvocate = lawyer.name;
      } else if (!lawyerId && assignedAdvocate) {
        const lawyer = await prisma.lawyer.findFirst({ where: { name: assignedAdvocate } });
        if (lawyer) lawyerId = lawyer.id;
      }

      const created = await prisma.$transaction(async (transaction) => {
        const enquiry = await transaction.enquiry.create({
          data: {
            fullName: data.fullName,
            contactNo: data.contactNo,
            purpose: data.purpose,
            caseNumber: data.caseNumber || null,
            assignedAdvocate: assignedAdvocate || 'General Advocate Desk',
            lawyerId: lawyerId || null,
            feesPaid: data.feesPaid ?? 0,
            urgency: data.urgency || 'Normal',
            status: 'Waiting',
            entryTime,
          },
        });
        await transaction.auditLog.create({
          data: {
            enquiryId: enquiry.id,
            action: 'CREATED',
            changes: { feesPaid: data.feesPaid ?? 0, assignedAdvocate, lawyerId },
          },
        });
        await transaction.notificationJob.create({
          data: { enquiryId: enquiry.id },
        });
        return enquiry;
      });
      return created as unknown as IEnquiry;
    }

    const store = loadStore();
    if (lawyerId && !assignedAdvocate) {
      const lawyer = store.lawyers.find((l) => l.id === lawyerId);
      if (lawyer) assignedAdvocate = lawyer.name;
    } else if (!lawyerId && assignedAdvocate) {
      const lawyer = store.lawyers.find((l) => l.name.toLowerCase() === assignedAdvocate!.toLowerCase());
      if (lawyer) lawyerId = lawyer.id;
    }

    const now = new Date();
    const enquiry: IEnquiry = {
      id: `enq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      clientId: null,
      fullName: data.fullName,
      contactNo: data.contactNo,
      purpose: data.purpose,
      caseNumber: data.caseNumber || null,
      assignedAdvocate: assignedAdvocate || 'General Advocate Desk',
      lawyerId: lawyerId || null,
      feesPaid: data.feesPaid ?? 0,
      urgency: data.urgency || 'Normal',
      status: 'Waiting',
      entryTime,
      consultationStartTime: null,
      consultationEndTime: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    store.enquiries.unshift(enquiry);
    store.notificationJobs.push({
      id: `notify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      enquiryId: enquiry.id,
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: now,
      lockedAt: null,
      lastError: null,
      result: null,
      createdAt: now,
      updatedAt: now,
    });
    addStoreAudit(store, enquiry.id, 'CREATED', { feesPaid: data.feesPaid ?? 0, assignedAdvocate, lawyerId });
    saveStore(store);
    return enquiry;
  },

  async getIntegrationSettingsPayload(): Promise<{ encryptedPayload: string; updatedAt: Date } | null> {
    if (usePrisma && prisma) {
      return prisma.integrationSettings.findUnique({
        where: { id: 'default' },
        select: { encryptedPayload: true, updatedAt: true },
      });
    }
    return loadStore().integrationSettings;
  },

  async saveIntegrationSettingsPayload(encryptedPayload: string): Promise<{ updatedAt: Date }> {
    if (usePrisma && prisma) {
      const saved = await prisma.integrationSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default', encryptedPayload },
        update: { encryptedPayload },
        select: { updatedAt: true },
      });
      return saved;
    }
    const store = loadStore();
    const updatedAt = new Date();
    store.integrationSettings = { encryptedPayload, updatedAt };
    saveStore(store);
    return { updatedAt };
  },

  async claimNextNotificationJob(): Promise<{
    id: string;
    attempts: number;
    previousResult: Record<string, unknown> | null;
    enquiry: { fullName: string; contactNo: string; purpose: string; feesPaid: number };
  } | null> {
    const now = new Date();
    const staleLock = new Date(now.getTime() - 5 * 60 * 1000);

    if (usePrisma && prisma) {
      await prisma.notificationJob.updateMany({
        where: { status: 'PROCESSING', lockedAt: { lt: staleLock } },
        data: { status: 'PENDING', lockedAt: null },
      });
      const candidate = await prisma.notificationJob.findFirst({
        where: { status: 'PENDING', nextAttemptAt: { lte: now } },
        orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      if (!candidate) return null;
      const claimed = await prisma.notificationJob.updateMany({
        where: { id: candidate.id, status: 'PENDING' },
        data: { status: 'PROCESSING', lockedAt: now, attempts: { increment: 1 } },
      });
      if (claimed.count !== 1) return null;
      const job = await prisma.notificationJob.findUnique({
        where: { id: candidate.id },
        include: { enquiry: true },
      });
      if (!job) return null;
      return {
        id: job.id,
        attempts: job.attempts,
        previousResult: job.result && typeof job.result === 'object' && !Array.isArray(job.result)
          ? job.result as Record<string, unknown>
          : null,
        enquiry: {
          fullName: job.enquiry.fullName,
          contactNo: job.enquiry.contactNo,
          purpose: job.enquiry.purpose,
          feesPaid: Number(job.enquiry.feesPaid || 0),
        },
      };
    }

    const store = loadStore();
    for (const job of store.notificationJobs) {
      if (job.status === 'PROCESSING' && job.lockedAt && job.lockedAt < staleLock) {
        job.status = 'PENDING';
        job.lockedAt = null;
      }
    }
    const candidate = store.notificationJobs
      .filter((job) => job.status === 'PENDING' && job.nextAttemptAt <= now)
      .sort((left, right) => left.nextAttemptAt.getTime() - right.nextAttemptAt.getTime())[0];
    if (!candidate) {
      saveStore(store);
      return null;
    }
    candidate.status = 'PROCESSING';
    candidate.lockedAt = now;
    candidate.attempts += 1;
    candidate.updatedAt = now;
    const enquiry = store.enquiries.find((item) => item.id === candidate.enquiryId);
    if (!enquiry) {
      candidate.status = 'FAILED';
      candidate.lastError = 'The related enquiry no longer exists.';
      saveStore(store);
      return null;
    }
    saveStore(store);
    return {
      id: candidate.id,
      attempts: candidate.attempts,
      previousResult: candidate.result,
      enquiry: {
        fullName: enquiry.fullName,
        contactNo: enquiry.contactNo,
        purpose: enquiry.purpose,
        feesPaid: Number(enquiry.feesPaid || 0),
      },
    };
  },

  async completeNotificationJob(id: string, result: object): Promise<void> {
    if (usePrisma && prisma) {
      await prisma.notificationJob.update({
        where: { id },
        data: { status: 'COMPLETED', lockedAt: null, lastError: null, result: result as any },
      });
      return;
    }
    const store = loadStore();
    const job = store.notificationJobs.find((item) => item.id === id);
    if (!job) return;
    job.status = 'COMPLETED';
    job.lockedAt = null;
    job.lastError = null;
    job.result = result as Record<string, unknown>;
    job.updatedAt = new Date();
    saveStore(store);
  },

  async retryNotificationJob(id: string, attempts: number, error: string, result?: object): Promise<void> {
    const exhausted = attempts >= 3;
    const nextAttemptAt = new Date(Date.now() + Math.min(5 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1)));
    const safeError = error.slice(0, 500);
    if (usePrisma && prisma) {
      await prisma.notificationJob.update({
        where: { id },
        data: {
          status: exhausted ? 'FAILED' : 'PENDING',
          lockedAt: null,
          nextAttemptAt,
          lastError: safeError,
          ...(result ? { result: result as any } : {}),
        },
      });
      return;
    }
    const store = loadStore();
    const job = store.notificationJobs.find((item) => item.id === id);
    if (!job) return;
    job.status = exhausted ? 'FAILED' : 'PENDING';
    job.lockedAt = null;
    job.nextAttemptAt = nextAttemptAt;
    job.lastError = safeError;
    if (result) job.result = result as Record<string, unknown>;
    job.updatedAt = new Date();
    saveStore(store);
  },

  async getNotificationJobs(status: NotificationJobStatus | undefined, page: number, pageSize: number): Promise<{
    items: NotificationJobSummary[];
    total: number;
    failedCount: number;
  }> {
    const toSummary = (job: StoreNotificationJob, enquiry?: { fullName: string; contactNo: string } | null): NotificationJobSummary => ({
      id: job.id,
      enquiryId: job.enquiryId,
      clientName: enquiry?.fullName || 'Unknown client',
      phoneEnding: (enquiry?.contactNo || '').replace(/\D/g, '').slice(-4),
      status: job.status,
      attempts: job.attempts,
      nextAttemptAt: job.nextAttemptAt,
      lastError: job.lastError,
      result: job.result,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });

    if (usePrisma && prisma) {
      const where = status ? { status } : {};
      const [jobs, total, failedCount] = await prisma.$transaction([
        prisma.notificationJob.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { enquiry: { select: { fullName: true, contactNo: true } } },
        }),
        prisma.notificationJob.count({ where }),
        prisma.notificationJob.count({ where: { status: 'FAILED' } }),
      ]);
      return {
        items: jobs.map((job) => toSummary({ ...job, result: job.result as Record<string, unknown> | null } as StoreNotificationJob, job.enquiry)),
        total,
        failedCount,
      };
    }

    const store = loadStore();
    const jobs = store.notificationJobs
      .filter((job) => !status || job.status === status)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return {
      items: jobs.slice((page - 1) * pageSize, page * pageSize).map((job) =>
        toSummary(job, store.enquiries.find((enquiry) => enquiry.id === job.enquiryId))),
      total: jobs.length,
      failedCount: store.notificationJobs.filter((job) => job.status === 'FAILED').length,
    };
  },

  async requeueNotificationJobNow(id: string, configuredChannels: Record<'sms' | 'rcs' | 'whatsapp' | 'voiceCall', boolean>): Promise<boolean> {
    const now = new Date();
    const canRequeue = (status: NotificationJobStatus, result: Record<string, unknown> | null): boolean =>
      (Object.keys(configuredChannels) as (keyof typeof configuredChannels)[]).some((channel) =>
        configuredChannels[channel] && (
          (status === 'FAILED' && result?.[channel] !== 'sent') ||
          (status === 'COMPLETED' && result?.[channel] === 'disabled')
        ));
    if (usePrisma && prisma) {
      const job = await prisma.notificationJob.findUnique({ where: { id }, select: { status: true, result: true } });
      const result = job?.result && typeof job.result === 'object' && !Array.isArray(job.result)
        ? job.result as Record<string, unknown> : null;
      if (!job || !canRequeue(job.status as NotificationJobStatus, result)) return false;
      const updated = await prisma.notificationJob.updateMany({
        where: { id, status: job.status },
        data: { status: 'PENDING', attempts: 0, nextAttemptAt: now, lockedAt: null, lastError: null },
      });
      return updated.count === 1;
    }
    const store = loadStore();
    const job = store.notificationJobs.find((item) => item.id === id);
    if (!job || !canRequeue(job.status, job.result)) return false;
    job.status = 'PENDING';
    job.attempts = 0;
    job.nextAttemptAt = now;
    job.lockedAt = null;
    job.lastError = null;
    job.updatedAt = now;
    saveStore(store);
    return true;
  },

  async findLawyerByUsername(username: string): Promise<any | null> {
    const normalized = username.trim().toLowerCase();
    if (usePrisma && prisma) {
      return await prisma.lawyer.findFirst({
        where: {
          OR: [
            { username: { equals: normalized, mode: 'insensitive' } },
            { name: { equals: normalized, mode: 'insensitive' } },
          ],
        },
      });
    }
    const store = loadStore();
    return (
      store.lawyers.find(
        (l: any) =>
          (l.username && l.username.toLowerCase() === normalized) ||
          l.name.toLowerCase() === normalized
      ) || null
    );
  },

  async getLawyerAuthById(id: string): Promise<{ id: string; name: string; isActive: boolean; authVersion: number; assignedTasks: string[] } | null> {
    if (usePrisma && prisma) {
      return prisma.lawyer.findUnique({
        where: { id },
        select: { id: true, name: true, isActive: true, authVersion: true, assignedTasks: true },
      });
    }
    const lawyer = loadStore().lawyers.find((item: any) => item.id === id);
    if (!lawyer) return null;
    return {
      id: lawyer.id,
      name: lawyer.name,
      isActive: lawyer.isActive !== false,
      authVersion: Number.isInteger(lawyer.authVersion) ? lawyer.authVersion : 1,
      assignedTasks: lawyer.assignedTasks || [],
    };
  },

  async getLawyers(onlyActive = false): Promise<ILawyer[]> {
    if (usePrisma && prisma) {
      const where = onlyActive ? { isActive: true } : {};
      const lawyers = await prisma.lawyer.findMany({
        where,
        orderBy: { name: 'asc' },
      });
      return lawyers.map((l) => ({
        id: l.id,
        name: l.name,
        username: l.username,
        role: l.role,
        phone: l.phone,
        email: l.email,
        assignedTasks: l.assignedTasks,
        isActive: l.isActive,
        hasPassword: Boolean(l.passwordHash),
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      }));
    }
    const store = loadStore();
    let list = store.lawyers;
    if (onlyActive) list = list.filter((l) => l.isActive);
    return list
      .map((l: any) => ({
        id: l.id,
        name: l.name,
        username: l.username || null,
        role: l.role || 'lawyer',
        phone: l.phone,
        email: l.email,
        assignedTasks: l.assignedTasks,
        isActive: l.isActive,
        hasPassword: Boolean(l.passwordHash),
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getLawyerById(id: string, onlyActive = false): Promise<ILawyer | null> {
    if (usePrisma && prisma) {
      const lawyer = await prisma.lawyer.findFirst({ where: { id, ...(onlyActive ? { isActive: true } : {}) } });
      if (!lawyer) return null;
      return {
        id: lawyer.id,
        name: lawyer.name,
        username: lawyer.username,
        role: lawyer.role,
        phone: lawyer.phone,
        email: lawyer.email,
        assignedTasks: lawyer.assignedTasks,
        isActive: lawyer.isActive,
        hasPassword: Boolean(lawyer.passwordHash),
        createdAt: lawyer.createdAt,
        updatedAt: lawyer.updatedAt,
      };
    }
    const lawyer = loadStore().lawyers.find((item: any) => item.id === id && (!onlyActive || item.isActive));
    if (!lawyer) return null;
    return {
      id: lawyer.id,
      name: lawyer.name,
      username: lawyer.username || null,
      role: lawyer.role || 'lawyer',
      phone: lawyer.phone,
      email: lawyer.email,
      assignedTasks: lawyer.assignedTasks,
      isActive: lawyer.isActive,
      hasPassword: Boolean(lawyer.passwordHash),
      createdAt: lawyer.createdAt,
      updatedAt: lawyer.updatedAt,
    };
  },

  async createLawyer(data: CreateLawyerDTO): Promise<ILawyer> {
    const name = data.name.trim();
    const username = data.username ? data.username.trim().toLowerCase() : null;
    const passwordHash = hashPassword(data.password!);
    const role = 'lawyer';

    if (usePrisma && prisma) {
      const created = await prisma.lawyer.create({
        data: {
          name,
          username,
          passwordHash,
          role,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          assignedTasks: data.assignedTasks || [],
          isActive: data.isActive !== false,
          authVersion: 1,
        },
      });
      return {
        id: created.id,
        name: created.name,
        username: created.username,
        role: created.role,
        phone: created.phone,
        email: created.email,
        assignedTasks: created.assignedTasks,
        isActive: created.isActive,
        hasPassword: Boolean(created.passwordHash),
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    }
    const store = loadStore();
    const now = new Date();
    const lawyer: any = {
      id: `lawyer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      username,
      passwordHash,
      role,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      assignedTasks: data.assignedTasks || [],
      isActive: data.isActive !== false,
      authVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    store.lawyers.push(lawyer);
    saveStore(store);
    const { passwordHash: _passwordHash, authVersion: _authVersion, ...publicLawyer } = lawyer;
    return { ...publicLawyer, hasPassword: true };
  },

  async updateLawyer(id: string, data: UpdateLawyerDTO): Promise<ILawyer | null> {
    const updateData: any = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.username !== undefined) updateData.username = data.username ? data.username.trim().toLowerCase() : null;
    if (data.password) updateData.passwordHash = hashPassword(data.password);
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.assignedTasks !== undefined) updateData.assignedTasks = data.assignedTasks;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password || data.isActive !== undefined) updateData.authVersion = { increment: 1 };

    if (usePrisma && prisma) {
      const existing = await prisma.lawyer.findUnique({ where: { id } });
      if (!existing) return null;
      if (data.isActive === true) {
        const effectiveUsername = updateData.username ?? existing.username;
        const effectivePasswordHash = updateData.passwordHash ?? existing.passwordHash;
        if (!effectiveUsername || !effectivePasswordHash) {
          throw new Error('Set a username and secure password before activating this lawyer.');
        }
      }
      const updated = await prisma.lawyer.update({
        where: { id },
        data: updateData,
      });
      return {
        id: updated.id,
        name: updated.name,
        username: updated.username,
        role: updated.role,
        phone: updated.phone,
        email: updated.email,
        assignedTasks: updated.assignedTasks,
        isActive: updated.isActive,
        hasPassword: Boolean(updated.passwordHash),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }
    const store = loadStore();
    const index = store.lawyers.findIndex((l: any) => l.id === id);
    if (index === -1) return null;
    const existing = store.lawyers[index];
    if (data.isActive === true) {
      const effectiveUsername = updateData.username ?? existing.username;
      const effectivePasswordHash = updateData.passwordHash ?? existing.passwordHash;
      if (!effectiveUsername || !effectivePasswordHash) {
        throw new Error('Set a username and secure password before activating this lawyer.');
      }
    }
    if (data.password || data.isActive !== undefined) {
      updateData.authVersion = (Number.isInteger(existing.authVersion) ? existing.authVersion : 1) + 1;
    }
    const updated: any = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    store.lawyers[index] = updated;
    saveStore(store);
    const { passwordHash: _passwordHash, authVersion: _authVersion, ...publicLawyer } = updated;
    return { ...publicLawyer, hasPassword: Boolean(updated.passwordHash) };
  },

  async deleteLawyer(id: string): Promise<boolean> {
    if (usePrisma && prisma) {
      const existing = await prisma.lawyer.findUnique({ where: { id } });
      if (!existing) return false;
      const assignedEnquiries = await prisma.enquiry.count({
        where: {
          OR: [
            { lawyerId: id },
            { lawyerId: null, assignedAdvocate: { equals: existing.name, mode: 'insensitive' } },
          ],
        },
      });
      if (assignedEnquiries > 0) throw new Error('This lawyer has client records. Deactivate the account instead of deleting it.');
      await prisma.lawyer.delete({ where: { id } });
      return true;
    }
    const store = loadStore();
    const index = store.lawyers.findIndex((l: any) => l.id === id);
    if (index === -1) return false;
    const name = store.lawyers[index].name.toLowerCase();
    if (store.enquiries.some((enquiry) =>
      enquiry.lawyerId === id || (!enquiry.lawyerId && enquiry.assignedAdvocate?.toLowerCase() === name)
    )) throw new Error('This lawyer has client records. Deactivate the account instead of deleting it.');
    store.lawyers.splice(index, 1);
    saveStore(store);
    return true;
  },

  async getFeesSummary(
    start?: Date,
    end?: Date,
    lawyerId?: string,
    breakdownPage?: { page: number; pageSize: number }
  ): Promise<FeeSummary> {
    const lawyers = await this.getLawyers();
    const officeToday = getOfficePeriodRange('today');
    const officeMonth = getOfficePeriodRange('month');

    if (usePrisma && prisma) {
      const targetLawyer = lawyers.find((l) => l.id === lawyerId);
      const assignmentWhere = targetLawyer
        ? { OR: [{ lawyerId }, { AND: [{ lawyerId: null }, { assignedAdvocate: { equals: targetLawyer.name, mode: 'insensitive' } }] }] }
        : lawyerId ? { lawyerId } : {};
      const baseWhere: any = { deletedAt: null, ...assignmentWhere };
      const rangeWhere: any = start && end ? { ...baseWhere, entryTime: { gte: start, lt: end } } : baseWhere;
      const todayWhere: any = { ...baseWhere, entryTime: { gte: officeToday.start, lt: officeToday.end } };
      const monthWhere: any = { ...baseWhere, entryTime: { gte: officeMonth.start, lt: officeMonth.end } };

      const [rangeAggregate, todayAggregate, monthAggregate, totalTransactions] = await prisma.$transaction([
        prisma.enquiry.aggregate({ where: rangeWhere, _sum: { feesPaid: true } }),
        prisma.enquiry.aggregate({ where: todayWhere, _sum: { feesPaid: true } }),
        prisma.enquiry.aggregate({ where: monthWhere, _sum: { feesPaid: true } }),
        prisma.enquiry.count({ where: rangeWhere }),
      ]);

      const allBreakdownLawyers = lawyerId ? lawyers.filter((lawyer) => lawyer.id === lawyerId) : lawyers;
      // Aggregate all lawyers together instead of issuing three queries for every visible lawyer.
      const [rangeGroups, todayGroups] = await Promise.all([
        prisma.enquiry.groupBy({
          by: ['lawyerId', 'assignedAdvocate'],
          where: rangeWhere,
          _sum: { feesPaid: true },
          _count: { _all: true },
          _max: { entryTime: true },
        }),
        prisma.enquiry.groupBy({
          by: ['lawyerId', 'assignedAdvocate'],
          where: todayWhere,
          _sum: { feesPaid: true },
        }),
      ]);
      type GroupTotals = { fees: number; clients: number; latest: number };
      const rangeById = new Map<string, GroupTotals>();
      const rangeByName = new Map<string, GroupTotals>();
      const todayById = new Map<string, number>();
      const todayByName = new Map<string, number>();
      for (const group of rangeGroups) {
        const key = group.lawyerId || group.assignedAdvocate?.toLowerCase();
        if (!key) continue;
        const totals = group.lawyerId ? rangeById : rangeByName;
        const previous = totals.get(key) || { fees: 0, clients: 0, latest: 0 };
        totals.set(key, {
          fees: previous.fees + Number(group._sum.feesPaid || 0),
          clients: previous.clients + group._count._all,
          latest: Math.max(previous.latest, group._max.entryTime?.getTime() || 0),
        });
      }
      for (const group of todayGroups) {
        const key = group.lawyerId || group.assignedAdvocate?.toLowerCase();
        if (!key) continue;
        const totals = group.lawyerId ? todayById : todayByName;
        totals.set(key, (totals.get(key) || 0) + Number(group._sum.feesPaid || 0));
      }
      const lastFeeTime = (lawyer: ILawyer) => Math.max(
        rangeById.get(lawyer.id)?.latest || 0,
        rangeByName.get(lawyer.name.toLowerCase())?.latest || 0,
      );
      const breakdownLawyers = breakdownPage
        ? [...allBreakdownLawyers]
          .sort((a, b) => lastFeeTime(b) - lastFeeTime(a) || a.name.localeCompare(b.name))
          .slice((breakdownPage.page - 1) * breakdownPage.pageSize, breakdownPage.page * breakdownPage.pageSize)
        : allBreakdownLawyers;
      const lawyerBreakdown: LawyerFeeBreakdown[] = breakdownLawyers.map((lawyer) => {
        const byId = rangeById.get(lawyer.id);
        const byName = rangeByName.get(lawyer.name.toLowerCase());
        const latest = lastFeeTime(lawyer);
        return {
          lawyerId: lawyer.id,
          lawyerName: lawyer.name,
          isActive: lawyer.isActive,
          totalCollected: (byId?.fees || 0) + (byName?.fees || 0),
          todayCollected: (todayById.get(lawyer.id) || 0) + (todayByName.get(lawyer.name.toLowerCase()) || 0),
          clientCount: (byId?.clients || 0) + (byName?.clients || 0),
          lastFeeAt: latest ? new Date(latest).toISOString() : null,
          assignedTasks: lawyer.assignedTasks,
        };
      });

      return {
        totalCollected: Number(rangeAggregate._sum.feesPaid || 0),
        todayCollected: Number(todayAggregate._sum.feesPaid || 0),
        monthCollected: Number(monthAggregate._sum.feesPaid || 0),
        totalTransactions,
        lawyerBreakdown,
        ...(breakdownPage ? { lawyerBreakdownPagination: {
          page: breakdownPage.page,
          pageSize: breakdownPage.pageSize,
          total: allBreakdownLawyers.length,
          totalPages: Math.max(1, Math.ceil(allBreakdownLawyers.length / breakdownPage.pageSize)),
        } } : {}),
      };
    }

    let enquiries = loadStore().enquiries.filter((e) => !e.deletedAt);
    const belongsToLawyer = (enquiry: IEnquiry, lawyer: ILawyer) =>
      enquiry.lawyerId === lawyer.id ||
      (!enquiry.lawyerId && enquiry.assignedAdvocate?.toLowerCase() === lawyer.name.toLowerCase());
    if (lawyerId) {
      const targetLawyer = lawyers.find((lawyer) => lawyer.id === lawyerId);
      enquiries = enquiries.filter((enquiry) => enquiry.lawyerId === lawyerId ||
        Boolean(targetLawyer && belongsToLawyer(enquiry, targetLawyer)));
    }
    const rangeEnquiries = start && end
      ? enquiries.filter((e) => new Date(e.entryTime) >= start && new Date(e.entryTime) < end)
      : enquiries;
    const todayEnquiries = enquiries.filter((e) => new Date(e.entryTime) >= officeToday.start && new Date(e.entryTime) < officeToday.end);
    const monthEnquiries = enquiries.filter((e) => new Date(e.entryTime) >= officeMonth.start && new Date(e.entryTime) < officeMonth.end);
    const allBreakdownLawyers = lawyerId ? lawyers.filter((lawyer) => lawyer.id === lawyerId) : lawyers;
    const latestById = new Map<string, number>();
    const latestByName = new Map<string, number>();
    if (breakdownPage) {
      for (const entry of rangeEnquiries) {
        const time = new Date(entry.entryTime).getTime();
        if (entry.lawyerId) {
          latestById.set(entry.lawyerId, Math.max(latestById.get(entry.lawyerId) || 0, time));
        } else if (entry.assignedAdvocate) {
          const name = entry.assignedAdvocate.toLowerCase();
          latestByName.set(name, Math.max(latestByName.get(name) || 0, time));
        }
      }
    }
    const breakdownLawyers = breakdownPage
      ? [...allBreakdownLawyers]
        .sort((a, b) => Math.max(latestById.get(b.id) || 0, latestByName.get(b.name.toLowerCase()) || 0)
          - Math.max(latestById.get(a.id) || 0, latestByName.get(a.name.toLowerCase()) || 0)
          || a.name.localeCompare(b.name))
        .slice((breakdownPage.page - 1) * breakdownPage.pageSize, breakdownPage.page * breakdownPage.pageSize)
      : allBreakdownLawyers;
    const lawyerBreakdown = breakdownLawyers.map((lawyer) => {
      const rangeItems = rangeEnquiries.filter((e) => belongsToLawyer(e, lawyer));
      const todayItems = todayEnquiries.filter((e) => belongsToLawyer(e, lawyer));
      return {
        lawyerId: lawyer.id,
        lawyerName: lawyer.name,
        isActive: lawyer.isActive,
        totalCollected: rangeItems.reduce((sum, e) => sum + Number(e.feesPaid || 0), 0),
        todayCollected: todayItems.reduce((sum, e) => sum + Number(e.feesPaid || 0), 0),
        clientCount: rangeItems.length,
        lastFeeAt: rangeItems.reduce<string | null>((latest, entry) => {
          const entryTime = new Date(entry.entryTime).toISOString();
          return !latest || entryTime > latest ? entryTime : latest;
        }, null),
        assignedTasks: lawyer.assignedTasks,
      };
    });
    return {
      totalCollected: rangeEnquiries.reduce((sum, e) => sum + Number(e.feesPaid || 0), 0),
      todayCollected: todayEnquiries.reduce((sum, e) => sum + Number(e.feesPaid || 0), 0),
      monthCollected: monthEnquiries.reduce((sum, e) => sum + Number(e.feesPaid || 0), 0),
      totalTransactions: rangeEnquiries.length,
      lawyerBreakdown,
      ...(breakdownPage ? { lawyerBreakdownPagination: {
        page: breakdownPage.page,
        pageSize: breakdownPage.pageSize,
        total: allBreakdownLawyers.length,
        totalPages: Math.max(1, Math.ceil(allBreakdownLawyers.length / breakdownPage.pageSize)),
      } } : {}),
    };
  },

  async getFeesLedger(
    filter: { start?: string; end?: string; lawyerId?: string; purpose?: string; search?: string },
    page = 1,
    pageSize = 50,
    includeTotals = true,
  ): Promise<{ items: FeeTransaction[]; total: number; totalFees: number }> {
    const targetLawyer = filter.lawyerId ? await this.getLawyerById(filter.lawyerId) : null;
    if (usePrisma && prisma) {
      const where: any = { deletedAt: null };
      const conditions: any[] = [];
      if (filter.start && filter.end) {
        where.entryTime = { gte: new Date(filter.start), lt: new Date(filter.end) };
      }
      if (filter.purpose) {
        where.purpose = { contains: filter.purpose, mode: 'insensitive' };
      }
      if (filter.lawyerId) {
        if (targetLawyer) {
          conditions.push({ OR: [
            { lawyerId: filter.lawyerId },
            { AND: [{ lawyerId: null }, { assignedAdvocate: { equals: targetLawyer.name, mode: 'insensitive' } }] },
          ] });
        } else {
          conditions.push({ lawyerId: filter.lawyerId });
        }
      }
      if (filter.search) {
        conditions.push({ OR: [
          { fullName: { contains: filter.search, mode: 'insensitive' } },
          { contactNo: { contains: filter.search, mode: 'insensitive' } },
          { purpose: { contains: filter.search, mode: 'insensitive' } },
        ] });
      }
      if (conditions.length > 0) where.AND = conditions;

      const rowsQuery = prisma.enquiry.findMany({
        where,
        orderBy: [{ entryTime: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const [rows, total, aggregate] = includeTotals
        ? await prisma.$transaction([
          rowsQuery,
          prisma.enquiry.count({ where }),
          prisma.enquiry.aggregate({ where, _sum: { feesPaid: true } }),
        ])
        : [await rowsQuery, 0, null] as const;
      const items: FeeTransaction[] = rows.map((entry: any) => {
        const dateObj = new Date(entry.entryTime);
        return {
          id: entry.id,
          day: formatOfficeDay(dateObj),
          date: formatOfficeDate(dateObj),
          time: formatOfficeTime(dateObj),
          timestamp: dateObj.toISOString(),
          clientName: entry.fullName,
          contactNo: entry.contactNo,
          task: entry.purpose,
          assignedAdvocate: entry.assignedAdvocate || 'General Advocate Desk',
          lawyerId: entry.lawyerId,
          feesPaid: Number(entry.feesPaid || 0),
        };
      });
      return { items, total, totalFees: Number(aggregate?._sum.feesPaid || 0) };
    }

    let enquiries = loadStore().enquiries.filter((e) => !e.deletedAt);
      if (filter.start && filter.end) {
        const s = new Date(filter.start);
        const ed = new Date(filter.end);
        enquiries = enquiries.filter((e) => new Date(e.entryTime) >= s && new Date(e.entryTime) < ed);
      }
      if (filter.purpose) {
        const p = filter.purpose.toLowerCase();
        enquiries = enquiries.filter((e) => e.purpose.toLowerCase().includes(p));
      }
      if (filter.lawyerId) {
        const targetName = targetLawyer ? targetLawyer.name.toLowerCase() : '';
        enquiries = enquiries.filter(
          (e) => e.lawyerId === filter.lawyerId ||
            (!e.lawyerId && Boolean(targetName) && e.assignedAdvocate?.toLowerCase() === targetName)
        );
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        enquiries = enquiries.filter(
          (e) =>
            e.fullName.toLowerCase().includes(q) ||
            e.contactNo.toLowerCase().includes(q) ||
            e.purpose.toLowerCase().includes(q)
        );
      }
    enquiries.sort((a, b) =>
      new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime() || b.id.localeCompare(a.id));

    const totalFees = includeTotals ? enquiries.reduce((sum, e) => sum + (Number(e.feesPaid) || 0), 0) : 0;
    const total = includeTotals ? enquiries.length : 0;
    const paginated = enquiries.slice((page - 1) * pageSize, page * pageSize);

    const items: FeeTransaction[] = paginated.map((e) => {
      const dateObj = new Date(e.entryTime);
      return {
        id: e.id,
        day: formatOfficeDay(dateObj),
        date: formatOfficeDate(dateObj),
        time: formatOfficeTime(dateObj),
        timestamp: dateObj.toISOString(),
        clientName: e.fullName,
        contactNo: e.contactNo,
        task: e.purpose,
        assignedAdvocate: e.assignedAdvocate || 'General Advocate Desk',
        lawyerId: e.lawyerId,
        feesPaid: Number(e.feesPaid || 0),
      };
    });

    return { items, total, totalFees };
  },

  async getTodayStats(requestedStart?: Date, requestedEnd?: Date, lawyerId?: string) {
    const officeToday = getOfficePeriodRange('today');
    const start = requestedStart || officeToday.start;
    const end = requestedEnd || officeToday.end;
    if (usePrisma && prisma) {
      const where = { deletedAt: null, entryTime: { gte: start, lt: end }, ...(lawyerId ? { lawyerId } : {}) };
      const [totalToday, urgent] = await Promise.all([
        prisma.enquiry.count({ where }),
        prisma.enquiry.count({ where: { ...where, urgency: 'Urgent' } }),
      ]);
      return {
        totalToday,
        urgent,
      };
    }

    const today = loadStore().enquiries.filter((enquiry) =>
      !enquiry.deletedAt && (!lawyerId || enquiry.lawyerId === lawyerId) && new Date(enquiry.entryTime) >= start && new Date(enquiry.entryTime) < end,
    );
    return {
      totalToday: today.length,
      urgent: today.filter((enquiry) => enquiry.urgency === 'Urgent').length,
    };
  },
};
