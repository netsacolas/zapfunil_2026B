export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'ATTENDANT';
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[];
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  company?: string;
  status: 'Lead' | 'Frio' | 'Morno' | 'Quente' | 'Fechado';
  funnelStageId?: string;
  customFields?: Record<string, string>;
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  isFromMe: boolean;
  type: 'TEXT' | 'AUDIO' | 'IMAGE';
  audioTranscription?: string;
  mediaUrl?: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  unreadCount: number;
  messages: Message[];
  lastActivity?: number;
  hasLoadedHistory?: boolean;
  isArchived?: boolean;
}

export interface FunnelStage {
  id: string;
  name: string;
  contactIds: string[];
}

export interface ScheduledMessage {
  id: string;
  contactId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO' | 'POLL' | 'CHOICE';
  content: string;
  mediaUrl?: string;
  pollOptions?: string[];
  date: string;
  time: string;
  recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  status: 'PENDING' | 'SENT' | 'FAILED';
}

export interface MessageTemplate {
  id: string;
  title: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO';
  content: string;
  mediaUrl?: string;
}
