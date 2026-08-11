export type BookingChannel = 'voice' | 'video' | 'chat';

export type BookingStatus =
  | 'pending_payment'
  | 'escrowed'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface BookingCreatePayload {
  expert_id: string;
  channel: BookingChannel;
  scheduled_start: string;
  scheduled_end: string;
}

export interface BookingDetail {
  id: string;
  client_phone: string;
  expert: string;
  expert_name: string;
  expert_title: string;
  channel: BookingChannel;
  status: BookingStatus;
  scheduled_start: string;
  scheduled_end: string;
  rate_snapshot: string;
  cancellation_reason?: string;
  created_at: string;
}