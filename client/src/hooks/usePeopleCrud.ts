import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Person, PersonCreateDTO, PersonUpdateDTO, ImportPeopleResult } from '@/types/person';
import {
  fetchPeople,
  createPersonApi,
  updatePersonApi,
  deletePersonApi,
  importPeopleApi,
  convertPersonApi,
  bulkConvertPersonsApi,
} from '@/lib/api';
import { toast } from 'sonner';
import { useChurch } from '@/components/church/ChurchProvider';
import { queryKeys } from '@/lib/queryKeys';

const PAGE_SIZE = 25;

export function usePeopleCrud() {
  const { currentBranch } = useChurch();
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

  const { data: result = { data: [] as Person[], total: 0 }, isLoading: loading } = useQuery({
    queryKey: queryKeys.people(branchId, page, limit, debouncedSearch),
    queryFn: async () => {
      const res = await fetchPeople({ page, limit, search: debouncedSearch || undefined });
      return { data: res.data ?? [], total: res.total ?? 0 };
    },
    staleTime: 30 * 1000,
  });

  const people = result.data;
  const total = result.total;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const setPage = (p: number) => setPageState(Math.max(1, Math.min(p, totalPages)));
  const setSearchTerm = (s: string) => setSearchTermState(s);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['people', branchId ?? 'all'] });

  // Keep load() for backward compatibility
  const load = invalidate;

  const create = async (data: PersonCreateDTO) => {
    setSaving(true);
    try {
      await createPersonApi(data);
      toast.success('Person added successfully');
      await invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add person');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, data: PersonUpdateDTO) => {
    setSaving(true);
    try {
      await updatePersonApi(id, data);
      toast.success('Person updated successfully');
      await invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update person');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    try {
      await deletePersonApi([id]);
      toast.success('Person deleted successfully');
      await invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete person');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const importPeople = async (rows: Partial<PersonCreateDTO>[]): Promise<ImportPeopleResult | false> => {
    setSaving(true);
    try {
      const res = await importPeopleApi(rows);
      await invalidate();
      const { valid, duplicates, invalid } = res.data;
      if (valid.length > 0) {
        toast.success(`${valid.length} ${valid.length === 1 ? 'person' : 'people'} imported successfully`);
      } else if (duplicates.length === 0 && invalid.length === 0) {
        toast.success('Import successful');
      }
      return res.data;
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const convert = async (id: string) => {
    setSaving(true);
    try {
      const res = await convertPersonApi(id);
      toast.success(res.message || 'Person converted to member');
      await invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Conversion failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const convertMany = async (ids: string[]) => {
    setSaving(true);
    try {
      const res = await bulkConvertPersonsApi(ids);
      toast.success(res.message || `${res.converted} converted`);
      await invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Bulk conversion failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const removeMany = async (ids: string[]) => {
    setSaving(true);
    try {
      const res = await deletePersonApi(ids);
      toast.success(res.message || `${ids.length} people deleted`);
      await invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete people');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    people,
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
    remove,
    removeMany,
    importPeople,
    convert,
    convertMany,
  };
}
