import { Request, Response } from 'express';
import { z } from 'zod';
import { dbService } from '../config/db';
import { getOfficePeriodRange, OfficePeriod } from '../utils/time';
import { normalizeNotificationPhone } from '../utils/phone';

const createEnquirySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(150),
  contactNo: z.string().trim().max(30).refine(
    (value) => normalizeNotificationPhone(value) !== null,
    'Enter a 10-digit Indian mobile number, optionally prefixed with +91',
  ),
  purpose: z.string().trim().min(2, 'Purpose of visit is required').max(500),
  caseNumber: z.string().trim().max(100).optional(),
  assignedAdvocate: z.string().trim().max(150).optional(),
  lawyerId: z.string().trim().optional(),
  assignedTask: z.string().trim().min(2).max(200).optional(),
  feesPaid: z.number()
    .finite()
    .min(0, 'Fees paid cannot be negative')
    .max(99999999.99, 'Fees paid is too large')
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), 'Fees paid can have at most 2 decimal places')
    .default(0),
  urgency: z.enum(['Normal', 'High', 'Urgent']).optional(),
});

const filterFields = {
  search: z.string().trim().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format').optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  period: z.enum(['today', 'yesterday', 'month', 'year']).optional(),
};

const listQuerySchema = z.object({
  ...filterFields,
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
}).refine((value) => Boolean(value.start) === Boolean(value.end), {
  message: 'Both start and end are required when specifying a date range',
});

const exportQuerySchema = z.object(filterFields).refine(
  (value) => Boolean(value.start) === Boolean(value.end),
  { message: 'Both start and end are required when specifying a date range' },
);

const statsQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
}).refine((value) => Boolean(value.start) === Boolean(value.end), {
  message: 'Both start and end are required when specifying a date range',
});

function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvTextExact(value: unknown): string {
  const text = value == null ? '' : String(value).trim();
  if (!text) return '""';
  return `"=""${text.replace(/"/g, '""')}"""`;
}

function publicEnquiry<T extends Record<string, any>>(
  enquiry: T,
): Omit<T, 'notes' | 'deletedAt' | 'status' | 'consultationStartTime' | 'consultationEndTime'> {
  const {
    notes: _notes,
    deletedAt: _deletedAt,
    status: _status,
    consultationStartTime: _consultationStartTime,
    consultationEndTime: _consultationEndTime,
    ...publicData
  } = enquiry;
  return {
    ...publicData,
    feesPaid: Number(publicData.feesPaid ?? 0),
  } as Omit<T, 'notes' | 'deletedAt' | 'status' | 'consultationStartTime' | 'consultationEndTime'>;
}

function invalidRange(start?: string, end?: string): boolean {
  return Boolean(start && end && new Date(start) >= new Date(end));
}

function resolveFilter<T extends { start?: string; end?: string; period?: OfficePeriod }>(filter: T) {
  const { period, ...resolved } = filter;
  if (!period) return resolved;
  const range = getOfficePeriodRange(period);
  return { ...resolved, start: range.start.toISOString(), end: range.end.toISOString() };
}

function lawyerScope(req: Request): string | undefined {
  const user = (req as any).user;
  return user?.role === 'lawyer' ? user.lawyerId : undefined;
}

