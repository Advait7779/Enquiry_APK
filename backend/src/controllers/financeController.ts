import { Request, Response } from 'express';
import { z } from 'zod';
import { dbService } from '../config/db';
import { getOfficeDateRange, getOfficePeriodRange } from '../utils/time';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const financeQuerySchema = z.object({
  period: z.enum(['today', 'yesterday', 'month', 'year']).optional(),
  from: z.string().regex(datePattern, 'From date must use YYYY-MM-DD').optional(),
  to: z.string().regex(datePattern, 'To date must use YYYY-MM-DD').optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  lawyerId: z.string().trim().max(150).optional(),
  purpose: z.string().trim().max(200).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
}).superRefine((value, ctx) => {
  if (Boolean(value.from) !== Boolean(value.to)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Both from and to dates are required' });
  if (Boolean(value.start) !== Boolean(value.end)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Both start and end times are required' });
});

type FinanceQuery = z.infer<typeof financeQuerySchema>;

function resolveRange(query: FinanceQuery): { start?: string; end?: string } {
  if (query.period) {
    const range = getOfficePeriodRange(query.period);
    return { start: range.start.toISOString(), end: range.end.toISOString() };
  }
  if (query.from && query.to) {
    const range = getOfficeDateRange(query.from, query.to);
    return { start: range.start.toISOString(), end: range.end.toISOString() };
  }
  if (query.start && query.end) {
    const start = new Date(query.start);
    const end = new Date(query.end);
    if (start >= end) throw new Error('The start time must be before the end time');
    return { start: query.start, end: query.end };
  }
  return {};
}

function parseFinanceQuery(req: Request, res: Response): FinanceQuery | null {
  const parsed = financeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: parsed.error.errors[0].message });
    return null;
  }
  return parsed.data;
}

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

export const financeController = {
  async getFeesSummary(req: Request, res: Response): Promise<void> {
    try {
      const query = parseFinanceQuery(req, res);
      if (!query) return;
      const range = resolveRange(query);
      const summary = await dbService.getFeesSummary(
        range.start ? new Date(range.start) : undefined,
        range.end ? new Date(range.end) : undefined,
        query.lawyerId,
      );
      res.json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch fees summary' });
    }
  },

  async getFeesLedger(req: Request, res: Response): Promise<void> {
    try {
      const query = parseFinanceQuery(req, res);
      if (!query) return;
      const { start, end } = resolveRange(query);

      const filter = {
        start,
        end,
        lawyerId: query.lawyerId,
        purpose: query.purpose,
        search: query.search,
      };

      const result = await dbService.getFeesLedger(filter, query.page, query.pageSize);
      const totalPages = Math.max(1, Math.ceil(result.total / query.pageSize));

      res.json({
        success: true,
        data: result.items,
        totalFees: result.totalFees,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          totalPages,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch fees ledger' });
    }
  },

  async exportFeesCsv(req: Request, res: Response): Promise<void> {
    try {
      const query = parseFinanceQuery(req, res);
      if (!query) return;
      const { start, end } = resolveRange(query);

      const filter = {
        start,
        end,
        lawyerId: query.lawyerId,
        purpose: query.purpose,
        search: query.search,
      };

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="lawyer_fees_collection_ledger.csv"');
      res.setHeader('Cache-Control', 'no-store');

      res.write('\uFEFFDay,Date,Time,Client Name,Contact No,Task / Legal Purpose,Assigned Lawyer,Fees Collected (INR)\n');
      const batchSize = 200;
      let page = 1;
      while (!res.destroyed) {
        const result = await dbService.getFeesLedger(filter, page, batchSize);
        for (const item of result.items) {
          res.write([
            csvCell(item.day),
            csvTextExact(item.date),
            csvTextExact(item.time),
            csvCell(item.clientName),
            csvTextExact(item.contactNo),
            csvCell(item.task),
            csvCell(item.assignedAdvocate),
            csvCell(item.feesPaid),
          ].join(',') + '\n');
        }
        if (page * batchSize >= result.total || result.items.length === 0) break;
        page += 1;
      }
      res.end();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to export fees ledger' });
    }
  },
};
