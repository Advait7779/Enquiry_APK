export type UrgencyLevel = 'Normal' | 'High' | 'Urgent';
export type EnquiryStatus = 'Waiting' | 'In Consultation' | 'Completed' | 'Rescheduled';

export interface IClient {
  id: string;
  fullName: string;
  contactNo: string;
  alternateNo?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEnquiry {
  id: string;
  clientId?: string | null;
  fullName: string;
  contactNo: string;
  purpose: string;
  caseNumber?: string | null;
  assignedAdvocate?: string | null;
  lawyerId?: string | null;
  feesPaid: number;
  urgency: UrgencyLevel;
  status: EnquiryStatus;
  notes?: string | null;
  entryTime: Date;
  consultationStartTime?: Date | null;
  consultationEndTime?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEnquiryDTO {
  fullName: string;
  contactNo: string;
  purpose: string;
  caseNumber?: string;
  assignedAdvocate?: string;
  lawyerId?: string;
  feesPaid?: number;
  urgency?: UrgencyLevel;
  notes?: string;
}

export interface ILawyer {
  id: string;
  name: string;
  username?: string | null;
  role?: string;
  phone?: string | null;
  email?: string | null;
  assignedTasks: string[];
  isActive: boolean;
  authVersion?: number;
  hasPassword?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLawyerDTO {
  name: string;
  username?: string;
  password?: string;
  role?: string;
  phone?: string;
  email?: string;
  assignedTasks?: string[];
  isActive?: boolean;
}

export interface UpdateLawyerDTO {
  name?: string;
  username?: string;
  password?: string;
  role?: string;
  phone?: string;
  email?: string;
  assignedTasks?: string[];
  isActive?: boolean;
}

export interface FeeTransaction {
  id: string;
  day: string;
  date: string;
  time: string;
  timestamp: string;
  clientName: string;
  contactNo: string;
  task: string;
  assignedAdvocate: string;
  lawyerId?: string | null;
  feesPaid: number;
}

export interface LawyerFeeBreakdown {
  lawyerId: string;
  lawyerName: string;
  isActive: boolean;
  totalCollected: number;
  todayCollected: number;
  clientCount: number;
  lastFeeAt: string | null;
  assignedTasks: string[];
}

export interface FeeSummary {
  totalCollected: number;
  todayCollected: number;
  monthCollected: number;
  totalTransactions: number;
  lawyerBreakdown: LawyerFeeBreakdown[];
}

export interface AuthTokenPayload {
  sub: string;
  exp: number;
  lawyerId?: string | null;
  lawyerName?: string;
  role?: string;
  assignedTasks?: string[];
  authVersion?: number;
}
