export const queryKeys = {
  people: (branchId?: string, page?: number, limit?: number, search?: string) =>
    ['people', branchId ?? 'all', page ?? 1, limit ?? 25, search ?? ''] as const,
  members: (branchId?: string, page?: number, limit?: number, search?: string, role?: string) =>
    ['members', branchId ?? 'all', page ?? 1, limit ?? 25, search ?? '', role ?? ''] as const,
  churches: () => ['churches'] as const,
  directory: (branchId?: string) => ['directory', branchId ?? 'all'] as const,
  branches: (denominationId?: string) => ['branches', denominationId ?? 'all'] as const,
  events: (branchId?: string, page?: number, category?: string) =>
    ['events', branchId ?? 'all', page ?? 1, category ?? ''] as const,
  event: (id: string) => ['event', id] as const,
  eventAttendance: (eventId: string, date: string) =>
    ['eventAttendance', eventId, date] as const,
  attendanceSummary: (eventId: string) => ['attendanceSummary', eventId] as const,
  followUps: (branchId?: string, page?: number, limit?: number, filters?: Record<string, unknown>) =>
    ['followUps', branchId ?? 'all', page ?? 1, limit ?? 25, JSON.stringify(filters ?? {})] as const,
  followUp: (id: string) => ['followUp', id] as const,
  followUpStats: (branchId?: string) => ['followUpStats', branchId ?? 'all'] as const,
  followUpFunnel: (branchId?: string, months?: number) =>
    ['followUpFunnel', branchId ?? 'all', months ?? 6] as const,
  followUpLogs: (followUpId: string) => ['followUpLogs', followUpId] as const,
  followUpSavedFilters: (branchId?: string) => ['followUpSavedFilters', branchId ?? 'all'] as const,
} as const;
