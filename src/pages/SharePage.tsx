import { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, Users, ShieldCheck } from 'lucide-react';
import { getAllFileMetadata } from '@/hooks/useIndexedDB';

export default function SharePage() {
  const [peerId, setPeerId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [connections, setConnections] = useState<number>(0);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    // Initialize PeerJS
    const peer = new Peer();
    
    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('connection', (conn) => {
      setConnections(c => c + 1);
      
      conn.on('data', async (data: any) => {
        if (data.type === 'REQUEST_LIBRARY') {
          // Send metadata to client
          const metadata = await getAllFileMetadata();
          conn.send({ type: 'LIBRARY_DATA', payload: metadata });
        }
      });
      
      conn.on('close', () => {
        setConnections(c => Math.max(0, c - 1));
      });
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, []);

  const shareUrl = `${window.location.origin}/viewer/${peerId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 h-full max-w-4xl mx-auto flex flex-col"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Share2 /> P2P Album Sharing
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Share your library directly with family and friends. No cloud storage required. End-to-end encrypted via WebRTC.
        </p>
      </div>

      <div className="p-8 rounded-xl border flex flex-col items-center justify-center gap-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <ShieldCheck size={48} style={{ color: 'var(--success)' }} />
        
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Your Secure Link is Ready</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Anyone with this link will connect directly to your computer to view photos.</p>
          
          {peerId ? (
            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
              <input 
                type="text" 
                readOnly 
                value={shareUrl} 
                className="bg-transparent border-none outline-none flex-1 text-sm text-center px-4"
                style={{ color: 'var(--text-primary)', minWidth: '300px' }}
              />
              <button 
                onClick={copyLink}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                style={{ color: 'var(--accent-primary)' }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          ) : (
            <p className="animate-pulse" style={{ color: 'var(--accent-primary)' }}>Generating secure WebRTC tunnel...</p>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full mt-4" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <Users size={16} />
          <span className="text-sm font-medium">{connections} active viewers connected</span>
        </div>
      </div>
    </motion.div>
  );
}
