import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useChurch } from '@/components/church/ChurchProvider';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchFollowUps,
  createFollowUpApi,
  updateFollowUpApi,
  deleteFollowUpsApi,
  autoAssignFollowUpsApi,
  bulkAssignFollowUpsApi,
  bulkSetFollowUpStatusApi,
  fetchFollowUpStats,
  fetchFollowUpFunnel,
  fetchFollowUpLogs,
  addFollowUpLogApi,
  fetchSavedFiltersApi,
  createSavedFilterApi,
  deleteSavedFilterApi,
} from '@/lib/api';
import type {
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  FollowUpFiltersState,
  CreateContactLogDTO,
  FollowUp,
} from '@/types/follow-up';

const PAGE_SIZE = 25;

export function useFollowUpsCrud() {
  const { currentBranch } = useChurch();
  const queryClient = useQueryClient();
  const branchId = currentBranch?.id;

  const [saving, setSaving] = useState(false);
  const [page, setPageState] = useState(1);
  const [filters, setFiltersState] = useState<FollowUpFiltersState>({});
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPageState(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const effectiveFilters: FollowUpFiltersState = useMemo(
    () => ({ ...filters, search: debouncedSearch || undefined }),
    [filters, debouncedSearch],
  );

  const { data: result = { data: [] as FollowUp[], total: 0 }, isLoading: loading, refetch } = useQuery({
    enabled: Boolean(branchId),
    queryKey: queryKeys.followUps(branchId, page, PAGE_SIZE, effectiveFilters as unknown as Record<string, unknown>),
    queryFn: async () => {
      const res = await fetchFollowUps({ page, limit: PAGE_SIZE, ...effectiveFilters });
      return { data: res.data ?? [], total: res.total ?? 0 };
    },
    staleTime: 0,
  });

  const followUps = result.data;
  const total = result.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setPage = (p: number) => setPageState(Math.max(1, Math.min(p, totalPages)));
  const setFilters = (f: FollowUpFiltersState | ((prev: FollowUpFiltersState) => FollowUpFiltersState)) => {
    setFiltersState((prev) => (typeof f === 'function' ? (f as any)(prev) : f));
    setPageState(1);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['followUps'] });
    queryClient.invalidateQueries({ queryKey: ['followUpStats'] });
    queryClient.invalidateQueries({ queryKey: ['followUpFunnel'] });
    // Force immediate refetch of the list regardless of staleTime
    refetch();
  };

  const create = async (data: CreateFollowUpDTO) => {
    setSaving(true);
    try {
      const res = await createFollowUpApi(data);
      toast.success('Follow-up created');
      await refetch();
      invalidate();
      return res.data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create follow-up');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, data: UpdateFollowUpDTO) => {
    setSaving(true);
    try {
      const res = await updateFollowUpApi(id, data);
      toast.success('Follow-up updated');
      invalidate();
      queryClient.invalidateQueries({ queryKey: queryKeys.followUp(id) });
      return res.data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow-up');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ids: string[]) => {
    setSaving(true);
    try {
      const res = await deleteFollowUpsApi(ids);
      toast.success(res.message || 'Deleted');
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const assignMany = async (ids: string[], assignedTo: string | null) => {
    setSaving(true);
    try {
      const res = await bulkAssignFollowUpsApi(ids, assignedTo);
      toast.success(res.message || 'Assigned');
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setStatusMany = async (ids: string[], status: string) => {
    setSaving(true);
    try {
      const res = await bulkSetFollowUpStatusApi(ids, status);
      toast.success(res.message || 'Updated');
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const autoAssign = async () => {
    setSaving(true);
    try {
      const res = await autoAssignFollowUpsApi();
      toast.success(res.message || 'Unassigned follow-ups assigned');
      invalidate();
      return res.data?.updated ?? 0;
    } catch (err: any) {
      toast.error(err.message || 'Failed to auto-assign follow-ups');
      return null;
    } finally {
      setSaving(false);
    }
  };

  return {
    branchId,
    followUps,
    total,
    page,
    totalPages,
    limit: PAGE_SIZE,
    loading,
    saving,
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    setPage,
    create,
    update,
    remove,
    assignMany,
    setStatusMany,
    autoAssign,
    invalidate,
    refetch,
  };
}

export function useFollowUpStats() {
  const { currentBranch } = useChurch();
  return useQuery({
    enabled: Boolean(currentBranch?.id),
    queryKey: queryKeys.followUpStats(currentBranch?.id),
    queryFn: async () => (await fetchFollowUpStats()).data,
    staleTime: 30_000,
  });
}

export function useFollowUpFunnel(months = 6) {
  const { currentBranch } = useChurch();
  return useQuery({
    enabled: Boolean(currentBranch?.id),
    queryKey: queryKeys.followUpFunnel(currentBranch?.id, months),
    queryFn: async () => (await fetchFollowUpFunnel(months)).data,
    staleTime: 60_000,
  });
}

export function useFollowUpLogs(followUpId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    enabled: Boolean(followUpId),
    queryKey: queryKeys.followUpLogs(followUpId || ''),
    queryFn: async () => (await fetchFollowUpLogs(followUpId!)).data,
    staleTime: 15_000,
  });

  const addLog = async (data: CreateContactLogDTO) => {
    if (!followUpId) return false;
    try {
      await addFollowUpLogApi(followUpId, data);
      toast.success('Contact logged');
      queryClient.invalidateQueries({ queryKey: queryKeys.followUpLogs(followUpId) });
      queryClient.invalidateQueries({ queryKey: ['followUps'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.followUp(followUpId) });
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to log contact');
      return false;
    }
  };

  return { ...query, addLog };
}

export function useSavedFilters() {
  const { currentBranch } = useChurch();
  const queryClient = useQueryClient();
  const branchId = currentBranch?.id;

  const query = useQuery({
    enabled: Boolean(branchId),
    queryKey: queryKeys.followUpSavedFilters(branchId),
    queryFn: async () => (await fetchSavedFiltersApi()).data,
    staleTime: 60_000,
  });

  const create = async (name: string, filters: FollowUpFiltersState) => {
    try {
      await createSavedFilterApi(name, filters);
      toast.success('Filter saved');
      queryClient.invalidateQueries({ queryKey: queryKeys.followUpSavedFilters(branchId) });
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to save filter');
      return false;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteSavedFilterApi(id);
      toast.success('Filter removed');
      queryClient.invalidateQueries({ queryKey: queryKeys.followUpSavedFilters(branchId) });
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove filter');
      return false;
    }
  };

  return { ...query, create, remove };
}
