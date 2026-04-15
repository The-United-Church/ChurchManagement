import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useEventAttendance, useAttendanceActions, useGuestAttendance } from "@/hooks/useAttendance";
import { useChurch } from "@/components/church/ChurchProvider";
import { useProfile } from "@/hooks/useAuthQuery";
import { fetchMembersApi, type MemberDTO } from "@/lib/api";
import type { EventDTO } from "@/types/event";
import { CheckCircle, XCircle, MapPin, Loader2, Clock, Users, QrCode, CalendarDays, ChevronDown, ChevronUp, UserCheck } from "lucide-react";

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
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ── Sticky dialog header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold">{event.title}</DialogTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{event.date}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{event.time_from} – {event.time_to}</span>
            {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
          </div>
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isAdmin
            ? <AdminAttendanceView event={event} />
            : <MemberAttendanceView event={event} />}
        </div>
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
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [locating, setLocating] = useState(false);

  const { open: attendanceOpen, reason } = isAttendanceOpen(event);
  const alreadyMarked = !!profile?.id && records.some((r) => r.user_id === profile.id);

  const handleCheckIn = async () => {
    setCheckInError(null);
    setCheckInSuccess(false);
    try {
      let result;
      if (event.require_location) {
        let position: GeolocationPosition;
        try {
          setLocating(true);
          position = await getCurrentPosition();
        } catch {
          setCheckInError("Location access is required to check in. Please enable location and try again.");
          return;
        } finally {
          setLocating(false);
        }
        result = await markPresent({ check_in_lat: position.coords.latitude, check_in_lng: position.coords.longitude });
      } else {
        result = await markPresent();
      }
      if (result) {
        setCheckInSuccess(true);
      }
    } catch (err: any) {
      setCheckInError(err.message || "Failed to mark attendance");
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

  if (alreadyMarked || checkInSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="h-10 w-10 text-green-500" />
        <p className="font-medium text-green-700">Attendance marked!</p>
        <p className="text-sm text-muted-foreground">You have already checked in for today's event.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-10">
      {event.require_location && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5 bg-muted rounded-lg px-4 py-2">
          <MapPin className="h-4 w-4 shrink-0" /> You must be at the venue to check in.
        </p>
      )}
      {checkInError && (
        <div className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          <span>{checkInError}</span>
        </div>
      )}
      <Button size="lg" onClick={handleCheckIn} disabled={loading || locating} className="px-10">
        {locating
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Getting location…</>
          : loading
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking in…</>
          : <><UserCheck className="h-4 w-4 mr-2" />Mark My Attendance</>}
      </Button>
    </div>
  );
};

