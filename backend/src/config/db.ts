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
    feesPaid?: number;
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
            changes: { feesPaid: data.feesPaid ?? 0 },
          },
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
    addStoreAudit(store, enquiry.id, 'CREATED', { feesPaid: data.feesPaid ?? 0 });
    saveStore(store);
    return enquiry;
  },

  async getTodayStats(requestedStart?: Date, requestedEnd?: Date) {
    const officeToday = getOfficePeriodRange('today');
    const start = requestedStart || officeToday.start;
    const end = requestedEnd || officeToday.end;
    if (usePrisma && prisma) {
      const where = { deletedAt: null, entryTime: { gte: start, lt: end } };
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
      !enquiry.deletedAt && new Date(enquiry.entryTime) >= start && new Date(enquiry.entryTime) < end,
    );
    return {
      totalToday: today.length,
      urgent: today.filter((enquiry) => enquiry.urgency === 'Urgent').length,
    };
  },
};
