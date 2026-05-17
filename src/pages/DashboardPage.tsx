import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Image, ScanFace, Users, Search, TrendingUp, FolderOpen, Zap, Download, ArrowRight
} from 'lucide-react';
import { DEMO_FOLDERS, DASHBOARD_STATS, ACTIVITY_TIMELINE } from '@/data/mockData';
import { Link } from 'wouter';

const barData = DEMO_FOLDERS.map(f => ({
  name: f.path.split('/').filter(Boolean).pop() || f.path,
  photos: f.imageCount
}));

const pieData = [
  { name: 'Fully Indexed', value: 2908, color: '#10b981' },
  { name: 'Partially Indexed', value: 1243, color: '#f59e0b' },
  { name: 'Not Indexed', value: 3201, color: '#475569' },
];

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
          { label: 'Total Photos Indexed', value: DASHBOARD_STATS.totalPhotos.toLocaleString(), icon: Image, trend: '+234 this week', color: 'var(--accent-primary)' },
          { label: 'Faces Detected', value: DASHBOARD_STATS.facesDetected.toLocaleString(), icon: ScanFace, trend: '+89 this week', color: 'var(--accent-secondary)' },
          { label: 'Unique People', value: String(DASHBOARD_STATS.uniquePeople), icon: Users, trend: '+2 this week', color: 'var(--success)' },
          { label: 'Searches Run', value: String(DASHBOARD_STATS.searchesPerformed), icon: Search, trend: '+5 this week', color: 'var(--warning)' },
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
            {ACTIVITY_TIMELINE.map(item => (
              <div key={item.id} className="relative pb-4">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full" style={{ background: item.color, border: '2px solid var(--bg-card)' }} />
                <div className="flex items-start gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.text}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.time}</div>
                  </div>
                </div>
              </div>
            ))}
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
          {DEMO_FOLDERS.map((f, i) => {
            const totalGB = DEMO_FOLDERS.reduce((s, fo) => s + fo.sizeGB, 0);
            const pct = (f.sizeGB / totalGB) * 100;
            const colors = ['#6366f1', '#8b5cf6', '#10b981', '#475569'];
            return (
              <div
                key={f.id}
                className="h-full transition-all"
                style={{ width: `${pct}%`, background: colors[i] }}
                title={`${f.path}: ${f.sizeGB} GB`}
              />
            );
          })}
        </div>
        {/* Table */}
        <div className="grid grid-cols-4 gap-3">
          {DEMO_FOLDERS.map((f, i) => {
            const colors = ['#6366f1', '#8b5cf6', '#10b981', '#475569'];
            return (
              <div key={f.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: colors[i] }} />
                <div>
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)', maxWidth: 150 }}>
                    {f.path.split('/').filter(Boolean).pop()}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.sizeGB} GB • {f.imageCount.toLocaleString()} photos</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
