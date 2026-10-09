"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canManageUsers, isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import {
  ACCOUNT_STATUSES,
  isSuspendedStatus,
  ACCOUNT_TIMEZONES,
  CHROME_REMOTE_OPTIONS,
  COUNTRIES,
  GENDERS,
  PROJECT_KINDS,
  RACES,
  TASK_STATUSES,
  WITHDRAWAL_STATUSES,
} from "@/lib/constants";
import { computeEarning, round2 } from "@/lib/format";
import { refreshProfitEstimate } from "@/lib/stats";
import { defaultWithdrawalMinutes } from "@/lib/time";
import { readChecked, readNumber, readString, validUrl } from "@/lib/form";
import { hashPassword } from "@/lib/passwords";
import {
  createAccount,
  createProject,
  createTask,
  createUser,
  deleteAccount,
  deleteProject,
  deleteTask,
  deleteUser,
  accountHasUnpausableWip,
  getAccount,
  getProjectRecord,
  getSessionUser,
  getTask,
  listAccountOptions,
  listProjectOptions,
  updateAccount,
  updateProject,
  updateTask,
  updateUser,
  countSuperAdmins,
  createWithdrawals,
  updateWithdrawalStatus,
} from "@/lib/queries";
import { elapsedHours, zonedLocalToUtc } from "@/lib/time";
import type { AccountStatus, ActionState, PlatformRole, ProjectKind, TaskStatus, WithdrawalStatus } from "@/lib/types";

function refresh() {
  revalidatePath("/", "layout");
}

