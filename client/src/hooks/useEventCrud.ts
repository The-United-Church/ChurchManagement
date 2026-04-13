import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchEventsApi,
  fetchEventByIdApi,
  createEventApi,
  updateEventApi,
  deleteEventApi,
} from "@/lib/api";
import type { CreateEventInput, UpdateEventInput, EventDTO } from "@/types/event";
import { useChurch } from "@/components/church/ChurchProvider";

export function useEventList(page = 1, category?: string) {
  const { currentBranch } = useChurch();
  const branchId = currentBranch?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.events(branchId, page, category),
    queryFn: async () => {
      const res = await fetchEventsApi({ page, limit: 25, category });
      return { events: res.data ?? [], total: res.total ?? 0 };
    },
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    events: data?.events ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
  };
}

export function useEvent(id: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.event(id ?? ""),
    queryFn: () => fetchEventByIdApi(id!),
    enabled: !!id,
    select: (res) => res.data,
  });
  return { event: data ?? null, isLoading };
}

export function useEventCrud() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["events"] });

  const create = async (data: CreateEventInput): Promise<EventDTO | null> => {
    setSaving(true);
    try {
      const res = await createEventApi(data);
      toast.success("Event created successfully");
      invalidate();
      return res.data;
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, data: UpdateEventInput): Promise<boolean> => {
    setSaving(true);
    try {
      await updateEventApi(id, data);
      toast.success("Event updated successfully");
      invalidate();
      queryClient.invalidateQueries({ queryKey: queryKeys.event(id) });
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update event");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    setSaving(true);
    try {
      await deleteEventApi(id);
      toast.success("Event deleted");
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to delete event");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { saving, create, update, remove };
}
