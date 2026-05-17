import { useState } from 'react';
import {
  ScanFace, HardDrive, Zap, Cloud, Shield, Palette, Lock, Trash2, Download, X, Check
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/useToast';

const sections = [
  { id: 'face', label: 'Face Recognition', icon: ScanFace },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'performance', label: 'Performance', icon: Zap },
  { id: 'cloud', label: 'Cloud Accounts', icon: Cloud },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

const accentColors = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ec4899', label: 'Pink' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('face');
  const { accentColor, setAccentColor, settings, updateSettings } = useAppContext();
  const { addToast } = useToast();

  // Local state for settings
  const [exportFolder, setExportFolder] = useState('C:/Exports/FaceFinder/');
  const [cacheSize, setCacheSize] = useState(10);

  // Privacy
  const [clearInput, setClearInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
      style={{ background: value ? 'var(--accent-primary)' : 'var(--bg-secondary)' }}
      onClick={() => onChange(!value)}
    >
      <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: value ? 22 : 2 }} />
    </button>
  );

  const thresholdLabel = settings.matchThreshold <= 35 ? 'Very strict — may miss matches' : settings.matchThreshold <= 60 ? 'Balanced — recommended' : 'Very broad — more false positives';

  return (
    <div className="page-enter flex gap-6">
      {/* Left mini-nav */}
      <div className="flex-shrink-0 sticky top-0 self-start" style={{ width: 200 }}>
        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <nav className="flex flex-col gap-1">
          {sections.map(s => (
            <button
              key={s.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all"
              style={{
                background: activeSection === s.id ? 'var(--accent-primary)' : 'transparent',
                color: activeSection === s.id ? 'white' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveSection(s.id)}
            >
              <s.icon size={16} />
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl">
        {/* Face Recognition */}
        {activeSection === 'face' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Face Recognition</h2>

            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Matching Threshold</span>
                  <span className="text-sm font-mono" style={{ color: 'var(--accent-primary)' }}>{(settings.matchThreshold / 100).toFixed(2)}</span>
                </div>
                <input
                  type="range" min="30" max="80" value={settings.matchThreshold}
                  onChange={e => updateSettings({ matchThreshold: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, var(--accent-primary) ${(settings.matchThreshold - 30) * 2}%, var(--bg-secondary) ${(settings.matchThreshold - 30) * 2}%)` }}
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  <span>0.30 (Strict)</span>
                  <span>0.80 (Broad)</span>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{thresholdLabel}</p>

                {/* Visual example */}
                <div className="flex items-center gap-4 mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img src="https://i.pravatar.cc/80?img=47" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs" style={{ color: settings.matchThreshold <= 50 ? 'var(--error)' : 'var(--success)' }}>
                    {settings.matchThreshold <= 50 ? '✗ Will not match (72% similarity)' : '✓ Will match (72% similarity)'}
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img src="https://i.pravatar.cc/80?img=44" alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Minimum Face Size</span>
                  <span className="text-sm font-mono" style={{ color: 'var(--accent-primary)' }}>{settings.minFaceSize}px</span>
                </div>
                <input
                  type="range" min="20" max="100" value={settings.minFaceSize}
                  onChange={e => updateSettings({ minFaceSize: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, var(--accent-primary) ${(settings.minFaceSize - 20) * 1.25}%, var(--bg-secondary) ${(settings.minFaceSize - 20) * 1.25}%)` }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Ignore faces smaller than {settings.minFaceSize}px — filters out distant crowd faces</p>
              </div>

              <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Auto-cluster new faces</span>
                  <Toggle value={settings.autoCluster} onChange={v => updateSettings({ autoCluster: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show confidence percentages on results</span>
                  <Toggle value={settings.showConfidence} onChange={v => updateSettings({ showConfidence: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Highlight matched face in results</span>
                  <Toggle value={settings.highlightFace} onChange={v => updateSettings({ highlightFace: v })} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Storage */}
        {activeSection === 'storage' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Storage</h2>
            <div className="p-5 rounded-xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div>
                <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Default export folder</label>
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} value={exportFolder} onChange={e => setExportFolder(e.target.value)} />
                  <button className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Browse</button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cache size limit</span>
                  <span className="text-sm font-mono" style={{ color: 'var(--accent-primary)' }}>{cacheSize} GB</span>
                </div>
                <input type="range" min="1" max="50" value={cacheSize} onChange={e => setCacheSize(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, var(--accent-primary) ${cacheSize * 2}%, var(--bg-secondary) ${cacheSize * 2}%)` }} />
              </div>
            </div>
          </div>
        )}

        {/* Performance */}
        {activeSection === 'performance' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Performance</h2>
            <div className="p-5 rounded-xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div>
                <span className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Batch size</span>
                <div className="flex gap-2">
                  {[5, 10, 20, 50].map(s => (
                    <button
                      key={s}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: settings.batchSize === s ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: settings.batchSize === s ? 'white' : 'var(--text-secondary)',
                      }}
                      onClick={() => updateSettings({ batchSize: s })}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use GPU acceleration</span>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Experimental — requires WebGL support</div>
                </div>
                <Toggle value={settings.useGPU} onChange={v => updateSettings({ useGPU: v })} />
              </div>
            </div>
          </div>
        )}

        {/* Cloud Accounts */}
        {activeSection === 'cloud' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Cloud Accounts</h2>
            <div className="p-5 rounded-xl space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {[
                { name: 'Google Drive', email: 'john.smith@gmail.com', connected: true, color: '#4285F4' },
                { name: 'Dropbox', email: '', connected: false, color: '#0061FF' },
                { name: 'OneDrive', email: '', connected: false, color: '#0078D4' },
              ].map(svc => (
                <div key={svc.name} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: svc.connected ? 'var(--success)' : 'var(--text-muted)' }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{svc.name}</div>
                      {svc.connected && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{svc.email}</div>}
                    </div>
                  </div>
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{
                      border: '1px solid var(--border)',
                      color: svc.connected ? 'var(--text-secondary)' : 'var(--accent-primary)',
                    }}
                    onClick={() => addToast('info', svc.connected ? 'Disconnected' : 'Connecting...', svc.connected ? `${svc.name} disconnected` : `Connecting to ${svc.name}...`)}
                  >
                    {svc.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy */}
        {activeSection === 'privacy' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Privacy</h2>
            <div className="p-5 rounded-xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Process all face data locally</span>
                  <Lock size={12} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="relative">
                  <Toggle value={true} onChange={() => {}} />
                  <div className="text-[9px] mt-0.5 text-right" style={{ color: 'var(--success)' }}>Always on</div>
                </div>
              </div>
              <p className="text-[10px] -mt-2 pl-0" style={{ color: 'var(--text-muted)' }}>Your photos never leave your device</p>

              <div className="pt-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ border: '1px solid var(--error)', color: 'var(--error)' }}
                  onClick={() => setShowClearConfirm(true)}
                >
                  <Trash2 size={14} className="inline mr-2" /> Clear face index
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium block"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  onClick={() => {
                    const data = JSON.stringify({ settings, timestamp: new Date().toISOString() }, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'facefinder_data.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    addToast('success', 'Data Exported', 'Your data has been downloaded');
                  }}
                >
                  <Download size={14} className="inline mr-2" /> Export all my data
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'var(--error)' }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete all data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appearance */}
        {activeSection === 'appearance' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
            <div className="p-5 rounded-xl space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {/* Theme */}
              <div>
                <span className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Theme</span>
                <div className="grid grid-cols-3 gap-3">
                  {['Dark', 'Light', 'System'].map(t => (
                    <button
                      key={t}
                      className="p-3 rounded-xl text-sm font-medium transition-all text-center"
                      style={{
                        background: settings.theme === t.toLowerCase() ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: settings.theme === t.toLowerCase() ? 'white' : 'var(--text-secondary)',
                        border: `2px solid ${settings.theme === t.toLowerCase() ? 'var(--accent-primary)' : 'var(--border)'}`,
                      }}
                      onClick={() => { updateSettings({ theme: t.toLowerCase() as 'dark' | 'light' | 'system' }); addToast('info', 'Theme', `Theme set to ${t}`); }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent color */}
              <div>
                <span className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Accent Color</span>
                <div className="flex gap-3">
                  {accentColors.map(c => (
                    <button
                      key={c.value}
                      className="w-10 h-10 rounded-xl transition-all flex items-center justify-center"
                      style={{
                        background: c.value,
                        border: accentColor === c.value ? '3px solid white' : '3px solid transparent',
                        transform: accentColor === c.value ? 'scale(1.1)' : 'scale(1)',
                      }}
                      onClick={() => setAccentColor(c.value)}
                      title={c.label}
                    >
                      {accentColor === c.value && <Check size={16} color="white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid density */}
              <div>
                <span className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Grid Density</span>
                <div className="flex gap-2">
                  {(['compact', 'normal', 'comfortable'] as const).map(d => (
                    <button
                      key={d}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                      style={{
                        background: settings.gridDensity === d ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: settings.gridDensity === d ? 'white' : 'var(--text-secondary)',
                      }}
                      onClick={() => updateSettings({ gridDensity: d })}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowClearConfirm(false)}>
          <div className="modal-enter p-6 rounded-2xl w-full max-w-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Clear Face Index</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>This will remove all detected face data. Type CLEAR to confirm.</p>
            <input
              className="w-full px-3 py-2 rounded-lg text-sm mb-4"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              placeholder="Type CLEAR"
              value={clearInput}
              onChange={e => setClearInput(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => { setShowClearConfirm(false); setClearInput(''); }}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: 'var(--error)' }}
                disabled={clearInput !== 'CLEAR'}
                onClick={() => { setShowClearConfirm(false); setClearInput(''); addToast('success', 'Cleared', 'Face index has been cleared'); }}
              >
                Clear Index
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete all data modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-enter p-6 rounded-2xl w-full max-w-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--error)' }}>⚠️ Delete All Data</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>This action is irreversible. All face data, settings, and history will be permanently deleted.</p>
            <div className="flex gap-3 justify-end">
              <button className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--error)' }}
                onClick={() => { 
                  setShowDeleteConfirm(false); 
                  localStorage.clear();
                  addToast('success', 'Data Deleted', 'All data has been removed'); 
                }}
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
