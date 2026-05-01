import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { queryKeys } from '@/lib/queryKeys';

interface UseRealtimeSyncOptions {
  socket: Socket | null;
  branchId?: string;
}

/**
 * Listens for server-side CRUD events via Socket.IO and invalidates
 * the corresponding TanStack Query caches so all connected clients
 * receive near-real-time updates without manual refresh.
 */
export function useRealtimeSync({ socket, branchId }: UseRealtimeSyncOptions) {
  const queryClient = useQueryClient();

  // Join the current branch room so we receive branch-scoped events
  useEffect(() => {
    if (!socket || !branchId) return;
    socket.emit('join:branch', branchId);
    return () => {
      socket.emit('leave:branch', branchId);
    };
  }, [socket, branchId]);

  // Listen for invalidation events
  useEffect(() => {
    if (!socket) return;

    const onPeopleChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.people(branchId) });
    };

    const onMembersChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.directory(branchId) });
    };

    const onChurchesChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.churches() });
    };

    const onPresenceChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.directory(branchId) });
    };

    socket.on('people:changed', onPeopleChanged);
    socket.on('members:changed', onMembersChanged);
    socket.on('churches:changed', onChurchesChanged);
    socket.on('presence:changed', onPresenceChanged);

    return () => {
      socket.off('people:changed', onPeopleChanged);
      socket.off('members:changed', onMembersChanged);
      socket.off('churches:changed', onChurchesChanged);
      socket.off('presence:changed', onPresenceChanged);
    };
  }, [socket, branchId, queryClient]);
}
