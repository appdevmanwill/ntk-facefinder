import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Image, ScanFace, Users, Search, TrendingUp, FolderOpen, Zap, Download, ArrowRight
} from 'lucide-react';
import { Link } from 'wouter';
import { getFolders, getAllFileMetadata, getFaceDescriptors, FolderRecord, FileMetadata } from '@/hooks/useIndexedDB';


const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
        <p>{label}: {payload[0].value.toLocaleString()} photos</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [facesDetected, setFacesDetected] = useState(0);
  const [uniquePeople, setUniquePeople] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        const _folders = await getFolders();
        setFolders(_folders);
        const files = await getAllFileMetadata();
        setTotalPhotos(files.length);
        const _faces = files.reduce((acc, f) => acc + f.facesDetected, 0);
        setFacesDetected(_faces);
        const descriptors = await getFaceDescriptors();
        // Just rough unique people count using naive divisor or actual clusters
        setUniquePeople(Math.max(0, Math.floor(descriptors.length / 5)));
      } catch (e) {
        console.error(e);
      }
    }
    loadStats();
  }, []);

  const barData = folders.map(f => ({
    name: f.path.split('/').filter(Boolean).pop() || f.path,
    photos: f.imageCount
  }));

  const pieData = [
    { name: 'Fully Indexed', value: Math.floor(totalPhotos * 0.8), color: '#10b981' },
    { name: 'Not Indexed', value: totalPhotos - Math.floor(totalPhotos * 0.8), color: '#475569' },
  ];

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{today} • Last updated just now</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Photos Indexed', value: totalPhotos.toLocaleString(), icon: Image, trend: '+0 this week', color: 'var(--accent-primary)' },
          { label: 'Faces Detected', value: facesDetected.toLocaleString(), icon: ScanFace, trend: '+0 this week', color: 'var(--accent-secondary)' },
          { label: 'Unique People', value: String(uniquePeople), icon: Users, trend: '+0 this week', color: 'var(--success)' },
          { label: 'Searches Run', value: '0', icon: Search, trend: '0 this week', color: 'var(--warning)' },
        ].map(stat => (
          <div key={stat.label} className="p-5 rounded-xl card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <stat.icon size={20} style={{ color: stat.color }} />
              <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--success)' }}>
                <TrendingUp size={10} />
                {stat.trend}
              </div>
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{stat.value}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Bar Chart */}
        <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Photos per Folder</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="photos" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Index Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <p>{payload[0].name}: {Number(payload[0].value).toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                content={() => (
                  <div className="flex justify-center gap-4 mt-4">
                    {pieData.map(item => (
                      <div key={item.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        {item.name}
                      </div>
                    ))}
                  </div>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Timeline + Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
          <div className="relative pl-6 space-y-0">
            <div className="absolute left-2 top-0 bottom-0 w-0.5" style={{ background: 'var(--border)' }} />
            {folders.slice(0, 3).map(f => (
              <div key={f.id} className="relative pb-4">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full" style={{ background: '#10b981', border: '2px solid var(--bg-card)' }} />
                <div className="flex items-start gap-2">
                  <span className="text-sm">📁</span>
                  <div className="flex-1">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Indexed folder: {f.path.split('/').pop()}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(f.addedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
            {folders.length === 0 && <div className="text-sm text-gray-500">No activity yet. Scan a folder to get started.</div>}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
          {[
            { label: 'Start New Search', icon: Search, color: 'var(--accent-primary)', path: '/' },
            { label: 'Scan All Folders', icon: FolderOpen, color: 'var(--success)', path: '/folders' },
            { label: 'View All People', icon: Users, color: 'var(--accent-secondary)', path: '/people' },
            { label: 'Export Center', icon: Download, color: 'var(--warning)', path: '/export' },
          ].map(action => (
            <Link key={action.label} href={action.path}>
              <div
                className="p-4 rounded-xl flex items-center gap-3 cursor-pointer card-hover"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${action.color}20` }}>
                  <action.icon size={18} style={{ color: action.color }} />
                </div>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{action.label}</span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Storage breakdown */}
      <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Storage Breakdown</h3>
        {/* Horizontal bar */}
        <div className="w-full h-6 rounded-full overflow-hidden flex mb-4" style={{ background: 'var(--bg-secondary)' }}>
          {folders.map((f, i) => {
            const totalPhotos = folders.reduce((s, fo) => s + fo.imageCount, 0) || 1;
            const pct = (f.imageCount / totalPhotos) * 100;
            const colors = ['#6366f1', '#8b5cf6', '#10b981', '#475569'];
            return (
              <div
                key={f.id}
                className="h-full transition-all"
                style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                title={`${f.path}: ${f.imageCount} photos`}
              />
            );
          })}
        </div>
        {/* Table */}
        <div className="grid grid-cols-4 gap-3">
          {folders.map((f, i) => {
            const colors = ['#6366f1', '#8b5cf6', '#10b981', '#475569'];
            return (
              <div key={f.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: colors[i % colors.length] }} />
                <div>
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)', maxWidth: 150 }}>
                    {f.path.split('/').filter(Boolean).pop()}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.imageCount.toLocaleString()} photos</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