export const enquiryController = {
  async getEnquiries(req: Request, res: Response): Promise<void> {
    try {
      const query = listQuerySchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ success: false, message: query.error.errors[0].message });
        return;
      }
      if (invalidRange(query.data.start, query.data.end)) {
        res.status(400).json({ success: false, message: 'The start time must be before the end time' });
        return;
      }
      const { page, pageSize, ...rawFilter } = query.data;
      const filter = { ...resolveFilter(rawFilter), ...(lawyerScope(req) ? { lawyerId: lawyerScope(req) } : {}) };
      const result = await dbService.getEnquiriesPage(filter, page, pageSize);
      const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
      res.json({
        success: true,
        data: result.items.map((item) => publicEnquiry(item as any)),
        pagination: { page, pageSize, total: result.total, totalPages },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch enquiries' });
    }
  },

  async getEnquiryById(req: Request, res: Response): Promise<void> {
    try {
      const enquiry = await dbService.getEnquiryById(req.params.id, lawyerScope(req));
      if (!enquiry) {
        res.status(404).json({ success: false, message: 'Enquiry not found' });
        return;
      }
      res.json({ success: true, data: publicEnquiry(enquiry as any) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async createEnquiry(req: Request, res: Response): Promise<void> {
    try {
      const validation = createEnquirySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors.map((error) => error.message) });
        return;
      }
      const user = (req as any).user;
      const scopedLawyerId = lawyerScope(req);
      const assignedTasks: string[] = scopedLawyerId && Array.isArray(user.assignedTasks)
        ? user.assignedTasks : [];
      if (assignedTasks.length > 0 && !assignedTasks.includes(validation.data.assignedTask || validation.data.purpose)) {
        res.status(403).json({ success: false, message: 'This work is not assigned to your lawyer account.' });
        return;
      }
      if (scopedLawyerId && validation.data.assignedTask &&
        !validation.data.assignedTask.startsWith('Other') &&
        validation.data.assignedTask !== validation.data.purpose) {
        res.status(400).json({ success: false, message: 'The selected task does not match the enquiry purpose.' });
        return;
      }
      if (scopedLawyerId && validation.data.assignedTask?.startsWith('Other') === true &&
        validation.data.purpose.startsWith('Other')) {
        res.status(400).json({ success: false, message: 'Describe the custom legal work before saving.' });
        return;
      }
      const enquiry = await dbService.createEnquiry({
        ...validation.data,
        ...(scopedLawyerId ? {
          lawyerId: scopedLawyerId,
          assignedAdvocate: user.lawyerName || user.sub,
        } : {}),
        urgency: validation.data.urgency || 'Normal',
      });
      res.status(201).json({
        success: true,
        message: 'Client enquiry recorded successfully. Configured notifications are queued for delivery.',
        data: publicEnquiry(enquiry as any),
        notifications: { status: 'queued' },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getTodayStats(req: Request, res: Response): Promise<void> {
    try {
      const query = statsQuerySchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ success: false, message: query.error.errors[0].message });
        return;
      }
      const start = query.data.start ? new Date(query.data.start) : undefined;
      const end = query.data.end ? new Date(query.data.end) : undefined;
      if (start && end && start >= end) {
        res.status(400).json({ success: false, message: 'The start time must be before the end time' });
        return;
      }
      res.json({ success: true, data: await dbService.getTodayStats(start, end, lawyerScope(req)) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async exportCSV(req: Request, res: Response): Promise<void> {
    const query = exportQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ success: false, message: query.error.errors[0].message });
      return;
    }
    if (invalidRange(query.data.start, query.data.end)) {
      res.status(400).json({ success: false, message: 'The start time must be before the end time' });
      return;
    }

    try {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="advocate_visitor_register.csv"');
      res.setHeader('Cache-Control', 'no-store');
      res.write('\uFEFFID,Full Name,Contact No,Purpose,Case Number,Advocate,Fees Paid,Urgency,Entry Time\n');
      const filter = { ...resolveFilter(query.data), ...(lawyerScope(req) ? { lawyerId: lawyerScope(req) } : {}) };
      for await (const batch of dbService.iterateEnquiries(filter)) {
        for (const enquiry of batch) {
          if (res.destroyed) return;
          res.write([
            csvCell(enquiry.id),
            csvCell(enquiry.fullName),
            csvTextExact(enquiry.contactNo),
            csvCell(enquiry.purpose),
            csvCell(enquiry.caseNumber),
            csvCell(enquiry.assignedAdvocate),
            csvCell(enquiry.feesPaid),
            csvCell(enquiry.urgency),
            csvTextExact(new Date(enquiry.entryTime).toISOString().replace('T', ' ').substring(0, 19)),
          ].join(',') + '\n');
        }
      }
      res.end();
    } catch (error: any) {
      if (res.headersSent) {
        res.destroy(error);
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