export async function setPlatform(platform: string) {
  const user = await requireUser();
  if (!user) return;
  if (platform !== "da" && platform !== "handshake" && platform !== "snorkel") return;
  const jar = await cookies();
  jar.set("platform", platform, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  refresh();
}

function readAccount(formData: FormData) {
  const name = readString(formData, "name", 80);
  const whatsapp = readString(formData, "whatsapp", 40);
  const email = readString(formData, "email", 120);
  const emailPassword = readString(formData, "emailPassword", 200);
  const accountPassword = readString(formData, "accountPassword", 200);
  const timezone = readString(formData, "timezone", 64);
  const chromeRemote = readString(formData, "chromeRemote", 120);
  const anydeskId = readString(formData, "anydeskId", 80);
  const anydeskPassword = readString(formData, "anydeskPassword", 200);
  const ultraviewerId = readString(formData, "ultraviewerId", 80);
  const ultraviewerPassword = readString(formData, "ultraviewerPassword", 200);
  const trainerEmail = readString(formData, "trainerEmail", 120);
  const trainerPassword = readString(formData, "trainerPassword", 200);
  const bitwardenEmail = readString(formData, "bitwardenEmail", 120);
  const bitwardenPassword = readString(formData, "bitwardenPassword", 200);
  const phone = readString(formData, "phone", 40);
  const address = readString(formData, "address", 240);
  const dob = readString(formData, "dob", 20);
  const gender = readString(formData, "gender", 40);
  const race = readString(formData, "race", 80);
  const country = readString(formData, "country", 8);
  const linkedinUrl = readString(formData, "linkedinUrl", 300);
  const resumeUrl = readString(formData, "resumeUrl", 300);
  const status = readString(formData, "status", 40);
  const suspendedAt = readString(formData, "suspendedAt", 40);
  const sharing = readNumber(formData, "sharingPercent");
  const weeklyTarget = readNumber(formData, "weeklyTargetHours");
  const withdrawalWeekday = readString(formData, "withdrawalWeekday", 2);
  const withdrawalTime = readString(formData, "withdrawalTime", 8);
  return {
    name,
    whatsapp,
    email,
    emailPassword,
    accountPassword,
    timezone,
    chromeRemote,
    anydeskId,
    anydeskPassword,
    ultraviewerId,
    ultraviewerPassword,
    trainerEmail,
    trainerPassword,
    bitwardenEmail,
    bitwardenPassword,
    phone,
    address,
    dob,
    gender,
    race,
    country,
    linkedinUrl,
    resumeUrl,
    status,
    suspendedAt,
    sharing,
    weeklyTarget,
    withdrawalWeekday,
    withdrawalTime,
  };
}

function readClock(value: string) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export async function saveAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!isManager(user)) return { error: "Only a platform admin can edit accounts." };
  const id = readString(formData, "id", 20).value;
  const fields = readAccount(formData);
  const textFields = [
    fields.name,
    fields.whatsapp,
    fields.email,
    fields.emailPassword,
    fields.accountPassword,
    fields.timezone,
    fields.chromeRemote,
    fields.anydeskId,
    fields.anydeskPassword,
    fields.ultraviewerId,
    fields.ultraviewerPassword,
    fields.trainerEmail,
    fields.trainerPassword,
    fields.bitwardenEmail,
    fields.bitwardenPassword,
    fields.phone,
    fields.address,
    fields.dob,
    fields.gender,
    fields.race,
    fields.country,
    fields.linkedinUrl,
    fields.resumeUrl,
    fields.status,
    fields.suspendedAt,
    fields.withdrawalWeekday,
    fields.withdrawalTime,
  ];
  if (textFields.some((field) => !field.ok)) return { error: "One of the fields is too long." };
  if (!fields.sharing.ok) return { error: "Profit share needs to be a number." };
  if (!fields.weeklyTarget.ok || (fields.weeklyTarget.value != null && fields.weeklyTarget.value < 0)) {
    return { error: "Weekly target hours need to be a number that is zero or more." };
  }
  if (fields.sharing.value != null && (fields.sharing.value < 0 || fields.sharing.value > 100)) {
    return { error: "Profit share has to be between 0 and 100." };
  }
  if (!fields.name.value) return { error: "Add an account name." };
  if (!ACCOUNT_TIMEZONES.some((zone) => zone.id === fields.timezone.value)) return { error: "Choose a timezone." };
  if (!ACCOUNT_STATUSES.includes(fields.status.value as AccountStatus)) return { error: "Choose a status." };
  if (!CHROME_REMOTE_OPTIONS.some((option) => option.value === fields.chromeRemote.value)) {
    return { error: "Choose a Chrome Remote Desktop login." };
  }
  if (fields.gender.value && !GENDERS.includes(fields.gender.value)) return { error: "Choose a gender." };
  if (fields.race.value && !RACES.includes(fields.race.value)) return { error: "Choose a race." };
  if (fields.country.value && !COUNTRIES.some((country) => country.id === fields.country.value)) return { error: "Choose a country." };
  if (fields.email.value && !fields.email.value.includes("@")) return { error: "Email needs an @ sign." };
  if (fields.trainerEmail.value && !fields.trainerEmail.value.includes("@")) return { error: "AI Datatrainer email needs an @ sign." };
  if (fields.bitwardenEmail.value && !fields.bitwardenEmail.value.includes("@")) return { error: "Bitwarden email needs an @ sign." };
  if (!validUrl(fields.linkedinUrl.value) || !validUrl(fields.resumeUrl.value)) {
    return { error: "Links need to start with http:// or https://." };
  }
  if (fields.dob.value && !/^\d{4}-\d{2}-\d{2}$/.test(fields.dob.value)) return { error: "Date of birth needs a real date." };
  const weekday = Number(fields.withdrawalWeekday.value);
  const clock = readClock(fields.withdrawalTime.value);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || clock == null) {
    return { error: "Scheduled withdrawal needs a day and a time." };
  }

  let suspended = "";
  if (isSuspendedStatus(fields.status.value)) {
    if (fields.suspendedAt.value) {
      try {
        suspended = zonedLocalToUtc(fields.suspendedAt.value, fields.timezone.value).toISOString();
      } catch {
        return { error: "Suspended time needs a real date." };
      }
    } else if (id) {
      suspended = getAccount(id)?.suspendedAt || new Date().toISOString();
    } else {
      suspended = new Date().toISOString();
    }
  }

  const input = {
    name: fields.name.value,
    whatsapp: fields.whatsapp.value,
    sharingPercent: fields.sharing.value,
    email: fields.email.value,
    emailPassword: fields.emailPassword.value,
    accountPassword: fields.accountPassword.value,
    timezone: fields.timezone.value,
    chromeRemote: fields.chromeRemote.value,
    anydeskId: fields.anydeskId.value,
    anydeskPassword: fields.anydeskPassword.value,
    ultraviewerId: fields.ultraviewerId.value,
    ultraviewerPassword: fields.ultraviewerPassword.value,
    trainerEmail: fields.trainerEmail.value,
    trainerPassword: fields.trainerPassword.value,
    bitwardenEmail: fields.bitwardenEmail.value,
    bitwardenPassword: fields.bitwardenPassword.value,
    phone: fields.phone.value,
    address: fields.address.value,
    dob: fields.dob.value,
    gender: fields.gender.value,
    race: fields.race.value,
    country: fields.country.value,
    weeklyTargetHours: fields.weeklyTarget.value ?? 40,
    withdrawalWeekday: weekday,
    withdrawalMinutes: clock ?? defaultWithdrawalMinutes(fields.timezone.value),
    linkedinUrl: fields.linkedinUrl.value,
    resumeUrl: fields.resumeUrl.value,
    status: fields.status.value as AccountStatus,
    suspendedAt: suspended,
  };

  let destination = "";
  try {
    if (id) {
      if (!getAccount(id)) return { error: "That account no longer exists." };
      updateAccount(id, input);
      destination = `/accounts/${id}?notice=saved`;
    } else {
      destination = `/accounts/${createAccount(input, new Date().toISOString())}?notice=saved`;
    }
  } catch {
    return { error: "Couldn't save that account." };
  }
  refresh();
  redirect(destination);
}

