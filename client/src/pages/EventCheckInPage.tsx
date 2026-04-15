import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchPublicEventApi, guestCheckInApi, type PublicEventInfo } from "@/lib/api";
import { CheckCircle, Loader2, MapPin, Calendar, Clock, AlertTriangle } from "lucide-react";
import { DEFAULT_GUEST_FIELDS, type GuestCheckInField } from "@/types/event";

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function isAttendanceOpen(event: PublicEventInfo): { open: boolean; reason?: string } {
  if (!event.accept_attendance) return { open: false, reason: "This event does not accept attendance." };
  if (event.attendance_status === "closed") return { open: false, reason: "Attendance has been closed by the admin." };
  if (event.attendance_status === "scheduled") {
    const now = new Date();
    const opens = event.attendance_opens_at ? new Date(event.attendance_opens_at) : null;
    const closes = event.attendance_closes_at ? new Date(event.attendance_closes_at) : null;
    if (opens && now < opens) return { open: false, reason: `Attendance opens at ${opens.toLocaleString()}.` };
    if (closes && now > closes) return { open: false, reason: `Attendance closed at ${closes.toLocaleString()}.` };
  }
  return { open: true };
}

/** Built-in field IDs that map to dedicated DB columns on guest_attendance */
const BUILTIN_FIELD_IDS = new Set([
  "first_name", "last_name", "email", "phone", "country", "state", "address", "comments",
]);

export const EventCheckInPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<PublicEventInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Track whether we've got a valid GPS position (only used when require_location=true)
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    fetchPublicEventApi(eventId)
      .then((res) => {
        const ev = res.data;
        setEvent(ev);
        // Only block re-submission when the creator has NOT enabled multiple check-ins
        if (!ev.allow_multiple_checkins && localStorage.getItem(`checkin_${eventId}`)) {
          setAlreadySubmitted(true);
        }
      })
      .catch((err) => setLoadError(err.message || "Failed to load event"));
  }, [eventId]);

  const doGetLocation = () => {
    setLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError('Location access was denied. Please enable location for this site in your browser settings, then tap "Try Again".');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // When the event is loaded and requires location, proactively request GPS
  useEffect(() => {
    if (!event?.require_location || coords) return;
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        if (result.state === "denied") {
          setLocationError('Location access has been blocked by your browser. Please enable location for this site in your browser settings, then tap "Try Again".');
          return;
        }
        doGetLocation();
      });
    } else {
      doGetLocation();
    }
  }, [event?.require_location]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (key: string, value: string) =>
    setFormValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !event) return;
    setSubmitError(null);

    // If location is required and we don't have it yet, try once more
    if (event.require_location && !coords) {
      setSubmitting(true);
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation?.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 })
        );
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        // continue below with the now-set coords via local variable
        const freshCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        await submitWithCoords(freshCoords);
      } catch {
        setSubmitError("Location access is required for this event. Please enable location permissions and try again.");
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    await submitWithCoords(coords ?? undefined);
  };

  const submitWithCoords = async (position?: { lat: number; lng: number } | null) => {
    // Split form values into built-in columns vs custom responses
    const builtIn: Record<string, string> = {};
    const custom: Record<string, string> = {};
    for (const [key, val] of Object.entries(formValues)) {
      const trimmed = val.trim();
      if (!trimmed) continue;
      if (BUILTIN_FIELD_IDS.has(key)) {
        builtIn[key] = trimmed;
      } else {
        custom[key] = trimmed;
      }
    }

    try {
      await guestCheckInApi(eventId!, {
        event_date: event!.date,
        first_name: builtIn.first_name || "",
        last_name: builtIn.last_name || "",
        email: builtIn.email || undefined,
        phone: builtIn.phone || undefined,
        country: builtIn.country || undefined,
        state: builtIn.state || undefined,
        address: builtIn.address || undefined,
        comments: builtIn.comments || undefined,
        custom_responses: Object.keys(custom).length > 0 ? custom : undefined,
        check_in_lat: position?.lat,
        check_in_lng: position?.lng,
      });
      localStorage.setItem(`checkin_${eventId!}`, "1");
      setSuccess(true);
      setFormValues({});
    } catch (err: any) {
      setSubmitError(err.message || "Check-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-900">Event not found</p>
          <p className="text-sm text-gray-500">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const { open: attendanceOpen, reason: closedReason } = isAttendanceOpen(event);

  if (success || alreadySubmitted) {
    const canSubmitAgain = event.allow_multiple_checkins && success;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {alreadySubmitted && !success ? "Already checked in" : "You're checked in!"}
          </h2>
          <p className="text-sm text-gray-600">
            {alreadySubmitted && !success
              ? `You have already submitted attendance for ${event?.title ?? "this event"} from this device.`
              : <>Your attendance for <strong>{event!.title}</strong> has been recorded. Welcome!</>}
          </p>
          {canSubmitAgain && (
            <Button variant="outline" size="sm" onClick={() => setSuccess(false)} className="w-full">
              Submit another response
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="bg-white rounded-2xl shadow-sm border w-full max-w-md space-y-6 p-6 sm:p-8">
        {/* Event info header */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{event.date}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatTime(event.time_from)} – {formatTime(event.time_to)}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.location}</span>
          </div>
        </div>

        {!attendanceOpen ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {closedReason}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location requirement banner */}
            {event.require_location && (
              locating ? (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Detecting your location… Please wait.
                </div>
              ) : locationError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <p>{locationError}</p>
                    <button type="button" onClick={doGetLocation} className="text-xs font-semibold underline">
                      Try Again
                    </button>
                  </div>
                </div>
              ) : coords ? (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  Location confirmed. You're good to check in.
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>This event requires you to be at the venue. Your location will be verified on submit.</span>
                </div>
              )
            )}
            {/* Dynamic form fields */}
            {(() => {
              const fields: GuestCheckInField[] = event.guest_checkin_fields ?? DEFAULT_GUEST_FIELDS;
              return fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label htmlFor={`ci-${field.id}`}>
                    {field.label}{field.required ? " *" : " (optional)"}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={`ci-${field.id}`}
                      required={field.required}
                      value={formValues[field.id] ?? ""}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      rows={2}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={`ci-${field.id}`}
                      required={field.required}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={formValues[field.id] ?? ""}
                      onChange={(e) => updateField(field.id, e.target.value)}
                    >
                      <option value="">{field.placeholder || "Select…"}</option>
                      {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`ci-${field.id}`}
                      type={field.type}
                      required={field.required}
                      value={formValues[field.id] ?? ""}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ));
            })()}

            {submitError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || locating || (event.require_location && !!locationError)}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
                : locating
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Getting location…</>
                : "Submit Attendance"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EventCheckInPage;
