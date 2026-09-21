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
  urgency?: UrgencyLevel;
  notes?: string;
}

export interface UpdateEnquiryStatusDTO {
  status: EnquiryStatus;
}
