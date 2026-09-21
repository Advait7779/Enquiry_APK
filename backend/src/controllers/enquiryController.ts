import { Request, Response } from 'express';
import { z } from 'zod';
import { dbService, StaleRecordError } from '../config/db';
import { getOfficePeriodRange, OfficePeriod } from '../utils/time';

const createEnquirySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(150),
  contactNo: z.string().trim().max(30).refine((value) => {
    const digits = value.replace(/\D/g, '');
    return /^[0-9\s()+-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }, 'Contact number must contain 7 to 15 digits'),
  purpose: z.string().trim().min(2, 'Purpose of visit is required').max(500),
  caseNumber: z.string().trim().max(100).optional(),
  assignedAdvocate: z.string().trim().max(150).optional(),
  urgency: z.enum(['Normal', 'High', 'Urgent']).optional(),
});

const filterFields = {
  search: z.string().trim().max(200).optional(),
  status: z.enum(['All', 'Waiting', 'In Consultation', 'Completed', 'Rescheduled']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format').optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  period: z.enum(['today', 'month', 'year']).optional(),
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

const versionSchema = z.string().datetime('A valid record version is required');

function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function publicEnquiry<T extends Record<string, any>>(enquiry: T): Omit<T, 'notes' | 'deletedAt'> {
  const { notes: _notes, deletedAt: _deletedAt, ...publicData } = enquiry;
  return publicData;
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

function handleMutationError(error: unknown, res: Response): void {
  if (error instanceof StaleRecordError) {
    res.status(409).json({ success: false, message: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  res.status(500).json({ success: false, message });
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
      const filter = resolveFilter(rawFilter);
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
      const enquiry = await dbService.getEnquiryById(req.params.id);
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
      const enquiry = await dbService.createEnquiry({
        ...validation.data,
        urgency: validation.data.urgency || 'Normal',
      });
      res.status(201).json({
        success: true,
        message: 'Client enquiry recorded successfully',
        data: publicEnquiry(enquiry as any),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const validation = z.object({
        status: z.enum(['Waiting', 'In Consultation', 'Completed', 'Rescheduled']),
        expectedUpdatedAt: versionSchema,
      }).safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, message: validation.error.errors[0].message });
        return;
      }
      const updated = await dbService.updateEnquiryStatus(
        req.params.id,
        validation.data.status,
        new Date(validation.data.expectedUpdatedAt),
      );
      if (!updated) {
        res.status(404).json({ success: false, message: 'Enquiry not found' });
        return;
      }
      res.json({
        success: true,
        message: `Status updated to ${validation.data.status}`,
        data: publicEnquiry(updated as any),
      });
    } catch (error) {
      handleMutationError(error, res);
    }
  },

  async deleteEnquiry(req: Request, res: Response): Promise<void> {
    try {
      const validation = z.object({ expectedUpdatedAt: versionSchema }).safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, message: validation.error.errors[0].message });
        return;
      }
      const deleted = await dbService.deleteEnquiry(req.params.id, new Date(validation.data.expectedUpdatedAt));
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Enquiry not found' });
        return;
      }
      res.json({ success: true, message: 'Enquiry removed from the active register' });
    } catch (error) {
      handleMutationError(error, res);
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
      res.json({ success: true, data: await dbService.getTodayStats(start, end) });
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
      res.write('\uFEFFID,Full Name,Contact No,Purpose,Case Number,Advocate,Urgency,Status,Entry Time\n');
      for await (const batch of dbService.iterateEnquiries(resolveFilter(query.data))) {
        for (const enquiry of batch) {
          if (res.destroyed) return;
          res.write([
            csvCell(enquiry.id),
            csvCell(enquiry.fullName),
            csvCell(enquiry.contactNo),
            csvCell(enquiry.purpose),
            csvCell(enquiry.caseNumber),
            csvCell(enquiry.assignedAdvocate),
            csvCell(enquiry.urgency),
            csvCell(enquiry.status),
            csvCell(new Date(enquiry.entryTime).toISOString()),
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
