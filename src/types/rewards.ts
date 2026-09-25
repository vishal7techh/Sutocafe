export type RewardActivityType = 
  | "GOOGLE_REVIEW" 
  | "INSTAGRAM_FOLLOW" 
  | "INSTAGRAM_STORY" 
  | "VISIT_VERIFICATION";

export type RewardRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type RewardStatus = "ACTIVE" | "UNLOCKED" | "REDEEMED" | "EXPIRED";

export interface RewardCampaign {
  id: string;
  name: string;
  description: string;
  requiredVisits: number;
  expiryDate?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RewardActivity {
  id: string;
  rewardId: string;
  visitNumber: number;
  activityType: RewardActivityType;
  title: string;
  description: string;
  externalUrl?: string;
  isActive: boolean;
}

export interface CustomerRewardState {
  id?: string;
  customerPhone: string;
  customerName?: string;
  rewardId: string;
  currentVisitCount: number;
  currentStampCount: number;
  cycleNumber: number;
  status: RewardStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface RewardVerificationRequest {
  id: string;
  customerPhone: string;
  customerName: string;
  rewardId: string;
  orderId?: string;
  visitNumber: number;
  cycleNumber: number;
  activityType: RewardActivityType;
  requestStatus: RewardRequestStatus;
  rejectionReason?: string;
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface RewardStampHistory {
  id: string;
  customerPhone: string;
  rewardId: string;
  orderId?: string;
  requestId?: string;
  visitNumber: number;
  stampNumber: number;
  cycleNumber: number;
  action: "STAMP_AWARDED" | "REWARD_UNLOCKED" | "REWARD_REDEEMED";
  approvedBy?: string;
  createdAt: string;
}

export interface RewardRedemption {
  id: string;
  customerPhone: string;
  rewardId: string;
  cycleNumber: number;
  redeemedAt: string;
  redeemedBy?: string;
}
