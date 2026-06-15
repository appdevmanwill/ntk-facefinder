import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Play, Pause, ChevronLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { getAllFileMetadata, FileMetadata } from '@/hooks/useIndexedDB';

// CSS for the Ken Burns effect
const memoriesCss = `
  @keyframes kenburns {
    0% { transform: scale(1.0) translate(0, 0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: scale(1.2) translate(-2%, -2%); opacity: 0; }
  }
`;

export default function MemoriesPage() {
  const [, setLocation] = useLocation();
  const [photos, setPhotos] = useState<FileMetadata[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = memoriesCss;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    async function loadMemories() {
      const allFiles = await getAllFileMetadata();
      // Only keep photos that actually have a face detected, to ensure high quality "memory" shots
      const memoryShots = allFiles.filter(f => f.facesDetected > 0);
      
      // If we don't have enough face shots, fallback to all scanned photos
      if (memoryShots.length < 3) {
        setPhotos(allFiles.slice(0, 15));
      } else {
        setPhotos(memoryShots.slice(0, 15));
      }
    }
    loadMemories();
  }, []);

  useEffect(() => {
    if (!isPlaying || photos.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 6000); // 6 seconds per photo

    return () => clearInterval(interval);
  }, [isPlaying, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white bg-black">
        <Film className="animate-pulse mr-2" /> Curating your memories...
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col justify-center">
      
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentPhoto.filePath}
            src={'http://localhost:5173'} // In a real app we load the actual Blob/File here
            alt="Memory"
            className="w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 6, ease: "linear" }}
          />
        </AnimatePresence>
        
        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80" />
      </div>

      <div className="relative z-10 p-8 h-full flex flex-col justify-between pointer-events-none">
        
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setLocation('/gallery')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors pointer-events-auto"
          >
            <ChevronLeft /> Back to Gallery
          </button>
          
          <div className="flex items-center gap-2 text-white/50 text-sm tracking-widest font-light uppercase">
            <Film size={16} /> Cinematic Highlights
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex flex-col items-center">
          <h2 className="text-4xl font-serif text-white mb-2 tracking-wide shadow-black drop-shadow-lg">
            {currentPhoto.tags && currentPhoto.tags.length > 0 
              ? currentPhoto.tags[0].toUpperCase() 
              : "A MOMENT IN TIME"}
          </h2>
          <p className="text-white/60 text-sm mb-8 tracking-widest uppercase shadow-black drop-shadow-md">
            {new Date(currentPhoto.lastModified).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
          </p>

          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white pointer-events-auto transition-all"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}
