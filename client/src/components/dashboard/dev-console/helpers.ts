export const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  approve: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-orange-100 text-orange-800',
  status_change: 'bg-yellow-100 text-yellow-800',
  lock: 'bg-gray-100 text-gray-800',
  unlock: 'bg-teal-100 text-teal-800',
  assign: 'bg-purple-100 text-purple-800',
  dispatch: 'bg-indigo-100 text-indigo-800',
  login: 'bg-sky-100 text-sky-800',
  register: 'bg-lime-100 text-lime-800',
  logout: 'bg-slate-100 text-slate-800',
};

// Dark-theme variants used in the developer console
export const actionColorsDark: Record<string, string> = {
  create: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  update: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  delete: 'bg-red-500/15 text-red-300 border-red-500/30',
  approve: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  reject: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  status_change: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  lock: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  unlock: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  assign: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  dispatch: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  login: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  register: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  logout: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

// Hex accent per action (used for terminal-style live monitor + sparklines)
export const actionAccent: Record<string, string> = {
  create: '#10b981',
  update: '#3b82f6',
  delete: '#ef4444',
  approve: '#10b981',
  reject: '#f97316',
  status_change: '#eab308',
  lock: '#71717a',
  unlock: '#14b8a6',
  assign: '#a855f7',
  dispatch: '#6366f1',
  login: '#0ea5e9',
  register: '#84cc16',
  logout: '#64748b',
};

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n as number)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function pctChange(current: number, previous: number): number {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
