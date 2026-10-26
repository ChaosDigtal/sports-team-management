import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./passwords";

const globalForDb = globalThis as unknown as { __teamDb?: DatabaseSync; __teamDbVersion?: number };
const DB_VERSION = 11;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  signed_up_at TEXT NOT NULL,
  is_super_admin INTEGER NOT NULL DEFAULT 0,
  da_onboarding INTEGER NOT NULL DEFAULT 0
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
  telegram TEXT NOT NULL DEFAULT '',
  sharing_percent REAL,
  email TEXT NOT NULL DEFAULT '',
  email_password TEXT NOT NULL DEFAULT '',
  email_forwarding INTEGER NOT NULL DEFAULT 0,
  account_password TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'UTC-8',
  chrome_remote TEXT NOT NULL DEFAULT '',
  anydesk_id TEXT NOT NULL DEFAULT '',
  anydesk_password TEXT NOT NULL DEFAULT '',
  ultraviewer_id TEXT NOT NULL DEFAULT '',
  ultraviewer_password TEXT NOT NULL DEFAULT '',
  trainer_email TEXT NOT NULL DEFAULT '',
  trainer_password TEXT NOT NULL DEFAULT '',
  ubuntu_password TEXT NOT NULL DEFAULT '',
  bitwarden_email TEXT NOT NULL DEFAULT '',
  bitwarden_password TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  dob TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  race TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  linkedin_email TEXT NOT NULL DEFAULT '',
  linkedin_password TEXT NOT NULL DEFAULT '',
  laptop_pin TEXT NOT NULL DEFAULT '',
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
  withdrawal_id TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  completed_at TEXT NOT NULL DEFAULT ''
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

CREATE TABLE IF NOT EXISTS "DA_candidates" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL DEFAULT '',
  telegram TEXT NOT NULL DEFAULT '',
  sharing_percent REAL,
  email TEXT NOT NULL DEFAULT '',
  email_password TEXT NOT NULL DEFAULT '',
  email_forwarding INTEGER NOT NULL DEFAULT 0,
  account_password TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'UTC-8',
  chrome_remote TEXT NOT NULL DEFAULT '',
  anydesk_id TEXT NOT NULL DEFAULT '',
  anydesk_password TEXT NOT NULL DEFAULT '',
  ultraviewer_id TEXT NOT NULL DEFAULT '',
  ultraviewer_password TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  dob TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  race TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  linkedin_email TEXT NOT NULL DEFAULT '',
  linkedin_password TEXT NOT NULL DEFAULT '',
  laptop_pin TEXT NOT NULL DEFAULT '',
  resume_url TEXT NOT NULL DEFAULT '',
  referral_link TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  laptop_status TEXT NOT NULL DEFAULT 'Offline',
  status TEXT NOT NULL DEFAULT 'Incomplete'
);

