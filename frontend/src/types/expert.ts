export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface ExpertListItem {
  id: string;
  full_name: string;
  profile_picture?: string | null;
  title: string;
  specialty_tags: string[];
  rate_per_session: string; // Decimal string e.g. "800.00"
  verification_status: VerificationStatus;
  average_rating?: number;
  total_reviews?: number;
  wallet_balance?: string;
}

export interface ExpertDetail extends ExpertListItem {
  bio: string;
  availability: Record<string, string[]>;
}

export interface ExpertFilterParams {
  tag?: string;
  search?: string;
  min_rate?: string;
  max_rate?: string;
}