import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getAllFileMetadata } from '@/hooks/useIndexedDB';
import type { FileMetadata } from '@/hooks/useIndexedDB';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Fix leaflet icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapPage() {
  const [photosWithGPS, setPhotosWithGPS] = useState<FileMetadata[]>([]);

  useEffect(() => {
    async function loadData() {
      const allFiles = await getAllFileMetadata();
      const withGPS = allFiles.filter(f => f.latitude !== null && f.longitude !== null && f.latitude !== undefined);
      setPhotosWithGPS(withGPS);
    }
    loadData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Geospatial Map</h1>
          <p style={{ color: 'var(--text-muted)' }}>{photosWithGPS.length} photos have GPS coordinates</p>
        </div>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden shadow-lg border" style={{ borderColor: 'var(--border-color)' }}>
        {photosWithGPS.length > 0 ? (
          <MapContainer 
            center={[photosWithGPS[0].latitude!, photosWithGPS[0].longitude!]} 
            zoom={4} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%', background: '#1a1a1a' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {photosWithGPS.map((photo) => (
              <Marker key={photo.filePath} position={[photo.latitude!, photo.longitude!]}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-xs">{photo.filename}</p>
                    <p className="text-[10px] text-gray-500">{photo.tags?.join(', ') || 'No tags'}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-black/20">
            <MapPin size={48} className="mb-4 opacity-30" />
            <p style={{ color: 'var(--text-muted)' }}>No GPS data found in your library.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
