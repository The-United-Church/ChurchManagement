import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { useChurch } from '@/components/church/ChurchProvider';
import { fetchMembersApi } from '@/lib/api';
import type { MemberDTO } from '@/lib/api';
import MemberDetailsDialog from './MemberDetailsDialog';

const PAGE_SIZE = 20;

const MemberDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewTarget, setViewTarget] = useState<MemberDTO | null>(null);
  const { currentBranch } = useChurch();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input (400 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const branchId = currentBranch?.id;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['directory', branchId ?? 'all', debouncedSearch],
    queryFn: ({ pageParam }) =>
      fetchMembersApi({ page: pageParam as number, limit: PAGE_SIZE, search: debouncedSearch || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / PAGE_SIZE);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    enabled: !!branchId,
    staleTime: 30 * 1000,
  });

  const allMembers = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Trigger next page load when sentinel div enters the viewport
  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(onIntersect, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  function getDisplayName(member: MemberDTO) {
    const full = member.full_name?.trim();
    if (full) return full;

    const first = member.first_name?.trim() || '';
    const last = member.last_name?.trim() || '';
    const combined = `${first} ${last}`.trim();
    return combined || member.email;
  }

  const getProfileImage = (member: MemberDTO) =>
    member.profile_img || member.profile_image || '';

  const getRoleColor = (role: string) => {
    const normalized = role.toLowerCase();
    switch (normalized) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'super_admin':
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'coordinator':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Member Directory</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Members in the selected branch
          </p>
        </div>
        <Badge variant="secondary" className="text-xs md:text-sm self-start sm:self-auto">
          {total > 0 ? `${allMembers.length} / ${total} Members` : 'Members'}
        </Badge>
      </div>

      {!currentBranch && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Select a branch to view members.</p>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className={!currentBranch ? 'opacity-60 pointer-events-none' : ''}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={!currentBranch}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && currentBranch && (
        <Card>
          <CardContent className="p-8 text-center flex items-center justify-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading members...
          </CardContent>
        </Card>
      )}

      {/* Members Grid */}
      {!isLoading && currentBranch && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {allMembers.map((member) => {
            const displayName = getDisplayName(member);
            const displayRole = member.branch_role || member.role || 'member';
            return (
              <Card key={member.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewTarget(member)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={getProfileImage(member)} />
                        <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                      </Avatar>
                      {member.is_online === true && (
                        <span
                          aria-label="Online"
                          title="Online"
                          className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{displayName}</h3>
                        <Badge className={`text-xs ${getRoleColor(displayRole)}`}>
                          {displayRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{member.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sentinel element — triggers next page when it scrolls into view */}
      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && currentBranch && allMembers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No members found matching your search.</p>
          </CardContent>
        </Card>
      )}

      <MemberDetailsDialog
        open={!!viewTarget}
        onOpenChange={(open) => { if (!open) setViewTarget(null); }}
        member={viewTarget}
      />
    </div>
  );
};

export default MemberDirectory;