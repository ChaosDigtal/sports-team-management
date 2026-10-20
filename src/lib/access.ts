import { CANDIDATE_STATUSES } from "./constants";
import type { CandidateStatus, SessionUser } from "./types";

export function isManager(user: SessionUser) {
  return user.isSuperAdmin || user.roles.da === "platform_admin";
}

export function canManageUsers(user: SessionUser) {
  return user.isSuperAdmin;
}

export function hasDaAccess(user: SessionUser) {
  return user.isSuperAdmin || Boolean(user.roles.da) || user.daOnboarding;
}

export function canAccessOnboarding(user: SessionUser) {
  return user.daOnboarding;
}

export function canEditLaptopStatus(user: SessionUser) {
  return user.isSuperAdmin || user.daOnboarding;
}

export function candidateStatusChoices(user: SessionUser, current?: CandidateStatus): CandidateStatus[] {
  if (isManager(user)) return [...CANDIDATE_STATUSES];
  if (current === "Incomplete") return ["Incomplete", "In Review"];
  return current ? [current] : ["Incomplete"];
}

export function roleLabel(user: SessionUser) {
  if (user.isSuperAdmin) return "Super admin";
  if (user.roles.da === "platform_admin") return "Platform admin";
  if (user.roles.da === "member") return "Member";
  if (user.daOnboarding) return "DA Onboarding";
  return "No DA access";
}

export function accessSummary(user: SessionUser) {
  const parts: string[] = [];
  if (user.isSuperAdmin) parts.push("Super admin");
  if (user.roles.da === "platform_admin") parts.push("DA platform admin");
  if (user.roles.da === "member") parts.push("DA member");
  if (user.daOnboarding) parts.push("DA Onboarding");
  return parts.length ? parts.join(" · ") : "No role assigned";
}
