import type { SessionUser } from "./types";

export function isManager(user: SessionUser) {
  return user.isSuperAdmin || user.roles.da === "platform_admin";
}

export function canManageUsers(user: SessionUser) {
  return user.isSuperAdmin;
}

export function hasDaAccess(user: SessionUser) {
  return user.isSuperAdmin || Boolean(user.roles.da);
}

export function roleLabel(user: SessionUser) {
  if (user.isSuperAdmin) return "Super admin";
  if (user.roles.da === "platform_admin") return "Platform admin";
  if (user.roles.da === "member") return "Member";
  return "No DA access";
}

export function accessSummary(user: SessionUser) {
  const parts: string[] = [];
  if (user.isSuperAdmin) parts.push("Super admin");
  if (user.roles.da === "platform_admin") parts.push("DA platform admin");
  if (user.roles.da === "member") parts.push("DA member");
  return parts.length ? parts.join(" · ") : "No role assigned";
}