CREATE TABLE IF NOT EXISTS "DA_assessments" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL REFERENCES "DA_candidates"(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  task_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ready',
  stage TEXT NOT NULL DEFAULT '',
  stuck INTEGER NOT NULL DEFAULT 0,
  stuck_error TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_da_assessments_candidate ON "DA_assessments"(candidate_id);
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
    UPDATE "DA_accounts" SET weekly_target_hours = 40 WHERE weekly_target_hours IS NULL;
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

function ensureTaskCreatorColumn(db: DatabaseSync) {
  const names = new Set((db.prepare(`PRAGMA table_info("DA_tasks")`).all() as Array<{ name: string }>).map((row) => row.name));
  if (!names.has("created_by")) db.exec(`ALTER TABLE "DA_tasks" ADD COLUMN created_by TEXT NOT NULL DEFAULT ''`);
}

function ensureTaskCompletedAt(db: DatabaseSync) {
  const names = new Set((db.prepare(`PRAGMA table_info("DA_tasks")`).all() as Array<{ name: string }>).map((row) => row.name));
  if (!names.has("completed_at")) db.exec(`ALTER TABLE "DA_tasks" ADD COLUMN completed_at TEXT NOT NULL DEFAULT ''`);
  db.exec(`
    UPDATE "DA_tasks"
    SET completed_at = CASE WHEN end_time != '' THEN end_time ELSE start_time END
    WHERE status = 'Completed' AND completed_at = ''
  `);
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

function ensureOnboarding(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "DA_candidates" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      whatsapp TEXT NOT NULL DEFAULT '',
      telegram TEXT NOT NULL DEFAULT '',
      sharing_percent REAL,
      email TEXT NOT NULL DEFAULT '',
      email_password TEXT NOT NULL DEFAULT '',
      email_forwarding INTEGER NOT NULL DEFAULT 0,
      account_password TEXT NOT NULL DEFAULT '',
      timezone TEXT NOT NULL DEFAULT 'UTC-8',
      chrome_remote TEXT NOT NULL DEFAULT '',
      anydesk_id TEXT NOT NULL DEFAULT '',
      anydesk_password TEXT NOT NULL DEFAULT '',
      ultraviewer_id TEXT NOT NULL DEFAULT '',
      ultraviewer_password TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      dob TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT '',
      race TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      linkedin_url TEXT NOT NULL DEFAULT '',
      linkedin_email TEXT NOT NULL DEFAULT '',
      linkedin_password TEXT NOT NULL DEFAULT '',
      laptop_pin TEXT NOT NULL DEFAULT '',
      resume_url TEXT NOT NULL DEFAULT '',
      referral_link TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      laptop_status TEXT NOT NULL DEFAULT 'Offline',
      status TEXT NOT NULL DEFAULT 'Incomplete'
    );
    CREATE TABLE IF NOT EXISTS "DA_assessments" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL REFERENCES "DA_candidates"(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL DEFAULT '',
      end_time TEXT NOT NULL DEFAULT '',
      task_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Ready',
      stage TEXT NOT NULL DEFAULT '',
      stuck INTEGER NOT NULL DEFAULT 0,
      stuck_error TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS "DA_assessment_notifications" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      delivered INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_da_assessments_candidate ON "DA_assessments"(candidate_id);
    INSERT OR IGNORE INTO sequences (name, value) VALUES ('DA-C', 0);
  `);
  const columns = db.prepare(`PRAGMA table_info("DA_assessments")`).all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  if (!names.has("stuck")) db.exec(`ALTER TABLE "DA_assessments" ADD COLUMN stuck INTEGER NOT NULL DEFAULT 0`);
  if (!names.has("stuck_error")) db.exec(`ALTER TABLE "DA_assessments" ADD COLUMN stuck_error TEXT NOT NULL DEFAULT ''`);
  if (!names.has("password")) db.exec(`ALTER TABLE "DA_assessments" ADD COLUMN password TEXT NOT NULL DEFAULT ''`);
  if (!names.has("updated_at")) db.exec(`ALTER TABLE "DA_assessments" ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`);
  ensureOnboardingRole(db);
  const missingPasswords = db.prepare(`SELECT id FROM "DA_assessments" WHERE password = ''`).all() as Array<{ id: number }>;
  const setPassword = db.prepare(`UPDATE "DA_assessments" SET password = ? WHERE id = ?`);
  for (const row of missingPasswords) setPassword.run(assessmentPassword(), row.id);
  ensureAssessmentIdsStartAtOne(db);
}

function assessmentPassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*"];
  const alphabet = sets.join("");
  const chars = sets.map((set) => set[randomInt(set.length)]);
  while (chars.length < 20) chars.push(alphabet[randomInt(alphabet.length)]);
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    const current = chars[index];
    chars[index] = chars[swap];
    chars[swap] = current;
  }
  return chars.join("");
}

function ensureOnboardingRole(db: DatabaseSync) {
  const columns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === "da_onboarding")) return;
  db.exec(`ALTER TABLE users ADD COLUMN da_onboarding INTEGER NOT NULL DEFAULT 0`);
  db.exec(`UPDATE users SET da_onboarding = 1 WHERE is_super_admin = 1`);
}

function ensureAssessmentIdsStartAtOne(db: DatabaseSync) {
  const stats = db.prepare(`SELECT COUNT(*) AS count, MIN(id) AS minId FROM "DA_assessments"`).get() as { count: number; minId: number | null };
  if (stats.count === 0) {
    db.prepare(`DELETE FROM sqlite_sequence WHERE name = 'DA_assessments'`).run();
    return;
  }
  if (stats.minId === 1) return;
  const ids = db.prepare(`SELECT id FROM "DA_assessments" ORDER BY id`).all() as Array<{ id: number }>;
  const move = db.prepare(`UPDATE "DA_assessments" SET id = ? WHERE id = ?`);
  for (const row of ids) move.run(-row.id, row.id);
  ids.forEach((row, index) => move.run(index + 1, -row.id));
  const seq = ids.length;
  const updated = db.prepare(`UPDATE sqlite_sequence SET seq = ? WHERE name = 'DA_assessments'`).run(seq);
  if (updated.changes === 0) db.prepare(`INSERT INTO sqlite_sequence (name, seq) VALUES ('DA_assessments', ?)`).run(seq);
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

function seed(db: DatabaseSync) {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (existing.n > 0) return;
  db.prepare(
    "INSERT INTO users (id, name, password_hash, signed_up_at, is_super_admin, da_onboarding) VALUES (?, ?, ?, ?, 1, 1)",
  ).run("200k+", "200k+", hashPassword("iimpossible"), new Date().toISOString());
  db.prepare("INSERT INTO sequences (name, value) VALUES ('DA-A', 0), ('DA-P', 0), ('DA-T', 0), ('DA-W', 0), ('DA-C', 0)").run();
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
  if (readSchemaVersion(db) < DB_VERSION) {
    migrateAccounts(db);
    migrateProjects(db);
    migrateCatalog(db);
    writeSchemaVersion(db, DB_VERSION);
  }
  globalForDb.__teamDbVersion = DB_VERSION;
  ensureTaskWithdrawalColumn(db);
  ensureTaskCreatorColumn(db);
  ensureTaskCompletedAt(db);
  ensureWithdrawalSchedule(db);
  ensureOnboarding(db);
  ensureTelegram(db);
  ensureEmailForwarding(db);
  ensureCandidateWorkflow(db);
  ensureProfileCredentials(db);
  return db;
}

function readSchemaVersion(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const row = db.prepare(`SELECT value FROM schema_meta WHERE key = 'version'`).get() as { value: string } | undefined;
  const version = Number(row?.value ?? 0);
  return Number.isFinite(version) ? version : 0;
}

function writeSchemaVersion(db: DatabaseSync, version: number) {
  db.prepare(`INSERT INTO schema_meta (key, value) VALUES ('version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(String(version));
}

function ensureTelegram(db: DatabaseSync) {
  for (const table of ["DA_accounts", "DA_candidates"]) {
    const names = new Set((db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>).map((row) => row.name));
    if (!names.has("telegram")) db.exec(`ALTER TABLE "${table}" ADD COLUMN telegram TEXT NOT NULL DEFAULT ''`);
  }
}

function ensureCandidateWorkflow(db: DatabaseSync) {
  const names = new Set((db.prepare(`PRAGMA table_info("DA_candidates")`).all() as Array<{ name: string }>).map((row) => row.name));
  if (!names.has("laptop_status")) db.exec(`ALTER TABLE "DA_candidates" ADD COLUMN laptop_status TEXT NOT NULL DEFAULT 'Offline'`);
  db.exec(`UPDATE "DA_candidates" SET status = 'Incomplete' WHERE status = 'Pending'`);
}

function ensureProfileCredentials(db: DatabaseSync) {
  const columns: Array<[string, string]> = [
    ["linkedin_email", "linkedin_email TEXT NOT NULL DEFAULT ''"],
    ["linkedin_password", "linkedin_password TEXT NOT NULL DEFAULT ''"],
    ["laptop_pin", "laptop_pin TEXT NOT NULL DEFAULT ''"],
  ];
  for (const table of ["DA_accounts", "DA_candidates"]) {
    const names = new Set((db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>).map((row) => row.name));
    for (const [name, definition] of columns) {
      if (!names.has(name)) db.exec(`ALTER TABLE "${table}" ADD COLUMN ${definition}`);
    }
  }
  const accounts = new Set((db.prepare(`PRAGMA table_info("DA_accounts")`).all() as Array<{ name: string }>).map((row) => row.name));
  if (!accounts.has("ubuntu_password")) db.exec(`ALTER TABLE "DA_accounts" ADD COLUMN ubuntu_password TEXT NOT NULL DEFAULT ''`);
  const candidates = new Set((db.prepare(`PRAGMA table_info("DA_candidates")`).all() as Array<{ name: string }>).map((row) => row.name));
  if (!candidates.has("referral_link")) db.exec(`ALTER TABLE "DA_candidates" ADD COLUMN referral_link TEXT NOT NULL DEFAULT ''`);
}

function ensureEmailForwarding(db: DatabaseSync) {
  for (const table of ["DA_accounts", "DA_candidates"]) {
    const names = new Set((db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>).map((row) => row.name));
    if (!names.has("email_forwarding")) db.exec(`ALTER TABLE "${table}" ADD COLUMN email_forwarding INTEGER NOT NULL DEFAULT 0`);
  }
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
