import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, MapPin, Navigation, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useChurch } from '@/components/church/ChurchProvider';
import { useSocket } from '@/components/auth/SocketProvider';
import { fetchMapPins, type MapPinDTO } from '@/lib/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const TRAIL_LIMIT = 8;

interface LiveLocation {
  userId: string;
  branchId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  first_name: string | null;
  last_name: string | null;
  profile_img: string | null;
  updated_at: string;
}
interface LiveMember extends LiveLocation {
  trail: { lat: number; lng: number }[];
}

const computeCenter = (
  pins: { lat: number; lng: number }[],
): { latitude: number; longitude: number; zoom: number } => {
  if (pins.length === 0) return { latitude: 6.5244, longitude: 3.3792, zoom: 10 }; // Lagos
  const lat = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
  const lng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;
  return { latitude: lat, longitude: lng, zoom: pins.length === 1 ? 13 : 11 };
};

const fullName = (p: { first_name?: string | null; last_name?: string | null }) =>
  [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Member';

const initialsOf = (p: { first_name?: string | null; last_name?: string | null }) =>
  fullName(p)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

type SelectedKind =
  | { kind: 'pin'; pin: MapPinDTO }
  | { kind: 'live'; member: LiveMember }
  | null;

const MemberLocationMap: React.FC = () => {
  const { currentBranch } = useChurch() as any;
  const { socket, isConnected } = useSocket();
  const branchId: string | undefined = currentBranch?.id;

  const [pins, setPins] = useState<MapPinDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedKind>(null);
  const [liveById, setLiveById] = useState<Record<string, LiveMember>>({});
  const [followLive, setFollowLive] = useState(false);

  const mapRef = useRef<MapRef | null>(null);
  const seenLiveRef = useRef<Set<string>>(new Set());

  // Fetch static pins
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMapPins()
      .then((res) => {
        if (cancelled) return;
        setPins(res.data || []);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load member locations');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  // Live tracking listeners + snapshot request
  useEffect(() => {
    if (!socket || !isConnected || !branchId) return;

    socket.emit(
      'location:request_snapshot',
      { branchId },
      (members: LiveLocation[] | undefined) => {
        if (!Array.isArray(members)) return;
        setLiveById((prev) => {
          const next = { ...prev };
          for (const m of members) {
            if (m.branchId !== branchId) continue;
            next[m.userId] = {
              ...m,
              trail: prev[m.userId]?.trail ?? [{ lat: m.lat, lng: m.lng }],
            };
            seenLiveRef.current.add(m.userId);
          }
          return next;
        });
      },
    );

    const onSnapshot = (data: { branchId: string; members: LiveLocation[] }) => {
      if (!data || data.branchId !== branchId) return;
      setLiveById((prev) => {
        const next = { ...prev };
        for (const m of data.members) {
          next[m.userId] = {
            ...m,
            trail: prev[m.userId]?.trail ?? [{ lat: m.lat, lng: m.lng }],
          };
          seenLiveRef.current.add(m.userId);
        }
        return next;
      });
    };

    const onMoved = (m: LiveLocation) => {
      if (!m || m.branchId !== branchId) return;
      setLiveById((prev) => {
        const existing = prev[m.userId];
        const trail = existing
          ? [...existing.trail, { lat: m.lat, lng: m.lng }].slice(-TRAIL_LIMIT)
          : [{ lat: m.lat, lng: m.lng }];
        return { ...prev, [m.userId]: { ...m, trail } };
      });
    };

    const onJoined = (m: LiveLocation) => {
      if (!m || m.branchId !== branchId) return;
      if (!seenLiveRef.current.has(m.userId)) {
        seenLiveRef.current.add(m.userId);
        toast.success(`${fullName(m)} is now sharing their live location`);
      }
    };

    const onLeft = (data: { userId: string; branchId: string }) => {
      if (!data || data.branchId !== branchId) return;
      setLiveById((prev) => {
        if (!prev[data.userId]) return prev;
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
      seenLiveRef.current.delete(data.userId);
      setSelected((s) =>
        s && s.kind === 'live' && s.member.userId === data.userId ? null : s,
      );
    };

    socket.on('location:snapshot', onSnapshot);
    socket.on('location:member_moved', onMoved);
    socket.on('location:member_joined', onJoined);
    socket.on('location:member_left', onLeft);

    return () => {
      socket.off('location:snapshot', onSnapshot);
      socket.off('location:member_moved', onMoved);
      socket.off('location:member_joined', onJoined);
      socket.off('location:member_left', onLeft);
    };
  }, [socket, isConnected, branchId]);

  const liveList = useMemo(() => Object.values(liveById), [liveById]);

  const initialView = useMemo(() => {
    const allPoints = [
      ...pins.map((p) => ({ lat: p.map_pin_lat, lng: p.map_pin_lng })),
      ...liveList.map((m) => ({ lat: m.lat, lng: m.lng })),
    ];
    return computeCenter(allPoints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  // Auto-fit when followLive is on
  useEffect(() => {
    if (!followLive || liveList.length === 0) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (liveList.length === 1) {
      map.flyTo({ center: [liveList[0].lng, liveList[0].lat], zoom: 14, duration: 800 });
      return;
    }
    let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
    for (const m of liveList) {
      if (m.lat < minLat) minLat = m.lat;
      if (m.lat > maxLat) maxLat = m.lat;
      if (m.lng < minLng) minLng = m.lng;
      if (m.lng > maxLng) maxLng = m.lng;
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 80, duration: 800, maxZoom: 14 },
    );
  }, [followLive, liveList]);

  const trailGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: liveList
        .filter((m) => m.trail.length >= 2)
        .map((m) => ({
          type: 'Feature' as const,
          properties: { userId: m.userId },
          geometry: {
            type: 'LineString' as const,
            coordinates: m.trail.map((p) => [p.lng, p.lat]),
          },
        })),
    };
  }, [liveList]);

  const markerUrl: string | undefined = currentBranch?.map_marker || undefined;

  const focusLiveMember = useCallback((m: LiveMember) => {
    const map = mapRef.current?.getMap();
    if (map) map.flyTo({ center: [m.lng, m.lat], zoom: 15, duration: 700 });
    setSelected({ kind: 'live', member: m });
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Member Map</h2>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Map disabled — set <code>VITE_MAPBOX_TOKEN</code> in the client environment to enable the map.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Member Map</h2>
          <p className="text-sm text-gray-500">
            Locations of members in {currentBranch?.name || 'this branch'} who have set their pin or are sharing live.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 rounded-full px-3 py-1.5">
            <Users className="h-4 w-4" /> {pins.length} pinned
          </div>
          <div
            className={`flex items-center gap-2 text-sm rounded-full px-3 py-1.5 border ${
              liveList.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
            title="Members currently sharing live location"
          >
            <span className="relative flex h-2 w-2">
              {liveList.length > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  liveList.length > 0 ? 'bg-emerald-600' : 'bg-gray-400'
                }`}
              ></span>
            </span>
            {liveList.length} live
          </div>
          <Button
            type="button"
            size="sm"
            variant={followLive ? 'default' : 'outline'}
            onClick={() => setFollowLive((v) => !v)}
            disabled={liveList.length === 0}
            className="gap-1"
          >
            <Navigation className="h-4 w-4" />
            {followLive ? 'Following live' : 'Follow live'}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="rounded-md border bg-white h-[480px] grid place-items-center text-gray-500">
          <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading map…</div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="rounded-md overflow-hidden border bg-white" style={{ height: 560 }}>
          <Map
            ref={(r) => { mapRef.current = r; }}
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={initialView}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-right" />

            {trailGeoJson.features.length > 0 && (
              <Source id="live-trails" type="geojson" data={trailGeoJson as any}>
                <Layer
                  id="live-trails-line"
                  type="line"
                  paint={{
                    'line-color': '#10b981',
                    'line-width': 3,
                    'line-opacity': 0.6,
                    'line-dasharray': [2, 1],
                  }}
                />
              </Source>
            )}

            {pins.map((p) => (
              <Marker
                key={`pin-${p.id}`}
                latitude={p.map_pin_lat}
                longitude={p.map_pin_lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelected({ kind: 'pin', pin: p });
                }}
              >
                {markerUrl ? (
                  <img
                    src={markerUrl}
                    alt={fullName(p)}
                    className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                  />
                ) : (
                  <MapPin
                    className="h-9 w-9 text-app-primary fill-app-primary/30 drop-shadow cursor-pointer hover:scale-110 transition-transform"
                    strokeWidth={2.5}
                  />
                )}
              </Marker>
            ))}

            {liveList.map((m) => (
              <Marker
                key={`live-${m.userId}`}
                latitude={m.lat}
                longitude={m.lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  focusLiveMember(m);
                }}
              >
                <div className="relative flex flex-col items-center cursor-pointer">
                  <div className="absolute -top-5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold tracking-wide shadow">
                    LIVE
                  </div>
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping" />
                    {m.profile_img ? (
                      <img
                        src={m.profile_img}
                        alt={fullName(m)}
                        className="relative h-11 w-11 rounded-full object-cover border-[3px] border-emerald-500 shadow-lg hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="relative h-11 w-11 rounded-full bg-emerald-600 text-white grid place-items-center text-sm font-bold border-[3px] border-emerald-500 shadow-lg">
                        {initialsOf(m)}
                      </div>
                    )}
                  </div>
                </div>
              </Marker>
            ))}

            {selected?.kind === 'pin' && (
              <Popup
                latitude={selected.pin.map_pin_lat}
                longitude={selected.pin.map_pin_lng}
                anchor="top"
                onClose={() => setSelected(null)}
                closeOnClick={false}
                offset={14}
                maxWidth="260px"
                style={{ padding: 0 }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 190,
                  }}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={selected.pin.profile_img || ''} />
                    <AvatarFallback style={{ fontSize: 13, background: '#e5e7eb', color: '#374151' }}>
                      {initialsOf(selected.pin)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                      {fullName(selected.pin)}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {selected.pin.map_pin_lat.toFixed(4)}, {selected.pin.map_pin_lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              </Popup>
            )}

            {selected?.kind === 'live' && (
              <Popup
                latitude={selected.member.lat}
                longitude={selected.member.lng}
                anchor="top"
                onClose={() => setSelected(null)}
                closeOnClick={false}
                offset={18}
                maxWidth="280px"
                style={{ padding: 0 }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                    padding: '10px 14px',
                    minWidth: 220,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={selected.member.profile_img || ''} />
                      <AvatarFallback style={{ fontSize: 13, background: '#e5e7eb', color: '#374151' }}>
                        {initialsOf(selected.member)}
                      </AvatarFallback>
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {fullName(selected.member)}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: '#10b981',
                            color: '#fff',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 999,
                            letterSpacing: 0.4,
                          }}
                        >
                          LIVE
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        {selected.member.lat.toFixed(5)}, {selected.member.lng.toFixed(5)}
                      </div>
                      {selected.member.accuracy != null && (
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          ±{Math.round(selected.member.accuracy)}m accuracy
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        Updated {new Date(selected.member.updated_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      )}

      {liveList.length > 0 && (
        <div className="rounded-md border bg-white p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
            </span>
            <span className="text-sm font-semibold text-gray-800">
              Live now ({liveList.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {liveList.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => focusLiveMember(m)}
                className="flex items-center gap-2 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 text-xs text-emerald-800 transition-colors"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={m.profile_img || ''} />
                  <AvatarFallback style={{ fontSize: 9 }}>{initialsOf(m)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{fullName(m)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && pins.length === 0 && liveList.length === 0 && (
        <p className="text-sm text-gray-500">
          No members have set a location pin or shared live location yet. Members can drop a pin from their profile or enable live sharing in Settings.
        </p>
      )}
    </div>
  );
};

export default MemberLocationMap;
