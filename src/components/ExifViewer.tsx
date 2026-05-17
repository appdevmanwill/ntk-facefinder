import { Camera, Aperture, Clock, Sun, MapPin, Calendar, Ruler, HardDrive } from 'lucide-react';

interface ExifData {
  camera?: string;
  lens?: string;
  iso?: string;
  shutter?: string;
  aperture?: string;
  focalLength?: string;
  flash?: string;
  whiteBalance?: string;
  date?: string;
  dimensions?: string;
  size?: string;
  gps?: { lat: number; lng: number } | null;
}

interface ExifViewerProps {
  data: ExifData;
  compact?: boolean;
}

export default function ExifViewer({ data, compact = false }: ExifViewerProps) {
  const items = [
    { icon: Camera, label: 'Camera', value: data.camera },
    { icon: Aperture, label: 'Aperture', value: data.aperture },
    { icon: Clock, label: 'Shutter', value: data.shutter },
    { icon: Sun, label: 'ISO', value: data.iso },
    { icon: Ruler, label: 'Dimensions', value: data.dimensions },
    { icon: HardDrive, label: 'Size', value: data.size },
    { icon: Calendar, label: 'Date', value: data.date },
    { icon: MapPin, label: 'Location', value: data.gps ? `${data.gps.lat.toFixed(4)}, ${data.gps.lng.toFixed(4)}` : undefined },
  ].filter(item => item.value);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 4).map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <item.icon size={12} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        Photo Details
      </h4>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <item.icon size={14} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs w-20" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// Panel version for lightbox
interface ExifPanelProps {
  data: ExifData;
  people?: string[];
  albums?: string[];
}

export function ExifPanel({ data, people = [], albums = [] }: ExifPanelProps) {
  return (
    <div className="space-y-6 p-4" style={{ borderTop: '1px solid var(--border)' }}>
      {/* Basic Info */}
      <ExifViewer data={data} />

      {/* People Tags */}
      {people.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            People in Photo
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {people.map((name, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{ background: 'var(--accent-primary)', color: 'white' }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Albums
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {albums.map((album, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-md text-xs"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                {album}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
