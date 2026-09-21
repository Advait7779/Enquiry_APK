import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { IClient, IEnquiry } from '../types';
import { getOfficePeriodRange } from '../utils/time';

let prisma: PrismaClient | null = null;
let usePrisma = false;

const DEFAULT_DATA_FILE = path.join(__dirname, '../../data/store.json');
const DATA_FILE = process.env.LOCAL_DATA_FILE ? path.resolve(process.env.LOCAL_DATA_FILE) : DEFAULT_DATA_FILE;
const DATA_DIR = path.dirname(DATA_FILE);

export interface EnquiryFilter {
  date?: string;
  search?: string;
  status?: string;
  start?: string;
  end?: string;
}

interface StoreAuditLog {
  id: string;
  enquiryId: string | null;
  action: string;
  changes: Record<string, unknown> | null;
  createdAt: Date;
}

interface StoreData {
  clients: IClient[];
  enquiries: IEnquiry[];
  auditLogs: StoreAuditLog[];
}

export class StaleRecordError extends Error {
  constructor() {
    super('This client record changed on another device. The latest version has been loaded; review it and try again.');
    this.name = 'StaleRecordError';
  }
}

function loadStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const initial: StoreData = { clients: [], enquiries: [], auditLogs: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return {
      clients: (parsed.clients || []).map((client: any) => ({
        ...client,
        createdAt: new Date(client.createdAt),
        updatedAt: new Date(client.updatedAt),
      })),
      enquiries: (parsed.enquiries || []).map((enquiry: any) => ({
        ...enquiry,
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
    };
  } catch (error) {
    console.error('Local data store could not be read:', error);
    throw new Error('Local data store is corrupted or unreadable. Restore it from backup before continuing.');
  }
}

function saveStore(data: StoreData): void {
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(temporaryFile, DATA_FILE);
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
  if (filter?.status && filter.status !== 'All') where.status = filter.status;
  if (filter?.search) {
    where.OR = [
      { fullName: { contains: filter.search, mode: 'insensitive' } },
      { contactNo: { contains: filter.search, mode: 'insensitive' } },
      { purpose: { contains: filter.search, mode: 'insensitive' } },
      { caseNumber: { contains: filter.search, mode: 'insensitive' } },
      { assignedAdvocate: { contains: filter.search, mode: 'insensitive' } },
    ];
  }
  if (filter?.date) {
    const start = new Date(`${filter.date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    where.entryTime = { gte: start, lt: end };
  }
  if (filter?.start && filter?.end) {
    where.entryTime = { gte: new Date(filter.start), lt: new Date(filter.end) };
  }
  return where;
}

function filterStoreEnquiries(enquiries: IEnquiry[], filter?: EnquiryFilter): IEnquiry[] {
  let list = enquiries.filter((enquiry) => !enquiry.deletedAt);
  if (filter?.status && filter.status !== 'All') {
    list = list.filter((enquiry) => enquiry.status.toLowerCase() === filter.status?.toLowerCase());
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
    const targetDate = new Date(filter.date).toDateString();
    list = list.filter((enquiry) => new Date(enquiry.entryTime).toDateString() === targetDate);
  }
  if (filter?.start && filter?.end) {
    const start = new Date(filter.start);
    const end = new Date(filter.end);
    list = list.filter((enquiry) => new Date(enquiry.entryTime) >= start && new Date(enquiry.entryTime) < end);
  }
  return list.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
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

  async getEnquiryById(id: string): Promise<IEnquiry | null> {
    if (usePrisma && prisma) {
      const found = await prisma.enquiry.findFirst({ where: { id, deletedAt: null } });
      return found as unknown as IEnquiry | null;
    }
    return loadStore().enquiries.find((enquiry) => enquiry.id === id && !enquiry.deletedAt) || null;
  },

  async createEnquiry(data: {
    fullName: string;
    contactNo: string;
    purpose: string;
    caseNumber?: string;
    assignedAdvocate?: string;
    urgency?: 'Normal' | 'High' | 'Urgent';
  }): Promise<IEnquiry> {
    const entryTime = new Date();
    if (usePrisma && prisma) {
      const created = await prisma.$transaction(async (transaction) => {
        const enquiry = await transaction.enquiry.create({
          data: {
            fullName: data.fullName,
            contactNo: data.contactNo,
            purpose: data.purpose,
            caseNumber: data.caseNumber || null,
            assignedAdvocate: data.assignedAdvocate || null,
            urgency: data.urgency || 'Normal',
            status: 'Waiting',
            entryTime,
          },
        });
        await transaction.auditLog.create({
          data: { enquiryId: enquiry.id, action: 'CREATED', changes: { status: 'Waiting' } },
        });
        return enquiry;
      });
      return created as unknown as IEnquiry;
    }

    const store = loadStore();
    const now = new Date();
    const enquiry: IEnquiry = {
      id: `enq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      clientId: null,
      fullName: data.fullName,
      contactNo: data.contactNo,
      purpose: data.purpose,
      caseNumber: data.caseNumber || null,
      assignedAdvocate: data.assignedAdvocate || 'General Advocate Desk',
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
    addStoreAudit(store, enquiry.id, 'CREATED', { status: 'Waiting' });
    saveStore(store);
    return enquiry;
  },

  async updateEnquiryStatus(
    id: string,
    status: IEnquiry['status'],
    expectedUpdatedAt: Date,
  ): Promise<IEnquiry | null> {
    if (usePrisma && prisma) {
      return prisma.$transaction(async (transaction) => {
        const now = new Date();
        const updateData: any = { status, updatedAt: now };
        if (status === 'In Consultation') updateData.consultationStartTime = now;
        if (status === 'Completed') updateData.consultationEndTime = now;
        const result = await transaction.enquiry.updateMany({
          where: { id, deletedAt: null, updatedAt: expectedUpdatedAt },
          data: updateData,
        });
        if (result.count === 0) {
          const exists = await transaction.enquiry.findFirst({ where: { id, deletedAt: null } });
          if (exists) throw new StaleRecordError();
          return null;
        }
        const updated = await transaction.enquiry.findUnique({ where: { id } });
        await transaction.auditLog.create({
          data: { enquiryId: id, action: 'STATUS_CHANGED', changes: { status } },
        });
        return updated as unknown as IEnquiry;
      });
    }

    const store = loadStore();
    const index = store.enquiries.findIndex((enquiry) => enquiry.id === id && !enquiry.deletedAt);
    if (index === -1) return null;
    const enquiry = store.enquiries[index];
    if (new Date(enquiry.updatedAt).getTime() !== expectedUpdatedAt.getTime()) throw new StaleRecordError();
    const now = new Date();
    enquiry.status = status;
    enquiry.updatedAt = now;
    if (status === 'In Consultation' && !enquiry.consultationStartTime) enquiry.consultationStartTime = now;
    if (status === 'Completed') enquiry.consultationEndTime = now;
    addStoreAudit(store, id, 'STATUS_CHANGED', { status });
    saveStore(store);
    return enquiry;
  },

  async deleteEnquiry(id: string, expectedUpdatedAt: Date): Promise<boolean> {
    if (usePrisma && prisma) {
      return prisma.$transaction(async (transaction) => {
        const deletedAt = new Date();
        const result = await transaction.enquiry.updateMany({
          where: { id, deletedAt: null, updatedAt: expectedUpdatedAt },
          data: { deletedAt, updatedAt: deletedAt },
        });
        if (result.count === 0) {
          const exists = await transaction.enquiry.findFirst({ where: { id, deletedAt: null } });
          if (exists) throw new StaleRecordError();
          return false;
        }
        await transaction.auditLog.create({
          data: { enquiryId: id, action: 'SOFT_DELETED', changes: { deletedAt: deletedAt.toISOString() } },
        });
        return true;
      });
    }

    const store = loadStore();
    const enquiry = store.enquiries.find((item) => item.id === id && !item.deletedAt);
    if (!enquiry) return false;
    if (new Date(enquiry.updatedAt).getTime() !== expectedUpdatedAt.getTime()) throw new StaleRecordError();
    const deletedAt = new Date();
    enquiry.deletedAt = deletedAt;
    enquiry.updatedAt = deletedAt;
    addStoreAudit(store, id, 'SOFT_DELETED', { deletedAt: deletedAt.toISOString() });
    saveStore(store);
    return true;
  },

  async getTodayStats(requestedStart?: Date, requestedEnd?: Date) {
    const officeToday = getOfficePeriodRange('today');
    const start = requestedStart || officeToday.start;
    const end = requestedEnd || officeToday.end;
    if (usePrisma && prisma) {
      const where = { deletedAt: null, entryTime: { gte: start, lt: end } };
      const [byStatus, urgent] = await Promise.all([
        prisma.enquiry.groupBy({ by: ['status'], where, _count: { _all: true } }),
        prisma.enquiry.count({ where: { ...where, urgency: 'Urgent' } }),
      ]);
      const count = (status: string) => byStatus.find((item) => item.status === status)?._count._all || 0;
      return {
        totalToday: byStatus.reduce((total, item) => total + item._count._all, 0),
        waiting: count('Waiting'),
        inConsultation: count('In Consultation'),
        completed: count('Completed'),
        urgent,
      };
    }

    const today = loadStore().enquiries.filter((enquiry) =>
      !enquiry.deletedAt && new Date(enquiry.entryTime) >= start && new Date(enquiry.entryTime) < end,
    );
    return {
      totalToday: today.length,
      waiting: today.filter((enquiry) => enquiry.status === 'Waiting').length,
      inConsultation: today.filter((enquiry) => enquiry.status === 'In Consultation').length,
      completed: today.filter((enquiry) => enquiry.status === 'Completed').length,
      urgent: today.filter((enquiry) => enquiry.urgency === 'Urgent').length,
    };
  },
};