// ── Admin view ────────────────────────────────────────────────────────────────
const AdminAttendanceView: React.FC<{ event: EventDTO }> = ({ event }) => {
  const [selectedDate, setSelectedDate] = useState(event.date);
  const { records, isLoading } = useEventAttendance(event.id, selectedDate);
  const { guests, isLoading: guestsLoading } = useGuestAttendance(event.id, selectedDate);
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
    <div className="space-y-5">
      {/* ── Date picker + stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-1 flex-1">
          <Label htmlFor="att-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</Label>
          <Input id="att-date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-44" />
        </div>
        {/* Stats chips */}
        {(!isLoading && !guestsLoading) && (
          <div className="flex gap-2 pb-0.5">
            <div className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm font-medium">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{records.length}</span>
              <span className="text-muted-foreground font-normal">member{records.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm font-medium">
              <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{guests.length}</span>
              <span className="text-muted-foreground font-normal">guest{guests.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <Tabs defaultValue="mark">
        <TabsList className="w-full">
          <TabsTrigger value="mark" className="flex-1">Mark Attendance</TabsTrigger>
          <TabsTrigger value="attendees" className="flex-1">
            Members
            {records.length > 0 && <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">{records.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="guests" className="flex-1">
            Guests
            {guests.length > 0 && <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">{guests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── Mark tab ── */}
        <TabsContent value="mark" className="mt-5">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Search a member by name and mark them as present for the selected date.</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search member name…"
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
                  ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Marking…</>
                  : <><UserCheck className="h-4 w-4 mr-1.5" />Mark Present</>}
              </Button>
            </div>

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
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                <span>Selected: <strong>{getMemberDisplayName(selectedMember)}</strong></span>
                <button
                  type="button"
                  className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={() => { setSelectedMember(null); setSearchText(""); }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Members tab ── */}
        <TabsContent value="attendees" className="mt-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No members checked in for this date.</p>
            </div>
          ) : (
            <ul className="divide-y rounded-lg border overflow-hidden max-h-80 overflow-y-auto">
              {records.map((r) => (
                <li key={r.id} className="group flex items-center justify-between px-3 py-3 text-sm bg-background hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold uppercase text-muted-foreground">
                      {(r.user?.full_name || r.user?.first_name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {r.user?.full_name || [r.user?.first_name, r.user?.last_name].filter(Boolean).join(" ") || r.user?.email || r.user_id}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.user?.email && <span className="text-xs text-muted-foreground truncate">{r.user.email}</span>}
                        {r.marked_by && r.marked_by !== r.user_id && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">Admin</Badge>
                        )}
                        {r.check_in_lat != null && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                            <MapPin className="h-2.5 w-2.5" />GPS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 transition-opacity"
                    onClick={() => removeRecord(r.user_id)}
                    disabled={loading}
                    title="Remove attendance"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ── Guests tab ── */}
        <TabsContent value="guests" className="mt-5">
          {guestsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : guests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <QrCode className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No guest QR check-ins for this date.</p>
            </div>
          ) : (
            <ul className="divide-y rounded-lg border overflow-hidden max-h-80 overflow-y-auto">
              {guests.map((g) => <GuestRow key={g.id} guest={g} />)}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Expandable guest row ──────────────────────────────────────────────────────
const GuestRow: React.FC<{ guest: import("@/lib/api").GuestAttendeeRecord }> = ({ guest }) => {
  const [expanded, setExpanded] = useState(false);
  const hasExtras =
    guest.phone || guest.country || guest.state || guest.address || guest.comments ||
    (guest.custom_responses && Object.keys(guest.custom_responses).length > 0);

  return (
    <li className="bg-background">
      {/* Summary row */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-3 py-3 text-sm hover:bg-muted/40 transition-colors"
        onClick={() => hasExtras && setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-semibold uppercase text-blue-700">
          {guest.first_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-medium">{guest.first_name} {guest.last_name}</p>
          {guest.email && <p className="text-xs text-muted-foreground truncate">{guest.email}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50/80">
            <QrCode className="h-2.5 w-2.5 mr-1" />QR
          </Badge>
          {hasExtras && (
            expanded
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 bg-muted/20 border-t text-sm space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2">
            {guest.phone && (
              <div><span className="text-xs font-medium text-muted-foreground">Phone</span><p>{guest.phone}</p></div>
            )}
            {guest.country && (
              <div><span className="text-xs font-medium text-muted-foreground">Country</span><p>{guest.country}</p></div>
            )}
            {guest.state && (
              <div><span className="text-xs font-medium text-muted-foreground">State</span><p>{guest.state}</p></div>
            )}
            {guest.address && (
              <div className="col-span-2"><span className="text-xs font-medium text-muted-foreground">Address</span><p>{guest.address}</p></div>
            )}
            {guest.comments && (
              <div className="col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Comments</span>
                <p className="italic text-muted-foreground">"{guest.comments}"</p>
              </div>
            )}
          </div>
          {guest.custom_responses && Object.keys(guest.custom_responses).length > 0 && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {Object.entries(guest.custom_responses).map(([key, val]) => (
                  <div key={key} className="col-span-1">
                    <span className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                    <p>{val}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
};

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
}
