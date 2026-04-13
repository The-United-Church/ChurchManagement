import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Locate, Loader2 } from "lucide-react";

// Fix Leaflet default icon issue with bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Props {
  lat: number | null;
  lng: number | null;
  radius: number | null;
  onChangeLocation: (lat: number | null, lng: number | null) => void;
  onChangeRadius: (radius: number | null) => void;
}

const DEFAULT_CENTER: [number, number] = [6.5244, 3.3792]; // Lagos
const DEFAULT_ZOOM = 13;
const DEFAULT_RADIUS = 200;

/** Handles click-to-place-marker on the map */
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Flies to a given position */
function FlyToPosition({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 16, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

export const LocationMapPicker: React.FC<Props> = ({ lat, lng, radius, onChangeLocation, onChangeRadius }) => {
  const [locating, setLocating] = useState(false);
  const effectiveRadius = radius ?? DEFAULT_RADIUS;
  const hasMarker = lat != null && lng != null;
  const center: [number, number] = hasMarker ? [lat!, lng!] : DEFAULT_CENTER;

  const handleLocateMe = async () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChangeLocation(pos.coords.latitude, pos.coords.longitude);
        if (!radius) onChangeRadius(DEFAULT_RADIUS);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleMapClick = (clickLat: number, clickLng: number) => {
    onChangeLocation(clickLat, clickLng);
    if (!radius) onChangeRadius(DEFAULT_RADIUS);
  };

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative rounded-md overflow-hidden border" style={{ height: 260 }}>
        <MapContainer
          center={center}
          zoom={hasMarker ? 16 : DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
          {hasMarker && (
            <>
              <Marker position={[lat!, lng!]} />
              <Circle center={[lat!, lng!]} radius={effectiveRadius} pathOptions={{ color: "#6366F1", fillOpacity: 0.15 }} />
              <FlyToPosition lat={lat!} lng={lng!} />
            </>
          )}
        </MapContainer>

        {/* Locate button overlay */}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 z-[400] shadow-md"
          onClick={handleLocateMe}
          disabled={locating}
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
          <span className="ml-1 hidden sm:inline">My Location</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        <MapPin className="inline h-3 w-3 mr-1" />
        Click the map to set the event location, or use "My Location".
      </p>

      {/* Manual override inputs + radius */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ev-lat">Latitude</Label>
          <Input
            id="ev-lat"
            type="number"
            step="any"
            value={lat ?? ""}
            onChange={(e) => onChangeLocation(e.target.value ? Number(e.target.value) : null, lng)}
            placeholder="e.g. 6.5244"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-lng">Longitude</Label>
          <Input
            id="ev-lng"
            type="number"
            step="any"
            value={lng ?? ""}
            onChange={(e) => onChangeLocation(lat, e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 3.3792"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-radius">Radius (m)</Label>
          <Input
            id="ev-radius"
            type="number"
            min={10}
            value={radius ?? ""}
            onChange={(e) => onChangeRadius(e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 200"
          />
        </div>
      </div>
    </div>
  );
};
