// Database types for BobPay
export type UserRole = 'client' | 'freelancer';
export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
export type MilestoneStatus = 'locked' | 'active' | 'submitted' | 'verified' | 'completed' | 'disputed';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'cancelled';
export type TransactionType = 'deposit' | 'withdrawal' | 'lock' | 'release' | 'refund';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  title: string | null;
  bio: string | null;
  location: string | null;
  skills: string[];
  hourly_rate: number | null;
  total_earned: number;
  total_spent: number;
  milestones_completed: number;
  success_rate: number;
  rating: number;
  is_verified: boolean;
  is_top_rated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  freelancer_id: string | null;
  title: string;
  description: string | null;
  category: string;
  status: ProjectStatus;
  total_budget: number;
  locked_funds: number;
  released_funds: number;
  deadline: string | null;
  skills_required: string[];
  proposal_count: number;
  funds_verified: boolean;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  // Joined data
  client?: Profile;
  freelancer?: Profile;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  project_id: string;
  milestone_number: number;
  title: string;
  description: string | null;
  amount: number;
  status: MilestoneStatus;
  deadline: string | null;
  verification_score: number | null;
  submission_url: string | null;
  submission_notes: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  project_id: string;
  freelancer_id: string;
  cover_letter: string | null;
  proposed_budget: number | null;
  proposed_timeline: string | null;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  freelancer?: Profile;
  project?: Project;
}

export interface Wallet {
  id: string;
  user_id: string;
  total_balance: number;
  available_balance: number;
  locked_balance: number;
  pending_release: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  project_id: string | null;
  milestone_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  // Joined data
  project?: Project;
}

export interface Dispute {
  id: string;
  project_id: string;
  milestone_id: string | null;
  raised_by: string;
  against: string;
  reason: string;
  description: string | null;
  evidence_urls: string[];
  disputed_amount: number;
  status: DisputeStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  project?: Project;
  raised_by_profile?: Profile;
  against_profile?: Profile;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  project_id: string | null;
  action_type: string;
  title: string;
  description: string | null;
  amount: number | null;
  created_at: string;
  project?: Project;
}
