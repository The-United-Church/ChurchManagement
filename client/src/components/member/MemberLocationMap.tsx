import React, { useEffect, useMemo, useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, MapPin, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChurch } from '@/components/church/ChurchProvider';
import { fetchMapPins, type MapPinDTO } from '@/lib/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const computeCenter = (pins: MapPinDTO[]): { latitude: number; longitude: number; zoom: number } => {
  if (pins.length === 0) return { latitude: 6.5244, longitude: 3.3792, zoom: 10 }; // Lagos
  const lat = pins.reduce((s, p) => s + p.map_pin_lat, 0) / pins.length;
  const lng = pins.reduce((s, p) => s + p.map_pin_lng, 0) / pins.length;
  return { latitude: lat, longitude: lng, zoom: pins.length === 1 ? 13 : 11 };
};

const MemberLocationMap: React.FC = () => {
  const { currentBranch } = useChurch() as any;
  const [pins, setPins] = useState<MapPinDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapPinDTO | null>(null);

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
  }, [currentBranch?.id]);

  const initialView = useMemo(() => computeCenter(pins), [pins]);
  const markerUrl: string | undefined = currentBranch?.map_marker || undefined;

  const fullName = (p: MapPinDTO) =>
    [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Member';

  const initials = (p: MapPinDTO) =>
    fullName(p)
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

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
            Locations of members in {currentBranch?.name || 'this branch'} who have set their pin.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 rounded-full px-3 py-1.5">
          <Users className="h-4 w-4" /> {pins.length} pinned
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
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={initialView}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-right" />

            {pins.map((p) => (
              <Marker
                key={p.id}
                latitude={p.map_pin_lat}
                longitude={p.map_pin_lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelected(p);
                }}
              >
                {markerUrl ? (
                  <img
                    src={markerUrl}
                    alt={fullName(p)}
                    className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                  />
                ) : (
                  <MapPin className="h-9 w-9 text-app-primary fill-app-primary/30 drop-shadow cursor-pointer hover:scale-110 transition-transform" strokeWidth={2.5} />
                )}
              </Marker>
            ))}

            {selected && (
              <Popup
                latitude={selected.map_pin_lat}
                longitude={selected.map_pin_lng}
                anchor="top"
                onClose={() => setSelected(null)}
                closeOnClick={false}
                offset={14}
                maxWidth="260px"
                style={{ padding: 0 }}
              >
                {/* Explicit white card so text is readable regardless of the app theme */}
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
                    <AvatarImage src={selected.profile_img || ''} />
                    <AvatarFallback style={{ fontSize: 13, background: '#e5e7eb', color: '#374151' }}>
                      {initials(selected)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                      {fullName(selected)}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {selected.map_pin_lat.toFixed(4)}, {selected.map_pin_lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      )}

      {!loading && !error && pins.length === 0 && (
        <p className="text-sm text-gray-500">
          No members have set a location pin yet. Members can drop a pin from their profile settings.
        </p>
      )}
    </div>
  );
};

export default MemberLocationMap;