export async function removeAccount(id: string) {
  const user = await requireUser();
  if (!isManager(user)) redirect("/accounts");
  const result = deleteAccount(id);
  refresh();
  if (!result.ok) redirect(`/accounts/${id}?notice=blocked`);
  redirect("/accounts?notice=deleted");
}

function readDuration(formData: FormData, hoursKey: string, minutesKey: string) {
  const hoursRaw = String(formData.get(hoursKey) ?? "").trim();
  const minutesRaw = String(formData.get(minutesKey) ?? "").trim();
  if (!hoursRaw && !minutesRaw) return { ok: true as const, value: null as number | null };
  const hours = hoursRaw ? Number(hoursRaw) : 0;
  const minutes = minutesRaw ? Number(minutesRaw) : 0;
  if (!Number.isInteger(hours) || hours < 0 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    return { ok: false as const, value: null as number | null };
  }
  return { ok: true as const, value: hours * 60 + minutes };
}

export async function saveProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!isManager(user)) return { error: "Only a platform admin can edit projects." };
  const id = readString(formData, "id", 20).value;
  const name = readString(formData, "name", 120);
  const kind = readString(formData, "kind", 20);
  const maxAllowed = readDuration(formData, "maxHours", "maxMinutes");
  const recommendedStart = readDuration(formData, "recommendedStartHours", "recommendedStartMinutes");
  const recommendedEnd = readDuration(formData, "recommendedEndHours", "recommendedEndMinutes");
  const autoExpireEnabled = readChecked(formData, "autoExpireEnabled");
  const autoExpire = readNumber(formData, "autoExpireMinutes");
  if (!name.ok || !kind.ok) return { error: "One of the fields is too long." };
  if (!name.value) return { error: "Add a project name." };
  if (!PROJECT_KINDS.includes(kind.value as ProjectKind)) return { error: "Choose a project type." };
  if (!maxAllowed.ok) return { error: "Maximum allowed time needs whole hours and minutes from 0 to 59." };
  if (!recommendedStart.ok || !recommendedEnd.ok) {
    return { error: "Recommended log time needs whole hours and minutes from 0 to 59." };
  }
  if ((recommendedStart.value == null) !== (recommendedEnd.value == null)) {
    return { error: "Recommended log time needs both a start and an end." };
  }
  if (recommendedStart.value != null && recommendedEnd.value != null && recommendedStart.value > recommendedEnd.value) {
    return { error: "The end of the recommended log time has to be later than the start." };
  }
  if (autoExpireEnabled && (!autoExpire.ok || autoExpire.value == null || !Number.isInteger(autoExpire.value) || autoExpire.value < 0)) {
    return { error: "Auto expire minutes need to be a whole number." };
  }
  const input = {
    name: name.value,
    kind: kind.value as ProjectKind,
    maxAllowedMinutes: maxAllowed.value,
    recommendedStartMinutes: recommendedStart.value,
    recommendedEndMinutes: recommendedEnd.value,
    autoExpireEnabled,
    autoExpireMinutes: autoExpireEnabled ? autoExpire.value : null,
    intendToWork: readChecked(formData, "intendToWork"),
    canPause: readChecked(formData, "canPause"),
  };
  let destination = "";
  try {
    if (id) {
      if (!getProjectRecord(id)) return { error: "That project no longer exists." };
      updateProject(id, input);
      destination = `/projects/${id}?notice=saved`;
    } else {
      destination = `/projects/${createProject(input)}?notice=saved`;
    }
  } catch {
    return { error: "Couldn't save that project." };
  }
  refresh();
  redirect(destination);
}

