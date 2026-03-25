export type Role = 'citizen' | 'officer' | 'ministry';
export type ComplaintStatus = 'submitted' | 'assigned' | 'in-progress' | 'resolved' | 'rejected';
export type Urgency = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  ministryId?: string;
  designation?: string;
  photoUrl?: string;
  rating?: number;
  totalResolved?: number;
}

export interface Ministry {
  id: string;
  name: string;
  jurisdiction: string;
  categories: string[];
  contact: string;
  escalation_level: number;
}

export interface Officer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ministry_id: string;
  ministry_name: string;
  designation: string;
  photo_url?: string;
  rating: number;
  total_resolved: number;
}

export interface Complaint {
  id: string;
  category: string;
  description: string;
  location: string;
  urgency: Urgency;
  status: ComplaintStatus;
  submitted_at: string;
  updated_at: string;
  assigned_at?: string;
  resolved_at?: string;
  citizen_id: string;
  citizen_name: string;
  citizen_email: string;
  citizen_phone: string;
  ministry_id: string;
  ministry_name: string;
  officer_id?: string;
  officer_name?: string;
  officer_designation?: string;
  officer_photo?: string;
  officer_rating?: number;
  officer_total_resolved?: number;
  resolution_notes?: string;
  resolution_proof_url?: string;
  citizen_rating?: number;
  citizen_review?: string;
  documents?: Document[];
  history?: HistoryEntry[];
}

export interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
}

export interface HistoryEntry {
  id: string;
  changed_by_name: string;
  old_status?: string;
  new_status: string;
  note?: string;
  created_at: string;
}

export interface Message {
  id: string;
  complaint_id: string;
  sender_id: string;
  sender_role: 'citizen' | 'officer';
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
