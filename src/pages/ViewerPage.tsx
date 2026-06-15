import { useEffect, useState, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, Image as ImageIcon } from 'lucide-react';
import { useRoute } from 'wouter';

export default function ViewerPage() {
  const [, params] = useRoute('/viewer/:peerId');
  const hostPeerId = params?.peerId;
  
  const [status, setStatus] = useState<string>('Connecting to secure peer network...');
  const [metadata, setMetadata] = useState<any[]>([]);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    if (!hostPeerId) return;

    const peer = new Peer();
    
    peer.on('open', () => {
      setStatus('Connecting directly to host computer...');
      const conn = peer.connect(hostPeerId);
      
      conn.on('open', () => {
        setStatus('Connected! Requesting library data...');
        conn.send({ type: 'REQUEST_LIBRARY' });
      });

      conn.on('data', (data: any) => {
        if (data.type === 'LIBRARY_DATA') {
          setMetadata(data.payload);
          setStatus('Connected');
        }
      });
      
      conn.on('close', () => {
        setStatus('Host disconnected.');
      });

      connRef.current = conn;
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, [hostPeerId]);

  if (status !== 'Connected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <Loader2 size={48} className="animate-spin mb-4 text-indigo-500" />
        <p className="text-gray-400">{status}</p>
        <div className="mt-8 flex items-center gap-2 text-xs text-emerald-500">
          <ShieldCheck size={14} /> End-to-End Encrypted P2P Connection
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
              Shared Gallery <ShieldCheck size={20} className="text-emerald-500" />
            </h1>
            <p className="text-gray-400">{metadata.length} photos in library</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {metadata.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="aspect-square bg-gray-900 rounded-xl flex flex-col items-center justify-center border border-gray-800"
            >
              <ImageIcon size={32} className="text-gray-700 mb-2" />
              <p className="text-[10px] text-gray-500 text-center px-2 truncate w-full">{item.filename}</p>
              {item.facesDetected > 0 && (
                <div className="absolute top-2 right-2 bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded">
                  {item.facesDetected} faces
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
