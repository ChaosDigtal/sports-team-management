import { randomInt } from "node:crypto";
import { getDb, nextId, transaction } from "./db";
import type { Assessment, Candidate, CandidateStatus } from "./types";

type Row = Record<string, unknown>;

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function num(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type CandidateInput = Omit<Candidate, "id" | "createdAt">;

function mapCandidate(row: Row): Candidate {
  return {
    id: text(row.id),
    name: text(row.name),
    whatsapp: text(row.whatsapp),
    telegram: text(row.telegram),
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
    phone: text(row.phone),
    address: text(row.address),
    dob: text(row.dob),
    gender: text(row.gender),
    race: text(row.race),
    country: text(row.country),
    linkedinUrl: text(row.linkedin_url),
    resumeUrl: text(row.resume_url),
    createdAt: text(row.created_at),
    status: text(row.status) as CandidateStatus,
  };
}

export function listCandidates(filters?: { status?: string; country?: string; q?: string; noResume?: boolean; noLinkedin?: boolean }) {
  const where: string[] = [];
  const params: string[] = [];
  if (filters?.status) {
    where.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.country) {
    where.push("country = ?");
    params.push(filters.country);
  }
  if (filters?.noResume) where.push("TRIM(resume_url) = ''");
  if (filters?.noLinkedin) where.push("TRIM(linkedin_url) = ''");
  const q = (filters?.q ?? "").replace(/[%_]/g, "").trim();
  if (q) {
    const columns = ["id", "name", "whatsapp", "telegram", "email", "anydesk_id", "phone", "country", "status"];
    where.push(`(${columns.map((column) => `${column} LIKE ?`).join(" OR ")})`);
    for (let index = 0; index < columns.length; index += 1) params.push(`%${q}%`);
  }
  const rows = getDb()
    .prepare(`SELECT * FROM "DA_candidates" ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY name COLLATE NOCASE`)
    .all(...params) as Row[];
  return rows.map(mapCandidate);
}

export function getCandidate(id: string) {
  const row = getDb().prepare(`SELECT * FROM "DA_candidates" WHERE id = ?`).get(id) as Row | undefined;
  return row ? mapCandidate(row) : null;
}

function insertReady(candidateId: string) {
  getDb()
    .prepare(
      `INSERT INTO "DA_assessments" (candidate_id, start_time, end_time, task_id, status, stage, password, updated_at) VALUES (?, '', '', '', 'Ready', '', ?, ?)`,
    )
    .run(candidateId, assessmentPassword(), new Date().toISOString());
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

function removeReady(candidateId: string) {
  getDb().prepare(`DELETE FROM "DA_assessments" WHERE candidate_id = ? AND status = 'Ready'`).run(candidateId);
}

export function createCandidate(input: CandidateInput, createdAt: string) {
  return transaction(() => {
    const id = nextId("DA-C");
    getDb()
      .prepare(
        `
        INSERT INTO "DA_candidates" (
          id, name, whatsapp, telegram, sharing_percent, email, email_password, account_password, timezone, chrome_remote,
          anydesk_id, anydesk_password, ultraviewer_id, ultraviewer_password,
          phone, address, dob, gender, race, country, linkedin_url, resume_url, created_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        id,
        input.name,
        input.whatsapp,
        input.telegram,
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
        input.phone,
        input.address,
        input.dob,
        input.gender,
        input.race,
        input.country,
        input.linkedinUrl,
        input.resumeUrl,
        createdAt,
        input.status,
      );
    if (input.status === "Active") insertReady(id);
    return id;
  });
}

export function updateCandidate(id: string, input: CandidateInput) {
  transaction(() => {
    const existing = getCandidate(id);
    getDb()
      .prepare(
        `
        UPDATE "DA_candidates" SET
          name = ?, whatsapp = ?, telegram = ?, sharing_percent = ?, email = ?, email_password = ?, account_password = ?, timezone = ?,
          chrome_remote = ?, anydesk_id = ?, anydesk_password = ?, ultraviewer_id = ?, ultraviewer_password = ?,
          phone = ?, address = ?, dob = ?, gender = ?, race = ?, country = ?, linkedin_url = ?, resume_url = ?, status = ?
        WHERE id = ?
      `,
      )
      .run(
        input.name,
        input.whatsapp,
        input.telegram,
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
        input.phone,
        input.address,
        input.dob,
        input.gender,
        input.race,
        input.country,
        input.linkedinUrl,
        input.resumeUrl,
        input.status,
        id,
      );
    const previous = existing?.status;
    const leavesActive = previous === "Active" && (input.status === "Pending" || input.status === "Client No Longer Interested");
    const becomesActive = input.status === "Active" && (previous === "Pending" || previous === "Client No Longer Interested");
    if (leavesActive) removeReady(id);
    if (becomesActive) insertReady(id);
  });
}

export function deleteCandidate(id: string) {
  transaction(() => {
    const db = getDb();
    db.prepare(`DELETE FROM "DA_assessments" WHERE candidate_id = ?`).run(id);
    db.prepare(`DELETE FROM "DA_candidates" WHERE id = ?`).run(id);
  });
}

const ASSESSMENT_SELECT = `
  SELECT s.id AS id, s.candidate_id AS candidate_id, c.name AS name, c.whatsapp AS whatsapp,
    c.anydesk_id AS anydesk_id, c.anydesk_password AS anydesk_password,
    s.start_time AS start_time, s.end_time AS end_time, s.task_id AS task_id, s.status AS status, s.stage AS stage,
    s.stuck AS stuck, s.stuck_error AS stuck_error, s.password AS password, s.updated_at AS updated_at, c.email AS email,
    c.dob AS dob, c.gender AS gender, c.race AS race, c.country AS country, c.linkedin_url AS linkedin_url, c.resume_url AS resume_url
  FROM "DA_assessments" s
  JOIN "DA_candidates" c ON c.id = s.candidate_id
`;

function mapAssessment(row: Row): Assessment {
  return {
    id: Number(row.id),
    candidateId: text(row.candidate_id),
    name: text(row.name),
    whatsapp: text(row.whatsapp),
    anydeskId: text(row.anydesk_id),
    anydeskPassword: text(row.anydesk_password),
    startTime: text(row.start_time),
    endTime: text(row.end_time),
    taskId: text(row.task_id),
    status: text(row.status),
    stage: text(row.stage),
    stuck: Number(row.stuck) === 1,
    stuckError: text(row.stuck_error),
    updatedAt: text(row.updated_at),
    email: text(row.email),
    password: text(row.password),
    dob: text(row.dob),
    gender: text(row.gender),
    race: text(row.race),
    country: text(row.country),
    linkedinUrl: text(row.linkedin_url),
    resumeUrl: text(row.resume_url),
  };
}

export function listAssessments() {
  const rows = getDb().prepare(`${ASSESSMENT_SELECT} ORDER BY s.id`).all() as Row[];
  return rows.map(mapAssessment);
}

export function getAssessment(id: number) {
  const row = getDb().prepare(`${ASSESSMENT_SELECT} WHERE s.id = ?`).get(id) as Row | undefined;
  return row ? mapAssessment(row) : null;
}

export function updateAssessment(id: number, input: { startTime: string; endTime: string; taskId: string; status: string; stage: string }) {
  transaction(() => {
    const db = getDb();
    const existing = db.prepare(`SELECT status FROM "DA_assessments" WHERE id = ?`).get(id) as Row | undefined;
    if (!existing) return;
    const stage = input.status === "On Assessment" ? input.stage : "";
    db.prepare(`UPDATE "DA_assessments" SET start_time = ?, end_time = ?, task_id = ?, status = ?, stage = ?, updated_at = ? WHERE id = ?`).run(
      input.startTime,
      input.endTime,
      input.taskId,
      input.status,
      stage,
      new Date().toISOString(),
      id,
    );
    if (input.status === "Failed" && text(existing.status) !== "Failed") {
      const candidate = db.prepare(`SELECT candidate_id FROM "DA_assessments" WHERE id = ?`).get(id) as Row;
      insertReady(text(candidate.candidate_id));
    }
  });
}
