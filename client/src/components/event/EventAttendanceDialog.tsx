import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEventAttendance, useAttendanceActions } from "@/hooks/useAttendance";
import { useChurch } from "@/components/church/ChurchProvider";
import { useProfile } from "@/hooks/useAuthQuery";
import { fetchMembersApi, type MemberDTO } from "@/lib/api";
import { toast } from "sonner";
import type { EventDTO } from "@/types/event";
import { CheckCircle, XCircle, MapPin, Loader2, Clock } from "lucide-react";

interface Props {
  event: EventDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helper: is attendance currently open? ────────────────────────────────────
function isAttendanceOpen(event: EventDTO): { open: boolean; reason?: string } {
  if (!event.accept_attendance) return { open: false, reason: "This event does not accept attendance." };
  if (event.attendance_status === "closed") return { open: false, reason: "Attendance has been closed by the admin." };
  if (event.attendance_status === "open") return { open: true };
  if (event.attendance_status === "scheduled") {
    const now = new Date();
    const opens = event.attendance_opens_at ? new Date(event.attendance_opens_at) : null;
    const closes = event.attendance_closes_at ? new Date(event.attendance_closes_at) : null;
    if (opens !== null && now < opens)
      return { open: false, reason: `Attendance opens at ${opens.toLocaleString()}.` };
    if (closes !== null && now > closes)
      return { open: false, reason: `Attendance closed at ${closes.toLocaleString()}.` };
    return { open: true };
  }
  return { open: true }; // null = always open
}

function getMemberDisplayName(m: MemberDTO) {
  return m.full_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email;
}

// ── Root dialog ───────────────────────────────────────────────────────────────
export const EventAttendanceDialog: React.FC<Props> = ({ event, open, onOpenChange }) => {
  const { branchRole, effectiveRole } = useChurch();
  const isAdmin = ["admin", "coordinator"].includes(branchRole ?? "") || ["admin", "super_admin"].includes(effectiveRole);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attendance – {event.title}</DialogTitle>
        </DialogHeader>
        {isAdmin
          ? <AdminAttendanceView event={event} />
          : <MemberAttendanceView event={event} />}
      </DialogContent>
    </Dialog>
  );
};

// ── Member view ───────────────────────────────────────────────────────────────
const MemberAttendanceView: React.FC<{ event: EventDTO }> = ({ event }) => {
  const today = new Date().toISOString().split("T")[0];
  const { data: profile } = useProfile();
  const { records, isLoading } = useEventAttendance(event.id, today);
  const { loading, markPresent } = useAttendanceActions(event.id, today);

  const { open: attendanceOpen, reason } = isAttendanceOpen(event);
  const alreadyMarked = !!profile?.id && records.some((r) => r.user_id === profile.id);

  const handleCheckIn = async () => {
    if (event.require_location) {
      let position: GeolocationPosition;
      try {
        position = await getCurrentPosition();
      } catch {
        toast.error("Location access is required to check in. Please enable location and try again.");
        return;
      }
      await markPresent({ check_in_lat: position.coords.latitude, check_in_lng: position.coords.longitude });
    } else {
      await markPresent();
    }
  };

  if (isLoading) return <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>;

  if (!attendanceOpen) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Clock className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{reason}</p>
      </div>
    );
  }

  if (alreadyMarked) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="h-10 w-10 text-green-500" />
        <p className="font-medium text-green-700">Attendance marked!</p>
        <p className="text-sm text-muted-foreground">You have already checked in for today's event.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {event.require_location && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-4 w-4" /> You must be at the venue to check in.
        </p>
      )}
      <Button size="lg" onClick={handleCheckIn} disabled={loading} className="w-full sm:w-auto">
        {loading
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking in…</>
          : <><CheckCircle className="h-4 w-4 mr-2" />Mark My Attendance</>}
      </Button>
    </div>
  );
};

// ── Admin view ────────────────────────────────────────────────────────────────
const AdminAttendanceView: React.FC<{ event: EventDTO }> = ({ event }) => {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const { records, isLoading } = useEventAttendance(event.id, selectedDate);
  const { loading, markPresent, removeRecord } = useAttendanceActions(event.id, selectedDate);

  // Member search state
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<MemberDTO[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDTO | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchText(val);
    setSelectedMember(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetchMembersApi({ search: val.trim(), limit: 8 });
        setSearchResults(res.data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSelectMember = (m: MemberDTO) => {
    setSelectedMember(m);
    setSearchText(getMemberDisplayName(m));
    setSearchResults([]);
  };

  const handleAdminMark = async () => {
    if (!selectedMember) return;
    const ok = await markPresent({ user_id: selectedMember.id });
    if (ok) {
      setSelectedMember(null);
      setSearchText("");
      setSearchResults([]);
    }
  };

  return (
    <div className="space-y-4 mt-2">
      {/* Date picker — shared across both tabs */}
      <div className="space-y-1.5">
        <Label htmlFor="att-date">Date</Label>
        <Input id="att-date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
      </div>

      <Tabs defaultValue="mark">
        <TabsList className="w-full">
          <TabsTrigger value="mark" className="flex-1">Mark Attendance</TabsTrigger>
          <TabsTrigger value="attendees" className="flex-1">
            Attendees
            {records.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{records.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Mark tab ── */}
        <TabsContent value="mark" className="mt-4">
          <div className="space-y-2">
            <Label>Search member by name</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Type member name to search…"
                  value={searchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                disabled={!selectedMember || loading}
                onClick={handleAdminMark}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Marking…</>
                  : "Mark Present"}
              </Button>
            </div>

            {/* Dropdown results — shown below the row, never behind the list */}
            {searchResults.length > 0 && (
              <div className="rounded-md border bg-background shadow-sm overflow-hidden">
                {searchResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none border-b last:border-b-0"
                    onMouseDown={(e) => { e.preventDefault(); handleSelectMember(m); }}
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-xs uppercase text-muted-foreground">
                      {getMemberDisplayName(m).charAt(0)}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-medium truncate">{getMemberDisplayName(m)}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    {selectedMember?.id === m.id && (
                      <CheckCircle className="ml-auto h-4 w-4 text-green-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedMember && searchResults.length === 0 && (
              <div className="flex items-center gap-2 rounded-md border bg-green-50 px-3 py-2 text-sm text-green-800">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Selected: <strong>{getMemberDisplayName(selectedMember)}</strong></span>
                <button
                  type="button"
                  className="ml-auto text-xs underline text-muted-foreground hover:text-foreground"
                  onClick={() => { setSelectedMember(null); setSearchText(""); }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Attendees tab ── */}
        <TabsContent value="attendees" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No attendance recorded for this date.</p>
          ) : (
            <ul className="divide-y rounded-md border overflow-hidden max-h-72 overflow-y-auto">
              {records.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-3 py-2.5 text-sm bg-background hover:bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold uppercase text-muted-foreground">
                      {(r.user?.full_name || r.user?.first_name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {r.user?.full_name || r.user?.first_name || r.user?.email || r.user_id}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {r.marked_by && r.marked_by !== r.user_id && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">Admin marked</Badge>
                        )}
                        {r.check_in_lat != null && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600">
                            <MapPin className="h-2.5 w-2.5" />GPS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeRecord(r.user_id)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
}
