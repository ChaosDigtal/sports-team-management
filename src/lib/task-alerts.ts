import { isManager } from "./access";
import { formatDuration } from "./format";
import { listTasks } from "./queries";
import { openMinutes } from "./time";
import type { SessionUser } from "./types";

export type TaskAlert = {
  id: string;
  title: string;
  body: string;
  href: string;
};

export function listTaskAlerts(user: SessionUser, now = new Date()): TaskAlert[] {
  const manager = isManager(user);
  const tasks = listTasks({ userId: manager ? undefined : user.id, status: "WIP", limit: 500 });
  const alerts: TaskAlert[] = [];
  for (const task of tasks) {
    const elapsed = openMinutes(task.startTime, now);
    const own = task.userId === user.id;
    if (task.maxAllowedMinutes != null && elapsed > task.maxAllowedMinutes && (manager || own)) {
      alerts.push({
        id: `over:${task.id}`,
        title: `${task.id} is past the maximum allowed time`,
        body: `${task.userName} on ${task.projectName}: elapsed ${formatDuration(Math.round(elapsed))} is past ${formatDuration(task.maxAllowedMinutes)}.`,
        href: `/tasks/${task.id}`,
      });
    }
    if (own && task.intendToWork) {
      alerts.push({
        id: `intend:${task.id}`,
        title: "Click I intend to work on the platform",
        body: `${task.id} on ${task.projectName} was just opened. Click I intend to work on the platform.`,
        href: `/tasks/${task.id}`,
      });
    }
    if (own && task.autoExpireEnabled && task.autoExpireMinutes != null && task.autoExpireMinutes > 0) {
      const step = (task.autoExpireMinutes * 2) / 3;
      const count = Math.floor(elapsed / step);
      if (count >= 1) {
        alerts.push({
          id: `expire:${task.id}:${count}`,
          title: `${task.id} auto-expire reminder`,
          body: `${task.projectName} has been open for ${formatDuration(Math.round(elapsed))}. Auto expire is ${task.autoExpireMinutes} mins.`,
          href: `/tasks/${task.id}`,
        });
      }
    }
  }
  return alerts;
}