export async function removeProject(id: string) {
  const user = await requireUser();
  if (!isManager(user)) redirect("/projects");
  const result = deleteProject(id);
  refresh();
  if (!result.ok) redirect(`/projects/${id}?notice=blocked`);
  redirect("/projects?notice=deleted");
}

export async function saveTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = readString(formData, "id", 20).value;
  const existing = id ? getTask(id) : null;
  if (id && !existing) return { error: "That task no longer exists." };
  const manager = isManager(user);
  if (!manager && (!existing || existing.userId !== user.id)) {
    return { error: "You can update your own tasks." };
  }
  if (!existing && !manager) return { error: "A platform admin creates tasks." };

  const accountId = manager ? readString(formData, "accountId", 20).value : existing!.accountId;
  const userId = manager ? readString(formData, "userId", 40).value : existing!.userId;
  const projectId = manager ? readString(formData, "projectId", 20).value : existing!.projectId;
  const account = getAccount(accountId);
  const timezone = account?.timezone || existing?.accountTimezone || "UTC";
  const startLocal = readString(formData, "startTime", 20).value;
  const endLocal = readString(formData, "endTime", 20).value;
  const status = readString(formData, "status", 20).value;
  const loggedHoursPart = readNumber(formData, "loggedHours");
  const loggedMinutesPart = readNumber(formData, "loggedMinutes");
  const rateResult = manager ? readNumber(formData, "rate") : { ok: true as const, value: existing?.rate ?? null };

  if (!loggedHoursPart.ok || !loggedMinutesPart.ok || !rateResult.ok) return { error: "Time logged and rate need to be numbers." };
  if (!TASK_STATUSES.includes(status as TaskStatus)) return { error: "Choose a status." };
  if (!account) return { error: "Choose an account." };
  if (!listProjectOptions().some((project) => project.id === projectId)) return { error: "Choose a project." };
  if (!getSessionUser(userId)) return { error: "Choose an assignee." };
  const loggedBlank = loggedHoursPart.value == null && loggedMinutesPart.value == null;
  const loggedHoursValue = (loggedHoursPart.value ?? 0) + (loggedMinutesPart.value ?? 0) / 60;
  if (
    !loggedBlank &&
    ((loggedHoursPart.value ?? 0) < 0 ||
      (loggedMinutesPart.value ?? 0) < 0 ||
      (loggedMinutesPart.value ?? 0) > 59 ||
      !Number.isInteger(loggedHoursPart.value ?? 0) ||
      !Number.isInteger(loggedMinutesPart.value ?? 0))
  ) {
    return { error: "Time logged needs whole hours and minutes from 0 to 59." };
  }
  if (rateResult.value != null && rateResult.value < 0) return { error: "Hourly rate can't be negative." };
  if (!existing && accountHasUnpausableWip(accountId)) {
    return { error: "This account already has a WIP task on a project that cannot be paused." };
  }

  let startTime = "";
  let endTime = "";
  try {
    if (startLocal) startTime = zonedLocalToUtc(startLocal, timezone).toISOString();
    if (endLocal) endTime = zonedLocalToUtc(endLocal, timezone).toISOString();
  } catch {
    return { error: "Start and end need real dates." };
  }
  if (startTime && endTime && new Date(endTime) < new Date(startTime)) {
    return { error: "End time has to be after the start time." };
  }

  const loggedHours = loggedBlank ? null : round2(loggedHoursValue);
  const rate = rateResult.value == null ? null : round2(rateResult.value);
  const taskStatus = status as TaskStatus;
  const input = {
    accountId,
    userId,
    projectId,
    timezone,
    startTime,
    endTime,
    elapsedHours: startTime && endTime ? elapsedHours(startTime, endTime) : null,
    loggedHours,
    rate,
    earning: taskStatus === "Exited" ? null : computeEarning(loggedHours, rate),
    status: taskStatus,
  };

  let destination = "";
  try {
    if (existing) {
      updateTask(existing.id, input);
      destination = `/tasks/${existing.id}?notice=saved`;
    } else {
      destination = `/tasks/${createTask(input)}?notice=saved`;
    }
  } catch {
    return { error: "Couldn't save that task." };
  }
  refresh();
  redirect(destination);
}

