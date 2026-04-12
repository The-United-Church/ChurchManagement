import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MemberDTO } from '@/lib/api';
import {
  fetchMembersApi,
  createMemberApi,
  updateMemberApi,
  updateMemberBranchRoleApi,
  updateMemberBranchStatusApi,
  deleteMembersApi,
  importMembersApi,
} from '@/lib/api';
import { toast } from 'sonner';
import { useChurch } from '@/components/church/ChurchProvider';
import { queryKeys } from '@/lib/queryKeys';

export type { MemberDTO };

export interface ImportMembersResult {
  created: MemberDTO[];
  duplicates: { email: string; reason: string }[];
  uniqueCount: number;
  duplicateCount: number;
  convertedPersons: { email: string; first_name: string; last_name: string }[];
  convertedCount: number;
}

const PAGE_SIZE = 25;

export function useMemberCrud() {
  const { currentChurch, currentBranch } = useChurch();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [page, setPageState] = useState(1);
  const limit = PAGE_SIZE;
  const [searchTerm, setSearchTermState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search and reset to page 1 on new search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPageState(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const branchId = currentBranch?.id;

  const { data: result = { data: [] as MemberDTO[], total: 0 }, isLoading: loading } = useQuery({
    queryKey: queryKeys.members(branchId, page, limit, debouncedSearch),
    queryFn: async () => {
      const res = await fetchMembersApi({ page, limit, search: debouncedSearch || undefined });
      return { data: res.data ?? [], total: res.total ?? 0 };
    },
    staleTime: 30 * 1000,
  });

  const members = result.data;
  const total = result.total;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const setPage = (p: number) => setPageState(Math.max(1, Math.min(p, totalPages)));
  const setSearchTerm = (s: string) => setSearchTermState(s);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['members', branchId ?? 'all'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.directory(branchId) });
  };

  const load = invalidate;

  const create = async (data: Parameters<typeof createMemberApi>[0]) => {
    setSaving(true);
    try {
      await createMemberApi(data);
      toast.success('Member added successfully. A welcome email with their password has been sent.');
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, data: Partial<{ full_name: string; role: string }>) => {
    setSaving(true);
    try {
      const { role, ...userFields } = data;
      const tasks: Promise<any>[] = [];
      if (Object.keys(userFields).length > 0) tasks.push(updateMemberApi(id, userFields));
      if (role && currentChurch && currentBranch) {
        tasks.push(updateMemberBranchRoleApi(currentChurch.id, currentBranch.id, id, role));
      }
      await Promise.all(tasks);
      toast.success('Member updated successfully');
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update member');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setBranchStatus = async (id: string, is_active: boolean) => {
    setSaving(true);
    try {
      if (!currentChurch || !currentBranch) throw new Error('No branch selected');
      await updateMemberBranchStatusApi(currentChurch.id, currentBranch.id, id, is_active);
      toast.success(is_active ? 'Member activated in this branch' : 'Member deactivated in this branch');
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update member status');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    try {
      if (!currentChurch || !currentBranch) throw new Error('No branch selected');
      await deleteMembersApi(currentChurch.id, currentBranch.id, [id]);
      toast.success('Member removed');
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const removeMany = async (ids: string[]) => {
    setSaving(true);
    try {
      if (!currentChurch || !currentBranch) throw new Error('No branch selected');
      await deleteMembersApi(currentChurch.id, currentBranch.id, ids);
      toast.success(`${ids.length} member(s) removed`);
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove members');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const importMembers = async (
    rows: Parameters<typeof importMembersApi>[0]
  ): Promise<ImportMembersResult | false> => {
    setSaving(true);
    try {
      const res = await importMembersApi(rows);
      invalidate();
      const uniqueCount = res.uniqueCount ?? 0;
      const duplicateCount = res.duplicateCount ?? 0;
      if (uniqueCount > 0) {
        toast.success(`${uniqueCount} member(s) imported. Welcome emails sent.`);
      }
      return {
        created: res.data ?? [],
        duplicates: (res.duplicateData ?? []).map((d: any) => ({
          email: d.email,
          reason: 'Duplicate email',
        })),
        uniqueCount,
        duplicateCount,
        convertedPersons: res.convertedPersons ?? [],
        convertedCount: res.convertedCount ?? 0,
      };
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    members,
    loading,
    saving,
    total,
    page,
    totalPages,
    limit,
    searchTerm,
    setPage,
    setSearchTerm,
    load,
    create,
    update,
    setBranchStatus,
    remove,
    removeMany,
    importMembers,
  };
}
