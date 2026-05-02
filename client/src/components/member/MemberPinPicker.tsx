import React, { useEffect, useRef, useState } from 'react';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Locate, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const DEFAULT_CENTER = { latitude: 6.5244, longitude: 3.3792 }; // Lagos
const DEFAULT_ZOOM = 12;

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  /** Optional URL of the branch's custom marker icon. */
  markerUrl?: string;
}

/**
 * Self-service pin picker — the member clicks the map (or hits "My Location")
 * to drop a pin representing where they live. Uses Mapbox GL.
 */
const MemberPinPicker: React.FC<Props> = ({ lat, lng, onChange, markerUrl }) => {
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapRef | null>(null);
  const hasPin = lat != null && lng != null;

  useEffect(() => {
    if (!hasPin || !mapRef.current) return;
    mapRef.current.flyTo({ center: [lng!, lat!], zoom: 14, duration: 800 });
  }, [hasPin, lat, lng]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Map disabled — set <code>VITE_MAPBOX_TOKEN</code> in the client env to enable the location picker.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-md overflow-hidden border" style={{ height: 280 }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            latitude: hasPin ? lat! : DEFAULT_CENTER.latitude,
            longitude: hasPin ? lng! : DEFAULT_CENTER.longitude,
            zoom: hasPin ? 14 : DEFAULT_ZOOM,
          }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onClick={(e) => onChange(e.lngLat.lat, e.lngLat.lng)}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {hasPin && (
            <Marker latitude={lat!} longitude={lng!} anchor="bottom">
              {markerUrl ? (
                <img
                  src={markerUrl}
                  alt="pin"
                  className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-lg"
                />
              ) : (
                <MapPin className="h-9 w-9 text-app-primary fill-app-primary/20 drop-shadow" strokeWidth={2.5} />
              )}
            </Marker>
          )}
        </Map>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleLocateMe} disabled={locating}>
          {locating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Locate className="h-3.5 w-3.5 mr-1.5" />}
          Use my current location
        </Button>
        {hasPin && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null, null)}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear pin
          </Button>
        )}
        <span className="text-xs text-gray-500 ml-auto">
          {hasPin ? 'Click the map to move your pin' : 'Click on the map to drop a pin'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Latitude</Label>
          <Input
            type="number"
            step="any"
            value={lat ?? ''}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              onChange(v, lng);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Longitude</Label>
          <Input
            type="number"
            step="any"
            value={lng ?? ''}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              onChange(lat, v);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MemberPinPicker;
