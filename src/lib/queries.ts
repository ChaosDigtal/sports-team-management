import { getDb, nextId, transaction } from "./db";
import { round2 } from "./format";
import { accountPayouts, payoutCutoff } from "./stats";
import { defaultWithdrawalMinutes, weekBounds, weekStartKey } from "./time";
import type {
  Account,
  AccountRow,
  AccountStatus,
  DirectoryUser,
  PlatformId,
  PlatformRole,
  Project,
  ProjectKind,
  ProjectRow,
  SessionUser,
  Task,
  TaskStatus,
  Withdrawal,
  WithdrawalStatus,
  WorkLink,
} from "./types";

type Row = Record<string, unknown>;

function num(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function num0(value: unknown) {
  return num(value) ?? 0;
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function bit(value: unknown) {
  return Number(value) === 1;
}

function mapUser(row: Row, roles: Partial<Record<PlatformId, PlatformRole>>): SessionUser {
  return {
    id: text(row.id),
    name: text(row.name),
    signedUpAt: text(row.signed_up_at),
    isSuperAdmin: bit(row.is_super_admin),
    roles,
  };
}

function loadRoles(userId: string) {
  const db = getDb();
  const rows = db.prepare("SELECT platform, role FROM user_platform_roles WHERE user_id = ?").all(userId) as Row[];
  const roles: Partial<Record<PlatformId, PlatformRole>> = {};
  for (const row of rows) {
    const platform = text(row.platform);
    const role = text(row.role);
    if ((platform === "da" || platform === "handshake" || platform === "snorkel") && (role === "platform_admin" || role === "member")) {
      roles[platform] = role;
    }
  }
  return roles;
}

export function getSessionUser(id: string): SessionUser | null {
  const row = getDb().prepare("SELECT id, name, signed_up_at, is_super_admin FROM users WHERE id = ?").get(id) as Row | undefined;
  if (!row) return null;
  return mapUser(row, loadRoles(id));
}

export function getUserAuth(id: string) {
  const row = getDb().prepare("SELECT id, password_hash FROM users WHERE id = ?").get(id) as Row | undefined;
  if (!row) return null;
  return { id: text(row.id), passwordHash: text(row.password_hash) };
}

export function countSuperAdmins() {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE is_super_admin = 1").get() as Row;
  return num0(row.n);
}

export function listUsers(filters: { q?: string; accountId?: string; projectId?: string }): DirectoryUser[] {
  const q = (filters.q ?? "").replace(/[%_]/g, "");
  const rows = getDb()
    .prepare(
      `
      SELECT u.*,
        (SELECT COUNT(DISTINCT account_id) FROM "DA_tasks" t WHERE t.user_id = u.id) AS account_count,
        (SELECT COUNT(DISTINCT project_id) FROM "DA_tasks" t WHERE t.user_id = u.id) AS project_count
      FROM users u
      WHERE (? = '' OR u.name LIKE ? OR u.id LIKE ?)
        AND (? = '' OR EXISTS (SELECT 1 FROM "DA_tasks" t WHERE t.user_id = u.id AND t.account_id = ?))
        AND (? = '' OR EXISTS (SELECT 1 FROM "DA_tasks" t WHERE t.user_id = u.id AND t.project_id = ?))
      ORDER BY u.name COLLATE NOCASE
    `,
    )
    .all(q, `%${q}%`, `%${q}%`, filters.accountId ?? "", filters.accountId ?? "", filters.projectId ?? "", filters.projectId ?? "") as Row[];

  return rows.map((row) => ({
    ...mapUser(row, loadRoles(text(row.id))),
    accountCount: num0(row.account_count),
    projectCount: num0(row.project_count),
  }));
}

export function userHasTasks(userId: string) {
  const row = getDb().prepare(`SELECT COUNT(*) AS n FROM "DA_tasks" WHERE user_id = ?`).get(userId) as Row;
  return num0(row.n) > 0;
}

export function createUser(input: {
  id: string;
  name: string;
  passwordHash: string;
  isSuperAdmin: boolean;
  daRole: PlatformRole | null;
  signedUpAt: string;
}) {
  transaction(() => {
    const db = getDb();
    db.prepare("INSERT INTO users (id, name, password_hash, signed_up_at, is_super_admin) VALUES (?, ?, ?, ?, ?)").run(
      input.id,
      input.name,
      input.passwordHash,
      input.signedUpAt,
      input.isSuperAdmin ? 1 : 0,
    );
    if (input.daRole) {
      db.prepare("INSERT INTO user_platform_roles (user_id, platform, role) VALUES (?, 'da', ?)").run(input.id, input.daRole);
    }
  });
}

export function updateUser(input: {
  id: string;
  name: string;
  passwordHash?: string;
  isSuperAdmin: boolean;
  daRole: PlatformRole | null;
}) {
  transaction(() => {
    const db = getDb();
    if (input.passwordHash) {
      db.prepare("UPDATE users SET name = ?, is_super_admin = ?, password_hash = ? WHERE id = ?").run(
        input.name,
        input.isSuperAdmin ? 1 : 0,
        input.passwordHash,
        input.id,
      );
    } else {
      db.prepare("UPDATE users SET name = ?, is_super_admin = ? WHERE id = ?").run(input.name, input.isSuperAdmin ? 1 : 0, input.id);
    }
    db.prepare("DELETE FROM user_platform_roles WHERE user_id = ? AND platform = 'da'").run(input.id);
    if (input.daRole) {
      db.prepare("INSERT INTO user_platform_roles (user_id, platform, role) VALUES (?, 'da', ?)").run(input.id, input.daRole);
    }
  });
}

export function deleteUser(id: string) {
  if (userHasTasks(id)) return { ok: false as const };
  transaction(() => {
    const db = getDb();
    db.prepare("DELETE FROM user_platform_roles WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });
  return { ok: true as const };
}

function mapAccount(row: Row): Account {
  return {
    id: text(row.id),
    name: text(row.name),
    whatsapp: text(row.whatsapp),
    sharingPercent: num(row.sharing_percent),
    email: text(row.email),
    emailPassword: text(row.email_password),
    accountPassword: text(row.account_password),
    timezone: text(row.timezone),
    chromeRemote: text(row.chrome_remote),
    anydeskId: text(row.anydesk_id),
    anydeskPassword: text(row.anydesk_password),
    ultraviewerId: text(row.ultraviewer_id),
    ultraviewerPassword: text(row.ultraviewer_password),
    trainerEmail: text(row.trainer_email),
    trainerPassword: text(row.trainer_password),
    bitwardenEmail: text(row.bitwarden_email),
    bitwardenPassword: text(row.bitwarden_password),
    phone: text(row.phone),
    address: text(row.address),
    dob: text(row.dob),
    gender: text(row.gender),
    race: text(row.race),
    country: text(row.country),
    weeklyTargetHours: num(row.weekly_target_hours),
    withdrawalWeekday: integerIn(row.withdrawal_weekday, 0, 6, 4),
    withdrawalMinutes: integerIn(row.withdrawal_minutes, 0, 1439, defaultWithdrawalMinutes(text(row.timezone))),
    linkedinUrl: text(row.linkedin_url),
    resumeUrl: text(row.resume_url),
    createdAt: text(row.created_at),
    status: text(row.status) as AccountStatus,
    suspendedAt: text(row.suspended_at),
  };
}

function integerIn(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function accountScope(scopeUserId?: string) {
  return scopeUserId ? "AND t.user_id = ?" : "";
}

const ACCOUNT_SEARCH_COLUMNS = [
  "a.id",
  "a.name",
  "a.whatsapp",
  "a.email",
  "a.email_password",
  "a.account_password",
  "a.timezone",
  "a.chrome_remote",
  "a.anydesk_id",
  "a.anydesk_password",
  "a.ultraviewer_id",
  "a.ultraviewer_password",
  "a.trainer_email",
  "a.trainer_password",
  "a.bitwarden_email",
  "a.bitwarden_password",
  "a.phone",
  "a.address",
  "a.dob",
  "a.gender",
  "a.race",
  "a.country",
  "a.linkedin_url",
  "a.resume_url",
  "a.status",
  "CAST(a.sharing_percent AS TEXT)",
];

export function listAccounts(
  scopeUserId?: string,
  filters?: { status?: string; country?: string; q?: string },
): AccountRow[] {
  const scope = accountScope(scopeUserId);
  const where: string[] = [];
  const params: string[] = [];
  if (scopeUserId) params.push(scopeUserId, scopeUserId);
  if (scopeUserId) {
    where.push(`EXISTS (SELECT 1 FROM "DA_tasks" t WHERE t.account_id = a.id AND t.user_id = ?)`);
    params.push(scopeUserId);
  }
  if (filters?.status) {
    where.push("a.status = ?");
    params.push(filters.status);
  }
  if (filters?.country) {
    where.push("a.country = ?");
    params.push(filters.country);
  }
  const q = (filters?.q ?? "").replace(/[%_]/g, "").trim();
  if (q) {
    const columns = scopeUserId ? ACCOUNT_SEARCH_COLUMNS.filter((column) => column !== "CAST(a.sharing_percent AS TEXT)") : ACCOUNT_SEARCH_COLUMNS;
    where.push(`(${columns.map((column) => `${column} LIKE ?`).join(" OR ")})`);
    const like = `%${q}%`;
    for (let index = 0; index < columns.length; index += 1) params.push(like);
  }
  const rows = getDb()
    .prepare(
      `
      SELECT a.*,
        COALESCE((SELECT SUM(CASE WHEN t.status = 'Exited' THEN 0 ELSE t.earning END) FROM "DA_tasks" t WHERE t.account_id = a.id ${scope}), 0) AS earnings,
        COALESCE((SELECT SUM(logged_hours) FROM "DA_tasks" t WHERE t.account_id = a.id ${scope}), 0) AS hours
      FROM "DA_accounts" a
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY a.name COLLATE NOCASE
    `,
    )
    .all(...params) as Row[];
  const week = weekHoursByAccount(scopeUserId);
  return rows.map((row) => {
    const id = text(row.id);
    const hours = week.get(id);
    return {
      ...mapAccount(row),
      earnings: num0(row.earnings),
      hours: num0(row.hours),
      weekProjectHours: hours?.Project ?? 0,
      weekQualificationHours: hours?.Qualification ?? 0,
      weekSurveyHours: hours?.Survey ?? 0,
    };
  });
}

function weekHoursByAccount(scopeUserId?: string) {
  const bounds = weekBounds(weekStartKey(new Date()));
  const params: string[] = [bounds.start.toISOString(), bounds.end.toISOString()];
  if (scopeUserId) params.push(scopeUserId);
  const rows = getDb()
    .prepare(
      `
      SELECT t.account_id AS account_id,
        CASE p.kind WHEN 'Survey' THEN 'Survey' WHEN 'Qualification' THEN 'Qualification' ELSE 'Project' END AS kind,
        COALESCE(SUM(t.logged_hours), 0) AS hours
      FROM "DA_tasks" t
      JOIN "DA_projects" p ON p.id = t.project_id
      WHERE t.start_time >= ? AND t.start_time <= ?
      ${scopeUserId ? "AND t.user_id = ?" : ""}
      GROUP BY t.account_id, kind
    `,
    )
    .all(...params) as Row[];
  const totals = new Map<string, Record<ProjectKind, number>>();
  for (const row of rows) {
    const id = text(row.account_id);
    const kind = text(row.kind) as ProjectKind;
    const current = totals.get(id) ?? { Project: 0, Survey: 0, Qualification: 0 };
    current[kind] = num0(row.hours);
    totals.set(id, current);
  }
  return totals;
}

export function getAccount(id: string) {
  const row = getDb().prepare(`SELECT * FROM "DA_accounts" WHERE id = ?`).get(id) as Row | undefined;
  return row ? mapAccount(row) : null;
}

export function userWorksOnAccount(userId: string, accountId: string) {
  const row = getDb().prepare(`SELECT 1 AS ok FROM "DA_tasks" WHERE user_id = ? AND account_id = ? LIMIT 1`).get(userId, accountId) as Row | undefined;
  return Boolean(row);
}

export type AccountInput = Omit<Account, "id" | "createdAt">;

export function createAccount(input: AccountInput, createdAt: string) {
  return transaction(() => {
    const id = nextId("DA-A");
    getDb()
      .prepare(
        `
        INSERT INTO "DA_accounts" (
          id, name, whatsapp, sharing_percent, email, email_password, account_password, timezone, chrome_remote,
          anydesk_id, anydesk_password, ultraviewer_id, ultraviewer_password,
          trainer_email, trainer_password, bitwarden_email, bitwarden_password,
          phone, address, dob, gender, race, country, linkedin_url, resume_url, weekly_target_hours,
          withdrawal_weekday, withdrawal_minutes, created_at, status, suspended_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        id,
        input.name,
        input.whatsapp,
        input.sharingPercent,
        input.email,
        input.emailPassword,
        input.accountPassword,
        input.timezone,
        input.chromeRemote,
        input.anydeskId,
        input.anydeskPassword,
        input.ultraviewerId,
        input.ultraviewerPassword,
        input.trainerEmail,
        input.trainerPassword,
        input.bitwardenEmail,
        input.bitwardenPassword,
        input.phone,
        input.address,
        input.dob,
        input.gender,
        input.race,
        input.country,
        input.linkedinUrl,
        input.resumeUrl,
        input.weeklyTargetHours,
        input.withdrawalWeekday,
        input.withdrawalMinutes,
        createdAt,
        input.status,
        input.suspendedAt,
      );
    return id;
  });
}

export function updateAccount(id: string, input: AccountInput) {
  getDb()
    .prepare(
      `
      UPDATE "DA_accounts" SET
        name = ?, whatsapp = ?, sharing_percent = ?, email = ?, email_password = ?, account_password = ?, timezone = ?,
        chrome_remote = ?, anydesk_id = ?, anydesk_password = ?, ultraviewer_id = ?, ultraviewer_password = ?,
        trainer_email = ?, trainer_password = ?, bitwarden_email = ?, bitwarden_password = ?,
        phone = ?, address = ?, dob = ?, gender = ?, race = ?, country = ?, linkedin_url = ?, resume_url = ?,
        weekly_target_hours = ?, withdrawal_weekday = ?, withdrawal_minutes = ?, status = ?, suspended_at = ?
      WHERE id = ?
    `,
    )
    .run(
      input.name,
      input.whatsapp,
      input.sharingPercent,
      input.email,
      input.emailPassword,
      input.accountPassword,
      input.timezone,
      input.chromeRemote,
      input.anydeskId,
      input.anydeskPassword,
      input.ultraviewerId,
      input.ultraviewerPassword,
      input.trainerEmail,
      input.trainerPassword,
      input.bitwardenEmail,
      input.bitwardenPassword,
      input.phone,
      input.address,
      input.dob,
      input.gender,
      input.race,
      input.country,
      input.linkedinUrl,
      input.resumeUrl,
      input.weeklyTargetHours,
      input.withdrawalWeekday,
      input.withdrawalMinutes,
      input.status,
      input.suspendedAt,
      id,
    );
}

export function deleteAccount(id: string) {
  const tasks = getDb().prepare(`SELECT COUNT(*) AS n FROM "DA_tasks" WHERE account_id = ?`).get(id) as Row;
  const withdrawals = getDb().prepare(`SELECT COUNT(*) AS n FROM "DA_withdrawals" WHERE account_id = ?`).get(id) as Row;
  if (num0(tasks.n) > 0 || num0(withdrawals.n) > 0) return { ok: false as const };
  getDb().prepare(`DELETE FROM "DA_accounts" WHERE id = ?`).run(id);
  return { ok: true as const };
}

function mapProject(row: Row): Project {
  return {
    id: text(row.id),
    name: text(row.name),
    kind: text(row.kind) === "Survey" || text(row.kind) === "Qualification" ? (text(row.kind) as ProjectKind) : "Project",
    maxAllowedMinutes: num(row.max_allowed_minutes),
    recommendedStartMinutes: num(row.recommended_start_minutes),
    recommendedEndMinutes: num(row.recommended_end_minutes),
    autoExpireEnabled: bit(row.auto_expire_enabled),
    autoExpireMinutes: num(row.auto_expire_minutes),
    intendToWork: bit(row.intend_to_work),
    canPause: bit(row.can_pause),
  };
}

export function listProjects(
  scopeUserId?: string,
  options?: { kind?: string; q?: string; sort?: "name" | "max"; dir?: "asc" | "desc" },
): ProjectRow[] {
  const scope = accountScope(scopeUserId);
  const params: string[] = [];
  if (scopeUserId) params.push(scopeUserId, scopeUserId);
  const where: string[] = [];
  if (scopeUserId) {
    where.push(`EXISTS (SELECT 1 FROM "DA_tasks" t WHERE t.project_id = p.id AND t.user_id = ?)`);
    params.push(scopeUserId);
  }
  if (options?.kind) {
    where.push("p.kind = ?");
    params.push(options.kind);
  }
  const q = (options?.q ?? "").replace(/[%_]/g, "").trim();
  if (q) {
    where.push("p.name LIKE ?");
    params.push(`%${q}%`);
  }
  const dir = options?.dir === "desc" ? "DESC" : "ASC";
  const order =
    options?.sort === "max"
      ? `p.max_allowed_minutes IS NULL, p.max_allowed_minutes ${dir}`
      : `p.name COLLATE NOCASE ${dir}`;
  const rows = getDb()
    .prepare(
      `
      SELECT p.*,
        COALESCE((SELECT SUM(logged_hours) FROM "DA_tasks" t WHERE t.project_id = p.id ${scope}), 0) AS logged_hours,
        COALESCE((SELECT SUM(CASE WHEN t.status = 'Exited' THEN 0 ELSE t.earning END) FROM "DA_tasks" t WHERE t.project_id = p.id ${scope}), 0) AS earnings
      FROM "DA_projects" p
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY ${order}
    `,
    )
    .all(...params) as Row[];
  return rows.map((row) => {
    const project = mapProject(row);
    return {
      ...project,
      loggedHours: num0(row.logged_hours),
      earnings: num0(row.earnings),
    };
  });
}

export function getProject(id: string, scopeUserId?: string) {
  return listProjects(scopeUserId).find((project) => project.id === id) ?? null;
}

export function getProjectRecord(id: string) {
  const row = getDb().prepare(`SELECT * FROM "DA_projects" WHERE id = ?`).get(id) as Row | undefined;
  return row ? mapProject(row) : null;
}

export function userWorksOnProject(userId: string, projectId: string) {
  const row = getDb().prepare(`SELECT 1 AS ok FROM "DA_tasks" WHERE user_id = ? AND project_id = ? LIMIT 1`).get(userId, projectId) as Row | undefined;
  return Boolean(row);
}

export type ProjectInput = Omit<Project, "id">;

export function createProject(input: ProjectInput) {
  return transaction(() => {
    const id = nextId("DA-P");
    getDb()
      .prepare(
        `INSERT INTO "DA_projects" (
          id, name, kind, max_allowed_minutes, recommended_start_minutes, recommended_end_minutes,
          auto_expire_enabled, auto_expire_minutes, intend_to_work, can_pause
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.name,
        input.kind,
        input.maxAllowedMinutes,
        input.recommendedStartMinutes,
        input.recommendedEndMinutes,
        input.autoExpireEnabled ? 1 : 0,
        input.autoExpireMinutes,
        input.intendToWork ? 1 : 0,
        input.canPause ? 1 : 0,
      );
    return id;
  });
}

export function updateProject(id: string, input: ProjectInput) {
  getDb()
    .prepare(
      `UPDATE "DA_projects" SET
        name = ?, kind = ?, max_allowed_minutes = ?, recommended_start_minutes = ?, recommended_end_minutes = ?,
        auto_expire_enabled = ?, auto_expire_minutes = ?, intend_to_work = ?, can_pause = ?
      WHERE id = ?`,
    )
    .run(
      input.name,
      input.kind,
      input.maxAllowedMinutes,
      input.recommendedStartMinutes,
      input.recommendedEndMinutes,
      input.autoExpireEnabled ? 1 : 0,
      input.autoExpireMinutes,
      input.intendToWork ? 1 : 0,
      input.canPause ? 1 : 0,
      id,
    );
}

export function deleteProject(id: string) {
  const row = getDb().prepare(`SELECT COUNT(*) AS n FROM "DA_tasks" WHERE project_id = ?`).get(id) as Row;
  if (num0(row.n) > 0) return { ok: false as const };
  getDb().prepare(`DELETE FROM "DA_projects" WHERE id = ?`).run(id);
  return { ok: true as const };
}

const TASK_SELECT = `
  SELECT t.*, a.name AS account_name, a.timezone AS account_timezone, u.name AS user_name, p.name AS project_name,
    p.max_allowed_minutes AS max_allowed_minutes, p.can_pause AS can_pause, p.intend_to_work AS intend_to_work,
    p.auto_expire_enabled AS auto_expire_enabled, p.auto_expire_minutes AS auto_expire_minutes
  FROM "DA_tasks" t
  JOIN "DA_accounts" a ON a.id = t.account_id
  JOIN users u ON u.id = t.user_id
  JOIN "DA_projects" p ON p.id = t.project_id
`;

function mapTask(row: Row): Task {
  return {
    id: text(row.id),
    accountId: text(row.account_id),
    userId: text(row.user_id),
    projectId: text(row.project_id),
    timezone: text(row.timezone),
    startTime: text(row.start_time),
    endTime: text(row.end_time),
    elapsedHours: num(row.elapsed_hours),
    loggedHours: num(row.logged_hours),
    rate: num(row.rate),
    earning: num(row.earning),
    status: text(row.status) as TaskStatus,
    accountName: text(row.account_name),
    accountTimezone: text(row.account_timezone),
    userName: text(row.user_name),
    projectName: text(row.project_name),
    maxAllowedMinutes: num(row.max_allowed_minutes),
    canPause: bit(row.can_pause),
    intendToWork: bit(row.intend_to_work),
    autoExpireEnabled: bit(row.auto_expire_enabled),
    autoExpireMinutes: num(row.auto_expire_minutes),
    payoutStatus: payoutStatus(row),
  };
}

function payoutStatus(row: Row): Task["payoutStatus"] {
  if (text(row.status) !== "Completed") return "";
  if (text(row.withdrawal_id)) return "Paid";
  const end = text(row.end_time);
  if (!end || new Date(end).getTime() > new Date(payoutCutoff()).getTime()) return "Pending";
  return "Available";
}

export function listTasks(filters: {
  accountId?: string;
  projectId?: string;
  userId?: string;
  status?: string;
  q?: string;
  limit?: number;
  sort?: "id" | "started" | "ended" | "earnings" | "rate";
  dir?: "asc" | "desc";
}) {
  const where: string[] = [];
  const params: string[] = [];
  if (filters.accountId) {
    where.push("t.account_id = ?");
    params.push(filters.accountId);
  }
  if (filters.projectId) {
    where.push("t.project_id = ?");
    params.push(filters.projectId);
  }
  if (filters.userId) {
    where.push("t.user_id = ?");
    params.push(filters.userId);
  }
  if (filters.status) {
    where.push("t.status = ?");
    params.push(filters.status);
  }
  const q = (filters.q ?? "").replace(/[%_]/g, "");
  if (q) {
    where.push("(t.id LIKE ? OR a.name LIKE ? OR u.name LIKE ? OR p.name LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const limit = filters.limit ?? 300;
  const dir = filters.dir === "asc" ? "ASC" : "DESC";
  const orderBy =
    filters.sort === "id"
      ? `t.id ${dir}`
      : filters.sort === "ended"
        ? `t.end_time ${dir}, t.id DESC`
        : filters.sort === "earnings"
          ? `CASE WHEN t.status = 'Exited' THEN NULL ELSE t.earning END ${dir}, t.id DESC`
          : filters.sort === "rate"
            ? `t.rate ${dir}, t.id DESC`
            : filters.sort === "started"
              ? `t.start_time ${dir}, t.id DESC`
              : "t.start_time DESC, t.id DESC";
  const rows = getDb()
    .prepare(`${TASK_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${orderBy} LIMIT ?`)
    .all(...params, limit) as Row[];
  return rows.map(mapTask);
}

export function accountHasUnpausableWip(accountId: string) {
  const row = getDb()
    .prepare(
      `
      SELECT 1 AS ok FROM "DA_tasks" t
      JOIN "DA_projects" p ON p.id = t.project_id
      WHERE t.account_id = ? AND t.status = 'WIP' AND p.can_pause = 0
      LIMIT 1
    `,
    )
    .get(accountId) as Row | undefined;
  return Boolean(row);
}

export function getTask(id: string) {
  const row = getDb().prepare(`${TASK_SELECT} WHERE t.id = ?`).get(id) as Row | undefined;
  return row ? mapTask(row) : null;
}

export type TaskInput = {
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
};

export function createTask(input: TaskInput) {
  return transaction(() => {
    const id = nextId("DA-T");
    getDb()
      .prepare(
        `
        INSERT INTO "DA_tasks" (
          id, account_id, user_id, project_id, timezone, start_time, end_time,
          elapsed_hours, logged_hours, rate, earning, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        id,
        input.accountId,
        input.userId,
        input.projectId,
        input.timezone,
        input.startTime,
        input.endTime,
        input.elapsedHours,
        input.loggedHours,
        input.rate,
        input.earning,
        input.status,
      );
    return id;
  });
}

export function updateTask(id: string, input: TaskInput) {
  getDb()
    .prepare(
      `
      UPDATE "DA_tasks" SET
        account_id = ?, user_id = ?, project_id = ?, timezone = ?, start_time = ?, end_time = ?,
        elapsed_hours = ?, logged_hours = ?, rate = ?, earning = ?, status = ?
      WHERE id = ?
    `,
    )
    .run(
      input.accountId,
      input.userId,
      input.projectId,
      input.timezone,
      input.startTime,
      input.endTime,
      input.elapsedHours,
      input.loggedHours,
      input.rate,
      input.earning,
      input.status,
      id,
    );
}

export function deleteTask(id: string) {
  getDb().prepare(`DELETE FROM "DA_tasks" WHERE id = ?`).run(id);
}

export function listPeopleOptions() {
  const rows = getDb()
    .prepare(
      `
      SELECT u.id, u.name FROM users u
      WHERE EXISTS (SELECT 1 FROM user_platform_roles r WHERE r.user_id = u.id AND r.platform = 'da')
         OR EXISTS (SELECT 1 FROM "DA_tasks" t WHERE t.user_id = u.id)
      ORDER BY u.name COLLATE NOCASE
    `,
    )
    .all() as Row[];
  return rows.map((row) => ({ id: text(row.id), name: text(row.name) }));
}

export function listAccountOptions() {
  const rows = getDb().prepare(`SELECT id, name, timezone FROM "DA_accounts" ORDER BY name COLLATE NOCASE`).all() as Row[];
  return rows.map((row) => ({ id: text(row.id), name: text(row.name), timezone: text(row.timezone) }));
}

export function listProjectOptions() {
  const rows = getDb().prepare(`SELECT id, name FROM "DA_projects" ORDER BY name COLLATE NOCASE`).all() as Row[];
  return rows.map((row) => ({ id: text(row.id), name: text(row.name) }));
}

function workLinks(sql: string, userId: string): WorkLink[] {
  const rows = getDb().prepare(sql).all(userId) as Row[];
  return rows.map((row) => ({
    id: text(row.id),
    name: text(row.name),
    earnings: num0(row.earnings),
    hours: num0(row.hours),
  }));
}

export function accountsWorked(userId: string) {
  return workLinks(
    `
      SELECT a.id, a.name, COALESCE(SUM(t.earning), 0) AS earnings, COALESCE(SUM(t.logged_hours), 0) AS hours
      FROM "DA_tasks" t
      JOIN "DA_accounts" a ON a.id = t.account_id
      WHERE t.user_id = ?
      GROUP BY a.id
      ORDER BY earnings DESC, a.name COLLATE NOCASE
    `,
    userId,
  );
}

export function projectsWorked(userId: string) {
  return workLinks(
    `
      SELECT p.id, p.name, COALESCE(SUM(t.earning), 0) AS earnings, COALESCE(SUM(t.logged_hours), 0) AS hours
      FROM "DA_tasks" t
      JOIN "DA_projects" p ON p.id = t.project_id
      WHERE t.user_id = ?
      GROUP BY p.id
      ORDER BY earnings DESC, p.name COLLATE NOCASE
    `,
    userId,
  );
}

export function countActiveAccounts(scopeUserId?: string) {
  if (!scopeUserId) {
    const row = getDb().prepare(`SELECT COUNT(*) AS n FROM "DA_accounts" WHERE status = 'Active'`).get() as Row;
    return num0(row.n);
  }
  const row = getDb()
    .prepare(
      `
      SELECT COUNT(DISTINCT a.id) AS n
      FROM "DA_accounts" a
      JOIN "DA_tasks" t ON t.account_id = a.id
      WHERE t.user_id = ? AND a.status = 'Active'
    `,
    )
    .get(scopeUserId) as Row;
  return num0(row.n);
}

export function listWithdrawals(filters: { accountId?: string; status?: string; from?: string; to?: string }) {
  const where: string[] = [];
  const params: string[] = [];
  if (filters.accountId) {
    where.push("w.account_id = ?");
    params.push(filters.accountId);
  }
  if (filters.status) {
    where.push("w.status = ?");
    params.push(filters.status);
  }
  if (filters.from) {
    where.push("substr(w.withdrawn_at, 1, 10) >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    where.push("substr(w.withdrawn_at, 1, 10) <= ?");
    params.push(filters.to);
  }
  const rows = getDb()
    .prepare(
      `
      SELECT w.*, a.name AS account_name
      FROM "DA_withdrawals" w
      JOIN "DA_accounts" a ON a.id = w.account_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY w.withdrawn_at DESC, w.id DESC
    `,
    )
    .all(...params) as Row[];
  return rows.map(mapWithdrawal);
}

export function withdrawalProfitTotals(filters: { accountId?: string; from?: string; to?: string }) {
  const rows = listWithdrawals(filters);
  return {
    paid: round2(rows.filter((row) => row.status === "Paid").reduce((sum, row) => sum + row.profit, 0)),
    processing: round2(rows.filter((row) => row.status === "Processing").reduce((sum, row) => sum + row.profit, 0)),
  };
}

export function createWithdrawals(accountId?: string) {
  return transaction(() => {
    const rows = accountPayouts(accountId);
    const now = new Date().toISOString();
    let count = 0;
    const insert = getDb().prepare(
      `INSERT INTO "DA_withdrawals" (id, account_id, amount, withdrawn_at, share_percent, profit, status) VALUES (?, ?, ?, ?, ?, ?, 'Processing')`,
    );
    const claim = getDb().prepare(
      `
      UPDATE "DA_tasks"
      SET withdrawal_id = ?
      WHERE account_id = ? AND status = 'Completed' AND end_time != '' AND end_time <= ? AND withdrawal_id = ''
    `,
    );
    for (const row of rows) {
      if (row.available <= 0) continue;
      const id = nextId("DA-W");
      insert.run(id, row.accountId, row.available, now, row.sharePercent, round2((row.available * row.sharePercent) / 100));
      claim.run(id, row.accountId, payoutCutoff(new Date(now)));
      count += 1;
    }
    return count;
  });
}

export function updateWithdrawalStatus(id: string, status: WithdrawalStatus) {
  getDb().prepare(`UPDATE "DA_withdrawals" SET status = ? WHERE id = ?`).run(status, id);
}

function mapWithdrawal(row: Row): Withdrawal {
  return {
    id: text(row.id),
    accountId: text(row.account_id),
    accountName: text(row.account_name),
    amount: num0(row.amount),
    withdrawnAt: text(row.withdrawn_at),
    sharePercent: num0(row.share_percent),
    profit: num0(row.profit),
    status: text(row.status) === "Paid" ? "Paid" : "Processing",
  };
}
