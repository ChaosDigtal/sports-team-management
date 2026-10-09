export type PlatformId = "da" | "handshake" | "snorkel";
export type PlatformRole = "platform_admin" | "member";
export type Tone = "ok" | "warn" | "danger" | "neutral" | "info";
export type AccountStatus =
  | "Active"
  | "Suspended (Work Quality)"
  | "Suspended (No projects)"
  | "Suspended (Before Work)";
export type TaskStatus = "WIP" | "Completed" | "Exited";
export type ProjectKind = "Project" | "Survey" | "Qualification";

export type SessionUser = {
  id: string;
  name: string;
  signedUpAt: string;
  isSuperAdmin: boolean;
  roles: Partial<Record<PlatformId, PlatformRole>>;
};

export type Account = {
  id: string;
  name: string;
  whatsapp: string;
  sharingPercent: number | null;
  email: string;
  emailPassword: string;
  accountPassword: string;
  timezone: string;
  chromeRemote: string;
  anydeskId: string;
  anydeskPassword: string;
  ultraviewerId: string;
  ultraviewerPassword: string;
  trainerEmail: string;
  trainerPassword: string;
  bitwardenEmail: string;
  bitwardenPassword: string;
  phone: string;
  address: string;
  dob: string;
  gender: string;
  race: string;
  country: string;
  weeklyTargetHours: number | null;
  withdrawalWeekday: number;
  withdrawalMinutes: number;
  linkedinUrl: string;
  resumeUrl: string;
  createdAt: string;
  status: AccountStatus;
  suspendedAt: string;
};

export type AccountRow = Account & {
  earnings: number;
  hours: number;
  weekProjectHours: number;
  weekQualificationHours: number;
  weekSurveyHours: number;
};

export type Project = {
  id: string;
  name: string;
  kind: ProjectKind;
  maxAllowedMinutes: number | null;
  recommendedStartMinutes: number | null;
  recommendedEndMinutes: number | null;
  autoExpireEnabled: boolean;
  autoExpireMinutes: number | null;
  intendToWork: boolean;
  canPause: boolean;
};

export type ProjectRow = Project & {
  loggedHours: number;
  earnings: number;
};

export type Task = {
  id: string;
  accountId: string;
  userId: string;
  projectId: string;
  timezone: string;
  startTime: string;
  endTime: string;
  elapsedHours: number | null;
  loggedHours: number | null;
  rate: number | null;
  earning: number | null;
  status: TaskStatus;
  accountName: string;
  accountTimezone: string;
  userName: string;
  projectName: string;
  maxAllowedMinutes: number | null;
  canPause: boolean;
  intendToWork: boolean;
  autoExpireEnabled: boolean;
  autoExpireMinutes: number | null;
  payoutStatus: "" | "Pending" | "Available" | "Paid";
};

export type DirectoryUser = SessionUser & {
  accountCount: number;
  projectCount: number;
};

export type WorkLink = {
  id: string;
  name: string;
  earnings: number;
  hours: number;
};

export type StatRow = {
  id: string;
  name: string;
  href: string;
  rank: number;
  earnings: number;
  hours: number;
  earningsShare: number;
  hoursShare: number;
  lastWorkedAt: string;
};

export type ChartPoint = {
  start: string;
  earning: number;
  hours: number;
};

export type WithdrawalStatus = "Processing" | "Paid";

export type Withdrawal = {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  withdrawnAt: string;
  sharePercent: number;
  profit: number;
  status: WithdrawalStatus;
};

export type WeekPoint = {
  key: string;
  label: string;
  rangeLabel: string;
  earnings: number;
  current: boolean;
};

export type SearchParams = Record<string, string | string[] | undefined>;

export type ActionState = { error?: string };
