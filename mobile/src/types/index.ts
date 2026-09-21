export type UrgencyLevel = 'Normal' | 'High' | 'Urgent';
export type EnquiryStatus = 'Waiting' | 'In Consultation' | 'Completed' | 'Rescheduled';

export interface IEnquiry {
  id: string;
  clientId?: string | null;
  fullName: string;
  contactNo: string;
  purpose: string;
  caseNumber?: string | null;
  assignedAdvocate?: string | null;
  urgency: UrgencyLevel;
  status: EnquiryStatus;
  entryTime: string; // ISO string
  consultationStartTime?: string | null;
  consultationEndTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnquiryInput {
  fullName: string;
  contactNo: string;
  purpose: string;
  caseNumber?: string;
  assignedAdvocate?: string;
  urgency?: UrgencyLevel;
}

export interface EnquiryPage {
  items: IEnquiry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TodayStats {
  totalToday: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  urgent: number;
}

export const LEGAL_PURPOSES = [
  'General Legal Consultation',
  'Property & Land Dispute',
  'Bail & Criminal Matter',
  'Civil Suit / Recovery',
  'Matrimonial / Family Court',
  'Contract & Agreement Drafting',
  'High Court Appeal / Writ',
  'Affidavit & Notary Work',
  'Corporate & Commercial',
  'Other / Custom Enquiry'
];

export const ADVOCATES = [
  'Senior Advocate',
  'Adv. Sharma (Civil & Property)',
  'Adv. Kulkarni (Criminal & Bail)',
  'Adv. Verma (Corporate & Tax)',
  'Associate Desk'
];
