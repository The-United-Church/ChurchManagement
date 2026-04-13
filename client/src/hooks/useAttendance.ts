import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import {
  markAttendanceApi,
  fetchEventAttendanceApi,
  fetchAttendanceSummaryApi,
  removeAttendanceApi,
} from "@/lib/api";
import type { EventAttendanceDTO } from "@/types/event";

export function useEventAttendance(eventId: string, eventDate: string) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.eventAttendance(eventId, eventDate),
    queryFn: async () => {
      const res = await fetchEventAttendanceApi(eventId, eventDate);
      return res.data ?? [];
    },
    enabled: !!eventId && !!eventDate,
    staleTime: 30_000,
  });

  return { records: data ?? [], isLoading };
}

export function useAttendanceSummary(eventId: string) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.attendanceSummary(eventId),
    queryFn: async () => {
      const res = await fetchAttendanceSummaryApi(eventId);
      return res.data ?? [];
    },
    enabled: !!eventId,
  });

  return { summary: data ?? [], isLoading };
}

export function useAttendanceActions(eventId: string, eventDate: string) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.eventAttendance(eventId, eventDate) });
    queryClient.invalidateQueries({ queryKey: queryKeys.attendanceSummary(eventId) });
  };

  const markPresent = async (opts: {
    user_id?: string;
    check_in_lat?: number;
    check_in_lng?: number;
  } = {}): Promise<EventAttendanceDTO | null> => {
    setLoading(true);
    try {
      const res = await markAttendanceApi(eventId, { event_date: eventDate, ...opts });
      toast.success("Attendance marked");
      invalidate();
      return res.data;
    } catch (err: any) {
      toast.error(err.message || "Failed to mark attendance");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const removeRecord = async (userId: string): Promise<boolean> => {
    setLoading(true);
    try {
      await removeAttendanceApi(eventId, userId, eventDate);
      toast.success("Attendance removed");
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to remove attendance");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, markPresent, removeRecord };
}
