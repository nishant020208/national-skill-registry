// Shared NSR utilities
export async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function shortHash(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export function levelLabel(level: number): string {
  return ["", "Beginner", "Intermediate", "Advanced", "Expert"][level] ?? `L${level}`;
}

export function levelColor(level: number): string {
  return ["", "bg-muted text-muted-foreground", "bg-primary/15 text-primary-glow border-primary/30", "bg-success/15 text-success border-success/30", "bg-warning/15 text-warning border-warning/40"][level] ?? "";
}

export type OfflineCredential = {
  tempId: string;
  studentId: string;
  studentName: string;
  skillId: string;
  skillName: string;
  level: number;
  institutionId: string;
  hash: string;
  createdAt: string;
};

const KEY = "nsr_offline_queue";
export function getOfflineQueue(): OfflineCredential[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function addToOfflineQueue(c: OfflineCredential) {
  const q = getOfflineQueue(); q.push(c);
  localStorage.setItem(KEY, JSON.stringify(q));
}
export function clearOfflineQueue() { localStorage.removeItem(KEY); }
export function removeFromQueue(tempId: string) {
  localStorage.setItem(KEY, JSON.stringify(getOfflineQueue().filter(c => c.tempId !== tempId)));
}
