import { Request, Response } from 'express';
import { z } from 'zod';
import { dbService } from '../config/db';

const createLawyerSchema = z.object({
  name: z.string().trim().min(2, 'Lawyer name must be at least 2 characters').max(150),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores, and hyphens'),
  password: z.string().min(10, 'Password must be at least 10 characters')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[0-9]/, 'Password must include a number')
    .regex(/[^a-zA-Z0-9]/, 'Password must include a symbol'),
  phone: z.string().trim().max(30).regex(/^\+?[0-9\s()-]{7,30}$/, 'Invalid phone number').optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  assignedTasks: z.array(z.string().trim().min(2).max(200)).max(50).default([]),
  isActive: z.boolean().default(true),
});

const updateLawyerSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50).optional().or(z.literal('')),
  password: z.string().min(10, 'Password must be at least 10 characters')
    .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/).optional().or(z.literal('')),
  phone: z.string().trim().max(30).regex(/^\+?[0-9\s()-]{7,30}$/).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  assignedTasks: z.array(z.string().trim().min(2).max(200)).max(50).optional(),
  isActive: z.boolean().optional(),
});

export const lawyerController = {
  async getLawyers(req: Request, res: Response): Promise<void> {
    try {
      const onlyActive = req.query.active === 'true';
      const user = (req as any).user;
      if (user?.role !== 'admin' && user?.role !== 'lawyer') {
        res.status(403).json({ success: false, message: 'This account cannot access lawyer profiles.' });
        return;
      }
      const lawyers = await dbService.getLawyers(user?.role === 'admin' ? onlyActive : true);
      const visibleLawyers = user?.role === 'lawyer'
        ? lawyers.filter((lawyer) => lawyer.id === user.lawyerId)
        : lawyers;
      res.json({ success: true, data: visibleLawyers });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch lawyers' });
    }
  },

  async createLawyer(req: Request, res: Response): Promise<void> {
    try {
      const validation = createLawyerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors.map((e) => e.message) });
        return;
      }

      const lawyer = await dbService.createLawyer({
        ...validation.data,
        email: validation.data.email || undefined,
        username: validation.data.username,
        password: validation.data.password,
      });

      res.status(201).json({
        success: true,
        message: 'Lawyer profile created successfully',
        data: lawyer,
      });
    } catch (error: any) {
      const conflict = error?.code === 'P2002' || /already exists|unique/i.test(error?.message || '');
      res.status(conflict ? 409 : 500).json({
        success: false,
        message: conflict ? 'That lawyer name or username is already in use.' : error.message || 'Failed to create lawyer',
      });
    }
  },

  async updateLawyer(req: Request, res: Response): Promise<void> {
    try {
      const validation = updateLawyerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors.map((e) => e.message) });
        return;
      }

      const updated = await dbService.updateLawyer(req.params.id, {
        ...validation.data,
        email: validation.data.email || undefined,
        username: validation.data.username || undefined,
        password: validation.data.password || undefined,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Lawyer not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Lawyer details updated successfully',
        data: updated,
      });
    } catch (error: any) {
      const conflict = error?.code === 'P2002' || /already exists|unique/i.test(error?.message || '');
      res.status(conflict ? 409 : 500).json({
        success: false,
        message: conflict ? 'That lawyer name or username is already in use.' : error.message || 'Failed to update lawyer',
      });
    }
  },

  async deleteLawyer(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await dbService.deleteLawyer(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Lawyer not found' });
        return;
      }
      res.json({
        success: true,
        message: 'Lawyer deleted successfully',
      });
    } catch (error: any) {
      const hasHistory = error?.code === 'P2003' || /has client records/i.test(error?.message || '');
      res.status(hasHistory ? 409 : 500).json({
        success: false,
        message: error.message || 'Failed to delete lawyer',
      });
    }
  },
};
