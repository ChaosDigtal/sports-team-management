import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./passwords";
import { defaultWithdrawalMinutes, jstWallClockToIso, recentWeekKeys } from "./time";
import { round2 } from "./format";

const globalForDb = globalThis as unknown as { __teamDb?: DatabaseSync; __teamDbVersion?: number };
const DB_VERSION = 11;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  signed_up_at TEXT NOT NULL,
  is_super_admin INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_platform_roles (
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, platform)
);

CREATE TABLE IF NOT EXISTS sequences (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "DA_accounts" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL DEFAULT '',
  sharing_percent REAL,
  email TEXT NOT NULL DEFAULT '',
  email_password TEXT NOT NULL DEFAULT '',
  account_password TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'UTC-8',
  chrome_remote TEXT NOT NULL DEFAULT '',
  anydesk_id TEXT NOT NULL DEFAULT '',
  anydesk_password TEXT NOT NULL DEFAULT '',
  ultraviewer_id TEXT NOT NULL DEFAULT '',
  ultraviewer_password TEXT NOT NULL DEFAULT '',
  trainer_email TEXT NOT NULL DEFAULT '',
  trainer_password TEXT NOT NULL DEFAULT '',
  bitwarden_email TEXT NOT NULL DEFAULT '',
  bitwarden_password TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  dob TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  race TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  resume_url TEXT NOT NULL DEFAULT '',
  weekly_target_hours REAL DEFAULT 40,
  withdrawal_weekday INTEGER NOT NULL DEFAULT 4,
  withdrawal_minutes INTEGER NOT NULL DEFAULT 1380,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  suspended_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "DA_projects" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  deadline TEXT NOT NULL DEFAULT '',
  expected_hours REAL,
  intend_to_work INTEGER NOT NULL DEFAULT 0,
  idle_expiry_days INTEGER,
  can_pause INTEGER NOT NULL DEFAULT 0,
  max_allowed_minutes INTEGER,
  recommended_start_minutes INTEGER,
  recommended_end_minutes INTEGER,
  auto_expire_enabled INTEGER NOT NULL DEFAULT 0,
  auto_expire_minutes INTEGER,
  kind TEXT NOT NULL DEFAULT 'Project'
);

