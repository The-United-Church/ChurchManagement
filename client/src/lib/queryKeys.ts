export const queryKeys = {
  people: (branchId?: string, page?: number, limit?: number, search?: string) =>
    ['people', branchId ?? 'all', page ?? 1, limit ?? 25, search ?? ''] as const,
  members: (branchId?: string, page?: number, limit?: number, search?: string) =>
    ['members', branchId ?? 'all', page ?? 1, limit ?? 25, search ?? ''] as const,
  churches: () => ['churches'] as const,
  directory: (branchId?: string) => ['directory', branchId ?? 'all'] as const,
} as const;
