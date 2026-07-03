export type UserRole = "owner" | "worker" | "super_admin";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  tenantId?: string | null;
  workerQrToken?: string;
}

export interface ShopSettings {
  id: string;
  tenantId: string;
  businessName: string;
  logoUrl: string | null;
  cardTemplateUrl: string | null;
  cardDesignId: string;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  timezone: string;
  stampsEnabled: boolean;
  spendEnabled: boolean;
  stampThreshold: number;
  spendThresholdDzd: number;
  maxScansPerDay: number;
  rewardType: string;
  rewardValue: string | null;
  stampMilestones: { position: number; label: string }[];
  trackProducts: boolean;
  collectClientEmail: boolean;
  whatsappToken?: string | null;
  whatsappPhoneId?: string | null;
  emailSender?: string | null;
  whatsappConfigured?: boolean;
  emailConfigured?: boolean;
  clientLanguage: "fr" | "en" | "ar";
  updatedAt: string;
}

export interface Client {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  cardCode: string;
  totalStamps: number;
  currentCycleStamps: number;
  currentCycleSpendDzd: number;
  totalSpendDzd: number;
  totalRewardsEarned: number;
  enrolledAt: string;
  lastScanAt: string | null;
  notes: string | null;
  isBlocked: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  price: number;
  isActive: boolean;
}

export interface Worker {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  scanCount: number;
  workerQrToken: string;
}

export interface ScanLog {
  id: string;
  clientName: string | null;
  workerName: string | null;
  scanType: string;
  status: string;
  stampsAdded: number;
  rewardTriggered: boolean;
  scannedAt: string;
}

export interface Reward {
  id: string;
  clientName: string | null;
  rewardDescription: string;
  createdAt: string;
  redeemedAt: string | null;
  redeemedByWorkerName: string | null;
}

export interface ClientCard {
  businessName: string;
  clientName: string;
  primaryColor: string;
  cardUrl: string | null;
  cardTemplateUrl: string | null;
  cardDesignId?: string | null;
  stampsEnabled?: boolean;
  spendEnabled?: boolean;
  /** @deprecated */
  rewardMode?: "stamps" | "spend" | "both";
  currency?: string;
  stampThreshold: number;
  currentCycleStamps: number;
  spendThresholdDzd?: number;
  currentCycleSpendDzd?: number;
  rewardValue?: string | null;
  cardCode: string;
  stampMilestones?: { position: number; label: string }[];
  pendingRewardId?: string | null;
  pendingRewardDescription?: string | null;
  showCartaWatermark?: boolean;
  rewards?: ClientCardReward[];
  recentScans?: { scannedAt: string; status: string; stampsAdded: number }[];
}

export interface ClientCardReward {
  id: string;
  rewardDescription: string;
  createdAt: string;
  redeemedAt: string | null;
}

export interface RewardClaim {
  id: string;
  clientName: string;
  rewardDescription: string;
  createdAt: string;
  redeemedAt: string | null;
  businessName: string;
  primaryColor: string;
  cardCode: string;
}

export interface AnalyticsOverview {
  totalClients: number;
  newClientsThisWeek: number;
  scansToday: number;
  scansThisWeek: number;
  rewardsPending: number;
  fraudAlertsToday: number;
  activeWorkers: number;
  dailyScans: { date: string; count: number }[];
  dailyEnrolments: { date: string; count: number }[];
}
