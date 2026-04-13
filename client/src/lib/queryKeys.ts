export const queryKeys = {
  people: (branchId?: string, page?: number, limit?: number, search?: string) =>
    ['people', branchId ?? 'all', page ?? 1, limit ?? 25, search ?? ''] as const,
  members: (branchId?: string, page?: number, limit?: number, search?: string) =>
    ['members', branchId ?? 'all', page ?? 1, limit ?? 25, search ?? ''] as const,
  churches: () => ['churches'] as const,
  directory: (branchId?: string) => ['directory', branchId ?? 'all'] as const,
  events: (branchId?: string, page?: number, category?: string) =>
    ['events', branchId ?? 'all', page ?? 1, category ?? ''] as const,
  event: (id: string) => ['event', id] as const,
  eventAttendance: (eventId: string, date: string) =>
    ['eventAttendance', eventId, date] as const,
  attendanceSummary: (eventId: string) => ['attendanceSummary', eventId] as const,
} as const;
