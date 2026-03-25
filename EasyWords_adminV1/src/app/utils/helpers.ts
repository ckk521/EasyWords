import { User } from "../api/client";

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${min}`;
}

export function formatDateOnly(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isExpired(expiresAt: string | Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}

export interface UserStatus {
  label: string;
  className: string;
  dot: string;
}

export function getUserStatus(user: User): UserStatus {
  if (!user.isActive) {
    return {
      label: "已禁用",
      className: "bg-red-50 text-red-600",
      dot: "bg-red-500",
    };
  }
  if (user.expiresAt && isExpired(user.expiresAt)) {
    return {
      label: "已过期",
      className: "bg-amber-50 text-amber-600",
      dot: "bg-amber-500",
    };
  }
  return {
    label: "正常",
    className: "bg-green-50 text-green-600",
    dot: "bg-green-500",
  };
}

export function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    add_word: "新增单词",
    add_article: "新增文章",
    add_dialogue: "新增对话",
    add_conversation: "新增口语会话",
  };
  return map[action] || action;
}

export function getActionColor(action: string): string {
  const map: Record<string, string> = {
    add_word: "bg-blue-50 text-blue-600",
    add_article: "bg-green-50 text-green-600",
    add_dialogue: "bg-amber-50 text-amber-600",
    add_conversation: "bg-purple-50 text-purple-600",
  };
  return map[action] || "bg-gray-50 text-gray-600";
}

export function parseDetails(details: string | null): string {
  if (!details) return "-";
  try {
    const obj = JSON.parse(details);
    const parts: string[] = [];
    if (obj.word) parts.push(obj.word);
    if (obj.chineseDefinition) parts.push(obj.chineseDefinition);
    if (obj.title) parts.push(obj.title);
    if (obj.scene) parts.push(obj.scene);
    if (obj.topic) parts.push(obj.topic);
    if (obj.level) parts.push(`[${obj.level}]`);
    return parts.join(" · ") || "-";
  } catch {
    return details;
  }
}

export function getExpiresAtDisplay(expiresAt: string | Date | null): string {
  if (!expiresAt) return "永久";
  const d = new Date(expiresAt);
  const now = new Date();
  if (d < now) {
    return `已过期 (${formatDateOnly(expiresAt)})`;
  }
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `${formatDateOnly(expiresAt)} (剩余 ${diffDays} 天)`;
}