CREATE TABLE IF NOT EXISTS "DA_tasks" (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES "DA_accounts"(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT NOT NULL REFERENCES "DA_projects"(id),
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  elapsed_hours REAL,
  logged_hours REAL,
  rate REAL,
  earning REAL,
  status TEXT NOT NULL DEFAULT 'WIP',
  withdrawal_id TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_da_tasks_account ON "DA_tasks"(account_id);
CREATE INDEX IF NOT EXISTS idx_da_tasks_project ON "DA_tasks"(project_id);
CREATE INDEX IF NOT EXISTS idx_da_tasks_user ON "DA_tasks"(user_id);
CREATE INDEX IF NOT EXISTS idx_da_tasks_start ON "DA_tasks"(start_time);

CREATE TABLE IF NOT EXISTS "DA_withdrawals" (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES "DA_accounts"(id),
  amount REAL NOT NULL,
  withdrawn_at TEXT NOT NULL,
  share_percent REAL NOT NULL,
  profit REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Processing'
);

CREATE INDEX IF NOT EXISTS idx_da_withdrawals_account ON "DA_withdrawals"(account_id);
CREATE INDEX IF NOT EXISTS idx_da_withdrawals_at ON "DA_withdrawals"(withdrawn_at);

CREATE TABLE IF NOT EXISTS dashboard_estimates (
  key TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  calculated_at TEXT NOT NULL
);
`;

function openDatabase() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "team.db"));
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(SCHEMA);
  return db;
}

function migrateAccounts(db: DatabaseSync) {
  const names = new Set(
    (db.prepare(`PRAGMA table_info("DA_accounts")`).all() as Array<{ name: string }>).map((row) => row.name),
  );
  const addedPassword = !names.has("account_password");
  const columns: Array<[string, string]> = [
    ["account_password", "account_password TEXT NOT NULL DEFAULT ''"],
    ["ultraviewer_id", "ultraviewer_id TEXT NOT NULL DEFAULT ''"],
    ["ultraviewer_password", "ultraviewer_password TEXT NOT NULL DEFAULT ''"],
    ["trainer_email", "trainer_email TEXT NOT NULL DEFAULT ''"],
    ["trainer_password", "trainer_password TEXT NOT NULL DEFAULT ''"],
    ["bitwarden_email", "bitwarden_email TEXT NOT NULL DEFAULT ''"],
    ["bitwarden_password", "bitwarden_password TEXT NOT NULL DEFAULT ''"],
    ["country", "country TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [name, definition] of columns) {
    if (!names.has(name)) db.exec(`ALTER TABLE "DA_accounts" ADD COLUMN ${definition}`);
  }
  db.exec(`
    UPDATE "DA_accounts" SET timezone = 'UTC-8' WHERE timezone IN ('America/Los_Angeles', 'America/Vancouver');
    UPDATE "DA_accounts" SET timezone = 'UTC-7' WHERE timezone = 'America/Denver';
    UPDATE "DA_accounts" SET timezone = 'UTC-6' WHERE timezone = 'America/Chicago';
    UPDATE "DA_accounts" SET timezone = 'UTC-5' WHERE timezone IN ('America/New_York', 'America/Toronto');
    UPDATE "DA_accounts" SET timezone = 'UTC' WHERE timezone IN ('Asia/Manila', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Europe/London', 'Pacific/Auckland');
    UPDATE "DA_accounts" SET timezone = 'UTC+1' WHERE timezone IN ('Europe/Berlin', 'Europe/Paris');
    UPDATE "DA_accounts" SET timezone = 'UTC+2' WHERE timezone IN ('Europe/Helsinki', 'Africa/Cairo');
    UPDATE "DA_accounts" SET timezone = 'UTC+3' WHERE timezone IN ('Europe/Moscow', 'Asia/Riyadh');
    UPDATE "DA_accounts" SET race = 'East Asian' WHERE race = 'Asian';
    UPDATE "DA_accounts" SET country = 'US' WHERE country = '' AND timezone IN ('UTC-8', 'UTC-7', 'UTC-6', 'UTC-5', 'UTC-4');
    UPDATE "DA_accounts" SET country = 'UK' WHERE country = '' AND timezone = 'UTC';
    UPDATE "DA_accounts" SET country = 'NO' WHERE country = '' AND timezone = 'UTC+1';
    UPDATE "DA_accounts" SET country = 'SW' WHERE country = '' AND timezone IN ('UTC+2', 'UTC+3');
    UPDATE "DA_accounts" SET status = 'Suspended (No projects)' WHERE status = 'Suspended';
    UPDATE "DA_accounts" SET status = 'Active' WHERE status = 'Closed';
  `);
  if (!addedPassword) return;
  const fill = db.prepare(`
    UPDATE "DA_accounts" SET
      account_password = ?, trainer_email = ?, trainer_password = ?,
      bitwarden_email = ?, bitwarden_password = ?, ultraviewer_id = ?, ultraviewer_password = ?
    WHERE id = ? AND account_password = ''
  `);
  const demos = [
    ["Maya-acct-1904", "maya.trainer@example.com", "trainer-maya-22", "maya.vault@example.com", "vault-maya-77", "338 210 441", "ultra-maya-12", "DA-A-001"],
    ["Andre-acct-4410", "andre.trainer@example.com", "trainer-andre-18", "andre.vault@example.com", "vault-andre-53", "441 908 220", "ultra-andre-09", "DA-A-002"],
    ["Priya-acct-2208", "priya.trainer@example.com", "trainer-priya-40", "priya.vault@example.com", "vault-priya-16", "220 118 904", "ultra-priya-33", "DA-A-003"],
    ["Jonah-acct-9155", "jonah.trainer@example.com", "trainer-jonah-07", "jonah.vault@example.com", "vault-jonah-61", "915 662 104", "ultra-jonah-28", "DA-A-004"],
  ];
  for (const demo of demos) fill.run(...demo);
}

function migrateProjects(db: DatabaseSync) {
  const names = new Set(
    (db.prepare(`PRAGMA table_info("DA_projects")`).all() as Array<{ name: string }>).map((row) => row.name),
  );
  const columns: Array<[string, string]> = [
    ["max_allowed_minutes", "max_allowed_minutes INTEGER"],
    ["recommended_start_minutes", "recommended_start_minutes INTEGER"],
    ["recommended_end_minutes", "recommended_end_minutes INTEGER"],
    ["auto_expire_enabled", "auto_expire_enabled INTEGER NOT NULL DEFAULT 0"],
    ["auto_expire_minutes", "auto_expire_minutes INTEGER"],
  ];
  for (const [name, definition] of columns) {
    if (!names.has(name)) db.exec(`ALTER TABLE "DA_projects" ADD COLUMN ${definition}`);
  }
  db.exec(`
    UPDATE "DA_projects" SET
      max_allowed_minutes = CAST(ROUND(expected_hours * 60) AS INTEGER),
      recommended_end_minutes = CAST(ROUND(expected_hours * 60) AS INTEGER),
      recommended_start_minutes = CAST(ROUND(expected_hours * 45) AS INTEGER)
    WHERE max_allowed_minutes IS NULL AND expected_hours IS NOT NULL;
    UPDATE "DA_projects" SET auto_expire_enabled = 1, auto_expire_minutes = idle_expiry_days * 1440
    WHERE auto_expire_minutes IS NULL AND idle_expiry_days IS NOT NULL;
    UPDATE "DA_projects" SET max_allowed_minutes = 2880, recommended_start_minutes = 1920, recommended_end_minutes = 2400, auto_expire_enabled = 1, auto_expire_minutes = 30 WHERE id = 'DA-P-001';
    UPDATE "DA_projects" SET max_allowed_minutes = 4320, recommended_start_minutes = 2880, recommended_end_minutes = 3600, auto_expire_enabled = 1, auto_expire_minutes = 45 WHERE id = 'DA-P-002';
    UPDATE "DA_projects" SET max_allowed_minutes = 1800, recommended_start_minutes = 1080, recommended_end_minutes = 1440, auto_expire_enabled = 1, auto_expire_minutes = 20 WHERE id = 'DA-P-003';
    UPDATE "DA_projects" SET max_allowed_minutes = 1440, recommended_start_minutes = 960, recommended_end_minutes = 1200, auto_expire_enabled = 1, auto_expire_minutes = 15 WHERE id = 'DA-P-004';
    UPDATE "DA_projects" SET max_allowed_minutes = 2400, recommended_start_minutes = 1200, recommended_end_minutes = 1800, auto_expire_enabled = 0, auto_expire_minutes = NULL WHERE id = 'DA-P-005';
    UPDATE "DA_projects" SET max_allowed_minutes = 1200, recommended_start_minutes = 720, recommended_end_minutes = 960, auto_expire_enabled = 1, auto_expire_minutes = 60 WHERE id = 'DA-P-006';
  `);
}

function migrateCatalog(db: DatabaseSync) {
  const accountNames = new Set(
    (db.prepare(`PRAGMA table_info("DA_accounts")`).all() as Array<{ name: string }>).map((row) => row.name),
  );
  if (!accountNames.has("weekly_target_hours")) {
    db.exec(`ALTER TABLE "DA_accounts" ADD COLUMN weekly_target_hours REAL`);
  }
  const projectNames = new Set(
    (db.prepare(`PRAGMA table_info("DA_projects")`).all() as Array<{ name: string }>).map((row) => row.name),
  );
  if (!projectNames.has("kind")) {
    db.exec(`ALTER TABLE "DA_projects" ADD COLUMN kind TEXT NOT NULL DEFAULT 'Project'`);
  }
  db.exec(`
    UPDATE "DA_accounts" SET gender = 'Woman' WHERE gender = 'Female';
    UPDATE "DA_accounts" SET gender = 'Man' WHERE gender = 'Male';
    UPDATE "DA_accounts" SET gender = 'Prefer not to answer' WHERE gender = 'Prefer not to say';
    UPDATE "DA_accounts" SET race = 'Black or African American' WHERE race = 'Black';
    UPDATE "DA_accounts" SET race = 'East Asian' WHERE race = 'Asian';
    UPDATE "DA_accounts" SET race = 'South Asian' WHERE id = 'DA-A-003' AND race IN ('Asian', 'East Asian');
    UPDATE "DA_accounts" SET weekly_target_hours = 40 WHERE weekly_target_hours IS NULL;
    UPDATE "DA_accounts" SET weekly_target_hours = 40 WHERE id = 'DA-A-001' AND weekly_target_hours = 3;
    UPDATE "DA_accounts" SET weekly_target_hours = 40 WHERE id = 'DA-A-002' AND weekly_target_hours = 8;
    UPDATE "DA_accounts" SET weekly_target_hours = 40 WHERE id = 'DA-A-003' AND weekly_target_hours = 4;
    UPDATE "DA_accounts" SET weekly_target_hours = 40 WHERE id = 'DA-A-004' AND weekly_target_hours = 30;
    UPDATE "DA_projects" SET kind = 'Project' WHERE id IN ('DA-P-001', 'DA-P-002') AND (kind IS NULL OR kind = '');
    UPDATE "DA_projects" SET kind = 'Qualification' WHERE id IN ('DA-P-003', 'DA-P-005') AND (kind IS NULL OR kind = '' OR kind = 'Project');
    UPDATE "DA_projects" SET kind = 'Survey' WHERE id IN ('DA-P-004', 'DA-P-006') AND (kind IS NULL OR kind = '' OR kind = 'Project');
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS "DA_withdrawals" (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES "DA_accounts"(id),
      amount REAL NOT NULL,
      withdrawn_at TEXT NOT NULL,
      share_percent REAL NOT NULL,
      profit REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Processing'
    );
    CREATE INDEX IF NOT EXISTS idx_da_withdrawals_account ON "DA_withdrawals"(account_id);
    CREATE INDEX IF NOT EXISTS idx_da_withdrawals_at ON "DA_withdrawals"(withdrawn_at);
    INSERT OR IGNORE INTO sequences (name, value) VALUES ('DA-W', 0);
  `);
  ensureTaskWithdrawalColumn(db);
}

function ensureTaskWithdrawalColumn(db: DatabaseSync) {
  const taskNames = new Set(
    (db.prepare(`PRAGMA table_info("DA_tasks")`).all() as Array<{ name: string }>).map((row) => row.name),
  );
  if (!taskNames.has("withdrawal_id")) {
    db.exec(`ALTER TABLE "DA_tasks" ADD COLUMN withdrawal_id TEXT NOT NULL DEFAULT ''`);
    linkExistingWithdrawals(db);
  }
}

function ensureWithdrawalSchedule(db: DatabaseSync) {
  const names = new Set(
    (db.prepare(`PRAGMA table_info("DA_accounts")`).all() as Array<{ name: string }>).map((row) => row.name),
  );
  const addedWeekday = !names.has("withdrawal_weekday");
  const addedMinutes = !names.has("withdrawal_minutes");
  if (addedWeekday) db.exec(`ALTER TABLE "DA_accounts" ADD COLUMN withdrawal_weekday INTEGER NOT NULL DEFAULT 4`);
  if (addedMinutes) db.exec(`ALTER TABLE "DA_accounts" ADD COLUMN withdrawal_minutes INTEGER NOT NULL DEFAULT 1380`);
  if (addedWeekday || addedMinutes) {
    db.exec(`
      UPDATE "DA_accounts" SET withdrawal_weekday = 4, withdrawal_minutes = 1380
      WHERE timezone IN ('UTC-8', 'UTC-7', 'UTC-6', 'UTC-5', 'UTC-4', 'UTC-3');
      UPDATE "DA_accounts" SET withdrawal_weekday = 4, withdrawal_minutes = 900
      WHERE timezone NOT IN ('UTC-8', 'UTC-7', 'UTC-6', 'UTC-5', 'UTC-4', 'UTC-3');
    `);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_estimates (
      key TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      calculated_at TEXT NOT NULL
    );
  `);
}

function linkExistingWithdrawals(db: DatabaseSync) {
  const withdrawals = db
    .prepare(`SELECT id, account_id, amount, withdrawn_at FROM "DA_withdrawals" ORDER BY withdrawn_at, id`)
    .all() as Array<{ id: string; account_id: string; amount: number; withdrawn_at: string }>;
  const tasks = db.prepare(
    `
    SELECT id, COALESCE(earning, 0) AS earning
    FROM "DA_tasks"
    WHERE account_id = ? AND status = 'Completed' AND end_time != '' AND end_time <= ? AND withdrawal_id = ''
    ORDER BY end_time, id
  `,
  );
  const claim = db.prepare(`UPDATE "DA_tasks" SET withdrawal_id = ? WHERE id = ? AND withdrawal_id = ''`);
  for (const withdrawal of withdrawals) {
    let remaining = Number(withdrawal.amount) || 0;
    const cutoff = new Date(new Date(withdrawal.withdrawn_at).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const rows = tasks.all(withdrawal.account_id, cutoff) as Array<{ id: string; earning: number }>;
    for (const task of rows) {
      if (remaining <= 0.009) break;
      claim.run(withdrawal.id, task.id);
      remaining -= Number(task.earning) || 0;
    }
  }
}

type SeedUser = {
  id: string;
  name: string;
  password: string;
  signedUpAt: string;
  superAdmin: boolean;
  daRole: "platform_admin" | "member" | null;
};

type SeedAccount = {
  id: string;
  name: string;
  whatsapp: string;
  sharing: number;
  email: string;
  emailPassword: string;
  accountPassword: string;
  timezone: string;
  chrome: string;
  anydesk: string;
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
  linkedin: string;
  resume: string;
  createdAt: string;
  status: string;
  suspendedAt: string;
};

function seed(db: DatabaseSync) {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (existing.n > 0) return;

  const users: SeedUser[] = [
    { id: "admin", name: "System Admin", password: "admin12345", signedUpAt: "2026-04-15T15:00:00.000Z", superAdmin: true, daRole: null },
    { id: "riley.chen", name: "Riley Chen", password: "riley12345", signedUpAt: "2026-04-20T15:00:00.000Z", superAdmin: false, daRole: "platform_admin" },
    { id: "maya.chen", name: "Maya Chen", password: "member12345", signedUpAt: "2026-05-02T15:00:00.000Z", superAdmin: false, daRole: "member" },
    { id: "andre.walsh", name: "Andre Walsh", password: "member12345", signedUpAt: "2026-05-18T15:00:00.000Z", superAdmin: false, daRole: "member" },
    { id: "priya.nair", name: "Priya Nair", password: "member12345", signedUpAt: "2026-06-09T15:00:00.000Z", superAdmin: false, daRole: "member" },
    { id: "jonah.ellis", name: "Jonah Ellis", password: "member12345", signedUpAt: "2026-07-01T15:00:00.000Z", superAdmin: false, daRole: "member" },
  ];
  const passwords = new Map(users.map((user) => [user.id, hashPassword(user.password)]));
  const now = new Date();
  const suspendedAt = new Date(now.getTime() - 12 * 86400000).toISOString();

  const accounts: SeedAccount[] = [
    {
      id: "DA-A-001",
      name: "Maya Chen",
      whatsapp: "+1 415 555 0148",
      sharing: 70,
      email: "maya.chen.desk@example.com",
      emailPassword: "Maya-mailbox-4821",
      accountPassword: "Maya-acct-1904",
      timezone: "UTC-8",
      chrome: "pierre420375@gmail.com",
      anydesk: "482 119 334",
      anydeskPassword: "desk-maya-19",
      ultraviewerId: "338 210 441",
      ultraviewerPassword: "ultra-maya-12",
      trainerEmail: "maya.trainer@example.com",
      trainerPassword: "trainer-maya-22",
      bitwardenEmail: "maya.vault@example.com",
      bitwardenPassword: "vault-maya-77",
      phone: "+1 415 555 0148",
      address: "1840 Market Street, San Francisco, CA",
      dob: "1996-04-12",
      gender: "Woman",
      race: "East Asian",
      country: "US",
      linkedin: "https://www.linkedin.com/in/example-maya-chen",
      resume: "https://example.com/resumes/maya-chen.pdf",
      createdAt: "2026-05-02T15:00:00.000Z",
      status: "Active",
      suspendedAt: "",
    },
    {
      id: "DA-A-002",
      name: "Andre Walsh",
      whatsapp: "+1 312 555 0172",
      sharing: 65,
      email: "andre.walsh.desk@example.com",
      emailPassword: "Andre-mailbox-7730",
      accountPassword: "Andre-acct-4410",
      timezone: "UTC-6",
      chrome: "",
      anydesk: "773 220 918",
      anydeskPassword: "desk-andre-44",
      ultraviewerId: "441 908 220",
      ultraviewerPassword: "ultra-andre-09",
      trainerEmail: "andre.trainer@example.com",
      trainerPassword: "trainer-andre-18",
      bitwardenEmail: "andre.vault@example.com",
      bitwardenPassword: "vault-andre-53",
      phone: "+1 312 555 0172",
      address: "233 S Wacker Drive, Chicago, IL",
      dob: "1994-11-03",
      gender: "Man",
      race: "Black or African American",
      country: "US",
      linkedin: "https://www.linkedin.com/in/example-andre-walsh",
      resume: "https://example.com/resumes/andre-walsh.pdf",
      createdAt: "2026-05-18T15:00:00.000Z",
      status: "Active",
      suspendedAt: "",
    },
    {
      id: "DA-A-003",
      name: "Priya Nair",
      whatsapp: "+1 646 555 0194",
      sharing: 60,
      email: "priya.nair.desk@example.com",
      emailPassword: "Priya-mailbox-2208",
      accountPassword: "Priya-acct-2208",
      timezone: "UTC-5",
      chrome: "",
      anydesk: "220 845 661",
      anydeskPassword: "desk-priya-08",
      ultraviewerId: "220 118 904",
      ultraviewerPassword: "ultra-priya-33",
      trainerEmail: "priya.trainer@example.com",
      trainerPassword: "trainer-priya-40",
      bitwardenEmail: "priya.vault@example.com",
      bitwardenPassword: "vault-priya-16",
      phone: "+1 646 555 0194",
      address: "11 Madison Avenue, New York, NY",
      dob: "1998-01-27",
      gender: "Woman",
      race: "South Asian",
      country: "US",
      linkedin: "https://www.linkedin.com/in/example-priya-nair",
      resume: "https://example.com/resumes/priya-nair.pdf",
      createdAt: "2026-06-09T15:00:00.000Z",
      status: "Suspended (No projects)",
      suspendedAt,
    },
    {
      id: "DA-A-004",
      name: "Jonah Ellis",
      whatsapp: "+63 917 555 0142",
      sharing: 75,
      email: "jonah.ellis.desk@example.com",
      emailPassword: "Jonah-mailbox-9155",
      accountPassword: "Jonah-acct-9155",
      timezone: "UTC",
      chrome: "digitalaicrew01@gmail.com",
      anydesk: "915 443 207",
      anydeskPassword: "desk-jonah-31",
      ultraviewerId: "915 662 104",
      ultraviewerPassword: "ultra-jonah-28",
      trainerEmail: "jonah.trainer@example.com",
      trainerPassword: "trainer-jonah-07",
      bitwardenEmail: "jonah.vault@example.com",
      bitwardenPassword: "vault-jonah-61",
      phone: "+63 917 555 0142",
      address: "28th Street, Bonifacio Global City, Taguig",
      dob: "1997-08-19",
      gender: "Man",
      race: "White",
      country: "UK",
      linkedin: "https://www.linkedin.com/in/example-jonah-ellis",
      resume: "https://example.com/resumes/jonah-ellis.pdf",
      createdAt: "2026-07-01T15:00:00.000Z",
      status: "Active",
      suspendedAt: "",
    },
  ];

  const projects = [
    ["DA-P-001", "STEM explanation rubric", "Project", 2880, 1920, 2400, 1, 1, 30, 1],
    ["DA-P-002", "Code preference ranking", "Project", 4320, 2880, 3600, 1, 1, 45, 1],
    ["DA-P-003", "Safety conversation review", "Qualification", 1800, 1080, 1440, 1, 1, 20, 0],
    ["DA-P-004", "Multilingual short answers", "Survey", 1440, 960, 1200, 1, 1, 15, 0],
    ["DA-P-005", "Tool-use traces", "Qualification", 2400, 1200, 1800, 0, 0, null, 1],
    ["DA-P-006", "Document QA sweep", "Survey", 1200, 720, 960, 1, 1, 60, 1],
  ] as const;

  const workers = [
    { userId: "maya.chen", accountId: "DA-A-001" },
    { userId: "andre.walsh", accountId: "DA-A-002" },
    { userId: "priya.nair", accountId: "DA-A-003" },
    { userId: "jonah.ellis", accountId: "DA-A-004" },
  ];
  const projectIds = ["DA-P-001", "DA-P-002", "DA-P-003", "DA-P-004", "DA-P-005"];
  const rates: Record<string, number> = {
    "DA-P-001": 28,
    "DA-P-002": 32,
    "DA-P-003": 30,
    "DA-P-004": 22,
    "DA-P-005": 35,
    "DA-P-006": 24,
  };
  const hourCycle = [2, 3, 3.5, 4, 2.5, 1.5];
  const timezones: Record<string, string> = {
    "DA-A-001": "America/Los_Angeles",
    "DA-A-002": "America/Chicago",
    "DA-A-003": "America/New_York",
    "DA-A-004": "Asia/Manila",
  };
  const weeks = recentWeekKeys(12, now);

  db.exec("BEGIN");
  try {
    const insertUser = db.prepare(
      "INSERT INTO users (id, name, password_hash, signed_up_at, is_super_admin) VALUES (?, ?, ?, ?, ?)",
    );
    const insertRole = db.prepare(
      "INSERT INTO user_platform_roles (user_id, platform, role) VALUES (?, 'da', ?)",
    );
    for (const user of users) {
      const passwordHash = passwords.get(user.id);
      if (!passwordHash) throw new Error(`Missing seed password for ${user.id}`);
      insertUser.run(user.id, user.name, passwordHash, user.signedUpAt, user.superAdmin ? 1 : 0);
      if (user.daRole) insertRole.run(user.id, user.daRole);
    }

    const insertAccount = db.prepare(`
      INSERT INTO "DA_accounts" (
        id, name, whatsapp, sharing_percent, email, email_password, account_password, timezone, chrome_remote,
        anydesk_id, anydesk_password, ultraviewer_id, ultraviewer_password,
        trainer_email, trainer_password, bitwarden_email, bitwarden_password,
        phone, address, dob, gender, race, country, linkedin_url, resume_url,
        withdrawal_weekday, withdrawal_minutes, created_at, status, suspended_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const account of accounts) {
      insertAccount.run(
        account.id,
        account.name,
        account.whatsapp,
        account.sharing,
        account.email,
        account.emailPassword,
        account.accountPassword,
        account.timezone,
        account.chrome,
        account.anydesk,
        account.anydeskPassword,
        account.ultraviewerId,
        account.ultraviewerPassword,
        account.trainerEmail,
        account.trainerPassword,
        account.bitwardenEmail,
        account.bitwardenPassword,
        account.phone,
        account.address,
        account.dob,
        account.gender,
        account.race,
        account.country,
        account.linkedin,
        account.resume,
        4,
        defaultWithdrawalMinutes(account.timezone),
        account.createdAt,
        account.status,
        account.suspendedAt,
      );
    }

    const insertProject = db.prepare(`
      INSERT INTO "DA_projects" (
        id, name, kind, max_allowed_minutes, recommended_start_minutes, recommended_end_minutes,
        intend_to_work, auto_expire_enabled, auto_expire_minutes, can_pause
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const project of projects) insertProject.run(...project);

    const insertTask = db.prepare(`
      INSERT INTO "DA_tasks" (
        id, account_id, user_id, project_id, timezone, start_time, end_time,
        elapsed_hours, logged_hours, rate, earning, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let taskNumber = 0;
    weeks.forEach((week, weekIndex) => {
      const weeksAgo = weeks.length - 1 - weekIndex;
      workers.forEach((worker, workerIndex) => {
        if (worker.userId === "priya.nair" && weeksAgo < 3) return;
        if ((weekIndex + workerIndex) % 3 === 0) return;
        let projectId = projectIds[(weekIndex + workerIndex * 2) % projectIds.length];
        if (weeksAgo >= 4 && (weekIndex + workerIndex) % 5 === 0) projectId = "DA-P-006";
        const accountId = weeksAgo % 5 === 0 ? workers[(workerIndex + 1) % workers.length].accountId : worker.accountId;
        const logged = hourCycle[(weekIndex + workerIndex) % hourCycle.length];
        let status = weeksAgo === 0 ? "WIP" : "Completed";
        if (weeksAgo === 5 && worker.userId === "andre.walsh") status = "Exited";
        const elapsed = status === "WIP" ? null : status === "Exited" ? round2(logged + 0.4) : logged;
        const start = jstWallClockToIso(week, 1 + ((weekIndex + workerIndex) % 4), 10 + (workerIndex % 3));
        const end = elapsed == null ? "" : new Date(new Date(start).getTime() + elapsed * 3_600_000).toISOString();
        const rate = rates[projectId];
        taskNumber += 1;
        insertTask.run(
          `DA-T-${String(taskNumber).padStart(3, "0")}`,
          accountId,
          worker.userId,
          projectId,
          timezones[accountId],
          start,
          end,
          elapsed,
          logged,
          rate,
          status === "Exited" ? null : round2(logged * rate),
          status,
        );
      });
    });

    db.prepare("INSERT INTO sequences (name, value) VALUES ('DA-A', 4), ('DA-P', 6), ('DA-T', ?)").run(taskNumber);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getDb() {
  if (!globalForDb.__teamDb) {
    const db = openDatabase();
    globalForDb.__teamDb = db;
    try {
      seed(db);
    } catch (error) {
      globalForDb.__teamDb = undefined;
      db.close();
      throw error;
    }
  }
  const db = globalForDb.__teamDb;
  if (!db) throw new Error("Database failed to open");
  if (globalForDb.__teamDbVersion !== DB_VERSION) {
    migrateAccounts(db);
    migrateProjects(db);
    migrateCatalog(db);
    globalForDb.__teamDbVersion = DB_VERSION;
  }
  ensureTaskWithdrawalColumn(db);
  ensureWithdrawalSchedule(db);
  return db;
}

export function transaction<T>(run: () => T) {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = run();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function nextId(name: string) {
  const db = getDb();
  const row = db.prepare("SELECT value FROM sequences WHERE name = ?").get(name) as { value: number } | undefined;
  if (!row) throw new Error(`Unknown sequence ${name}`);
  const value = row.value + 1;
  db.prepare("UPDATE sequences SET value = ? WHERE name = ?").run(value, name);
  return `${name}-${String(value).padStart(3, "0")}`;
}
