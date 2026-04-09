import { useState, useCallback } from 'react';
import type { Person, PersonCreateDTO, PersonUpdateDTO } from '@/types/person';
import {
  fetchPeople,
  createPersonApi,
  updatePersonApi,
  deletePersonApi,
  importPeopleApi,
  convertPersonApi,
} from '@/lib/api';
import { toast } from 'sonner';

export function usePeopleCrud() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const res = await fetchPeople(search);
      console.log('Fetched people:', res.data);
      setPeople(res.data ?? []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load people');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (data: PersonCreateDTO) => {
    setSaving(true);
    try {
      const res = await createPersonApi(data);
      // Optimistically add the newly created person to avoid a transient empty list
      if (res?.data) {
        setPeople((prev) => [res.data, ...prev]);
      }
      toast.success('Person added successfully');
      await load();
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
      await load();
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
      await load();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete person');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const importPeople = async (rows: Partial<PersonCreateDTO>[]) => {
    setSaving(true);
    try {
      const res = await importPeopleApi(rows);
      toast.success(res.message || 'Import successful');
      await load();
      return true;
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
      await load();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Conversion failed');
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
      await load();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete people');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { people, loading, saving, load, create, update, remove, removeMany, importPeople, convert };
}
