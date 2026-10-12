export interface ILawyer {
  id: string;
  name: string;
  username?: string | null;
  role?: string;
  phone?: string | null;
  email?: string | null;
  assignedTasks: string[];
  isActive: boolean;
  hasPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  lastFeeAt?: string | null;
  assignedTasks: string[];
}

export interface FeeSummary {
  totalCollected: number;
  todayCollected: number;
  monthCollected: number;
  totalTransactions: number;
  lawyerBreakdown: LawyerFeeBreakdown[];
  lawyerBreakdownPagination?: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface NotificationSettings {
  smsUrl: string;
  rcsUrl: string;
  whatsappUrl: string;
  voiceCallUrl: string;
  smsUrlConfigured: boolean;
  rcsUrlConfigured: boolean;
  whatsappUrlConfigured: boolean;
  voiceCallUrlConfigured: boolean;
  updatedAt?: string;
}

export type NotificationJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface NotificationJob {
  id: string;
  enquiryId: string;
  clientName: string;
  phoneEnding: string;
  status: NotificationJobStatus;
  attempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  result: Partial<Record<'sms' | 'rcs' | 'whatsapp' | 'voiceCall', 'disabled' | 'sent' | 'skipped' | 'failed'>> | null;
  createdAt: string;
  updatedAt: string;
}
