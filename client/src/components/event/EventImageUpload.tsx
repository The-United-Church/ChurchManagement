import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

export const EventImageUpload: React.FC<Props> = ({ value, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "events");
      onChange(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>Event Image (optional)</Label>

      {value ? (
        <div className="relative w-full h-40 rounded-md overflow-hidden border">
          <img src={value} alt="Event" className="w-full h-full object-cover" />
          <button
            type="button"
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload an image</span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
