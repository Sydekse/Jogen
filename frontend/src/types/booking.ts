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
  client_id?: string;
  client_phone: string;
  client_name?: string;
  client_email?: string;
  expert: string;
  expert_user_id?: string;
  expert_name: string;
  expert_title: string;
  channel: BookingChannel;
  status: BookingStatus;
  scheduled_start: string;
  scheduled_end: string;
  rate_snapshot: string;
  cancellation_reason?: string;
  has_review?: boolean;
  settlement?: {
    decision: string;
    duration_seconds: number;
    total_deposit: string;
    gross_earned: string;
    client_refund: string;
    client_platform_fee: string;
    expert_platform_fee: string;
    platform_fee: string;
    expert_payout: string;
  } | null;
  created_at: string;
}