export async function refreshEstimatedProfit() {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/dashboard");
  refreshProfitEstimate(new Date());
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function withdrawAvailable(formData: FormData) {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/statistics");
  const accountId = readString(formData, "accountId", 20).value;
  const count = createWithdrawals(accountId === "all" ? undefined : accountId);
  refresh();
  const account = accountId === "all" ? "all" : accountId;
  redirect(`/statistics?view=account&account=${encodeURIComponent(account)}&notice=${count > 0 ? "withdrawn" : "withdraw-empty"}`);
}

export async function setWithdrawalStatus(formData: FormData) {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/dashboard");
  const id = readString(formData, "id", 20).value;
  const status = readString(formData, "status", 20).value;
  const returnTo = readString(formData, "returnTo", 300).value;
  if (!WITHDRAWAL_STATUSES.includes(status as WithdrawalStatus)) redirect("/withdrawals");
  updateWithdrawalStatus(id, status as WithdrawalStatus);
  refresh();
  redirect(returnTo.startsWith("/withdrawals") ? returnTo : "/withdrawals?notice=saved");
}

export async function removeTask(id: string) {
  const user = await requireUser();
  if (!isManager(user)) redirect("/tasks");
  deleteTask(id);
  refresh();
  redirect("/tasks?notice=deleted");
}

const LOGIN_ID = /^[a-z][a-z0-9._-]{1,31}$/;

export async function saveUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!canManageUsers(actor)) return { error: "Only a super admin can edit logins." };
  const existingId = readString(formData, "id", 40).value;
  const existing = existingId ? getSessionUser(existingId) : null;
  if (existingId && !existing) return { error: "That person no longer exists." };

  const name = readString(formData, "name", 80);
  const rawId = readString(formData, "loginId", 40);
  const password = readString(formData, "password", 200);
  if (!name.ok || !rawId.ok || !password.ok) return { error: "One of the fields is too long." };
  if (!name.value) return { error: "Add a name." };

  const loginId = (existing?.id ?? rawId.value).toLowerCase();
  if (!LOGIN_ID.test(loginId)) {
    return { error: "Login ID needs to start with a letter and use only letters, numbers, dots, or hyphens." };
  }

  const daRoleRaw = readString(formData, "daRole", 20).value;
  const daRole: PlatformRole | null =
    daRoleRaw === "platform_admin" || daRoleRaw === "member" ? daRoleRaw : null;
  let isSuperAdmin = readChecked(formData, "isSuperAdmin");
  if (existing?.isSuperAdmin && countSuperAdmins() <= 1) isSuperAdmin = true;
  if (!isSuperAdmin && !daRole) return { error: "Assign super admin or a DA role." };

  if (!existing && password.value.length < 8) return { error: "Password needs at least 8 characters." };
  if (existing && password.value && password.value.length < 8) return { error: "Password needs at least 8 characters." };
  if (!existing && getSessionUser(loginId)) return { error: "That login ID is already in use." };

  let destination = "";
  try {
    if (existing) {
      updateUser({
        id: existing.id,
        name: name.value,
        passwordHash: password.value ? hashPassword(password.value) : undefined,
        isSuperAdmin,
        daRole,
      });
      destination = `/users/${existing.id}?notice=saved`;
    } else {
      createUser({
        id: loginId,
        name: name.value,
        passwordHash: hashPassword(password.value),
        isSuperAdmin,
        daRole,
        signedUpAt: new Date().toISOString(),
      });
      destination = `/users/${loginId}?notice=saved`;
    }
  } catch {
    return { error: "Couldn't save that login." };
  }
  refresh();
  redirect(destination);
}

export async function removeUser(id: string) {
  const actor = await requireUser();
  if (!canManageUsers(actor)) redirect("/users");
  if (actor.id === id) redirect(`/users/${id}?notice=locked`);
  const existing = getSessionUser(id);
  if (!existing) redirect("/users");
  if (existing.isSuperAdmin && countSuperAdmins() <= 1) redirect(`/users/${id}?notice=locked`);
  const result = deleteUser(id);
  refresh();
  if (!result.ok) redirect(`/users/${id}?notice=tasks`);
  redirect("/users?notice=deleted");
}
