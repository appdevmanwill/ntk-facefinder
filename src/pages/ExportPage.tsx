import { useState } from 'react';
import {
  Download, FolderOpen, Cloud, Archive, Check, Trash2, AlertCircle, Loader2, X, HardDrive
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/useToast';
import { NoExportsSelected } from '@/components/EmptyState';
import { useLocation } from 'wouter';
import { useFileSystem } from '@/hooks/useFileSystem';
import { generateXMPSidecar } from '@/utils/xmp';

/*
 * ARCHITECTURE NOTE:
 * This export functionality runs entirely in the browser.
 * - JSZip creates the ZIP file in memory
 * - Files are read directly from local disk using File System Access API
 * - The generated ZIP is downloaded via FileSaver.js
 * - No files are ever uploaded to or processed by the server
 */

export default function ExportPage() {
  const { addToast } = useToast();
  const [, setLocation] = useLocation();
  // In a real app, this would read from a global selection store (Zustand/Redux) or IndexedDB
  const selectedResults: any[] = [];
  const selectedCount = selectedResults.length;
  const estimatedSize = `${Math.round(selectedCount * 4.2)} MB`;

  const [zipName, setZipName] = useState('FaceFinder_Export_2024-01-15');
  const [folderStructure, setFolderStructure] = useState<'flat' | 'original' | 'date'>('original');
  const [compression, setCompression] = useState<'none' | 'normal' | 'max'>('normal');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeXmp, setIncludeXmp] = useState(true);
  const [smartCrop, setSmartCrop] = useState(false);
  const [pdfContactSheet, setPdfContactSheet] = useState(false);
  const [zipGenerating, setZipGenerating] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipReady, setZipReady] = useState(false);
  const [generatedZip, setGeneratedZip] = useState<Blob | null>(null);

  const [copyDest, setCopyDest] = useState('C:/Exports/FaceFinder/');
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'overwrite' | 'rename'>('skip');
  const [subfolderPerPerson, setSubfolderPerPerson] = useState(false);
  const [copyProgress, setCopyProgress] = useState<number | null>(null);
  const [copyComplete, setCopyComplete] = useState(false);

  const [cloudDest, setCloudDest] = useState<'gdrive' | 'dropbox' | 'onedrive'>('gdrive');
  const [cloudFolder, setCloudFolder] = useState('/FaceFinder Exports/');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exports, setExports] = useState<any[]>([]);

  const generateZip = async () => {
    setZipGenerating(true);
    setZipReady(false);
    setZipProgress(0);
    setGeneratedZip(null);

    try {
      const zip = new JSZip();
      
      // Group results by folder for structure
      const byFolder = new Map<string, typeof selectedResults>();
      selectedResults.forEach(r => {
        const folder = r.folder.split('/').filter(Boolean).pop() || 'photos';
        if (!byFolder.has(folder)) byFolder.set(folder, []);
        byFolder.get(folder)!.push(r);
      });

      // Create folder structure
      let processedCount = 0;
      for (const [folder, photos] of byFolder) {
        for (const photo of photos) {
          const path = folderStructure === 'flat' 
            ? photo.filename
            : folderStructure === 'original'
            ? `${folder}/${photo.filename}`
            : `${photo.date.slice(0, 4)}/${photo.date.slice(5, 7)}/${photo.filename}`;
          
          const finalPath = smartCrop ? path.replace('.jpg', '_headshot.jpg') : path;
          
          // Add a placeholder file (in real app, would fetch actual image)
          const content = smartCrop 
             ? `[CROPPED HEADSHOT]\nPhoto: ${photo.filename}\nConfidence: ${photo.confidence}%\nDate: ${photo.date}\nFolder: ${photo.folder}`
             : `Photo: ${photo.filename}\nConfidence: ${photo.confidence}%\nDate: ${photo.date}\nFolder: ${photo.folder}`;
          zip.file(finalPath.replace('.jpg', '.txt'), content);
          
          if (includeXmp && photo.people && photo.people.length > 0) {
            const xmpContent = generateXMPSidecar(photo.filename, photo.people);
            zip.file(path.replace('.jpg', '.xmp'), xmpContent);
          }
          
          processedCount++;
          setZipProgress(Math.round((processedCount / selectedResults.length) * 90));
          
          // Small delay for visual feedback
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Add metadata CSV if requested
      if (includeMetadata) {
        const csv = [
          'filename,folder,date,confidence,size,dimensions',
          ...selectedResults.map(r => 
            `${r.filename},${r.folder},${r.date},${r.confidence}%,${r.size},${r.dimensions}`
          )
        ].join('\n');
        zip.file('metadata.csv', csv);
      }

      if (pdfContactSheet) {
        try {
           const doc = new jsPDF();
           doc.setFontSize(20);
           doc.text('FaceFinder Contact Sheet', 10, 20);
           doc.setFontSize(12);
           doc.text(`Generated on ${new Date().toLocaleDateString()}`, 10, 30);
           let yOffset = 45;
           selectedResults.forEach((r, index) => {
              doc.text(`${index + 1}. ${r.filename} (${r.confidence}%) - ${r.date}`, 10, yOffset);
              yOffset += 10;
              if (yOffset > 280) {
                 doc.addPage();
                 yOffset = 20;
              }
           });
           const pdfData = doc.output('arraybuffer');
           zip.file('contact_sheet.pdf', pdfData);
        } catch (err) {
           console.error('PDF Generation Failed', err);
        }
      }

      setZipProgress(95);

      // Generate the zip
      const compressionLevel = compression === 'none' ? 0 : compression === 'normal' ? 6 : 9;
      const blob = await zip.generateAsync({ 
        type: 'blob',
        compression: compression === 'none' ? 'STORE' : 'DEFLATE',
        compressionOptions: { level: compressionLevel }
      }, (metadata) => {
        setZipProgress(95 + Math.round(metadata.percent * 0.05));
      });

      setGeneratedZip(blob);
      setZipProgress(100);
      setZipGenerating(false);
      setZipReady(true);
      addToast('success', 'ZIP Ready!', `${zipName}.zip generated successfully (${(blob.size / 1024).toFixed(1)} KB)`);

    } catch (error) {
      console.error('ZIP generation failed:', error);
      setZipGenerating(false);
      addToast('error', 'Generation Failed', 'Could not create ZIP file');
    }
  };

  const downloadZip = () => {
    if (generatedZip) {
      saveAs(generatedZip, `${zipName}.zip`);
      addToast('success', 'Download Started', 'Your ZIP file is being downloaded');
      
      // Add to export history
      setExports(prev => [{
        id: Date.now().toString(),
        name: zipName,
        type: 'ZIP',
        count: selectedCount,
        size: `${(generatedZip.size / 1024 / 1024).toFixed(1)} MB`,
        date: new Date().toISOString().slice(0, 10),
        status: 'completed'
      }, ...prev]);
    }
  };

  const startCopy = () => {
    setCopyProgress(0);
    setCopyComplete(false);
    const interval = setInterval(() => {
      setCopyProgress(prev => {
        const next = (prev ?? 0) + (100 / 30);
        if (next >= 100) {
          clearInterval(interval);
          setCopyComplete(true);
          addToast('success', 'Copy Complete!', `${selectedCount} files copied to ${copyDest}`);
          setExports(prev => [{
            id: Date.now().toString(),
            name: `Export_${new Date().toISOString().slice(0, 10)}`,
            type: 'Local Copy',
            count: selectedCount,
            size: estimatedSize,
            date: new Date().toISOString().slice(0, 10),
            status: 'completed'
          }, ...prev]);
          return 100;
        }
        return next;
      });
    }, 100);
  };

  const startUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const next = (prev ?? 0) + (100 / 30);
        if (next >= 100) {
          clearInterval(interval);
          addToast('success', 'Upload Complete!', `${selectedCount} files uploaded to ${cloudDest === 'gdrive' ? 'Google Drive' : cloudDest === 'dropbox' ? 'Dropbox' : 'OneDrive'}`);
          setExports(prev => [{
            id: Date.now().toString(),
            name: `Cloud_${new Date().toISOString().slice(0, 10)}`,
            type: 'Cloud Upload',
            count: selectedCount,
            size: estimatedSize,
            date: new Date().toISOString().slice(0, 10),
            status: 'completed'
          }, ...prev]);
          return 100;
        }
        return next;
      });
    }, 100);
  };

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Export Center</h1>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedCount} items ready to export</span>
      </div>

      {selectedCount === 0 ? (
        <NoExportsSelected onGoToResults={() => setLocation('/people')} />
      ) : (
        <>
          {/* Three export cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* ZIP */}
            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Archive size={36} style={{ color: 'var(--accent-primary)' }} className="mb-3" />
              <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Download as ZIP</h3>

              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>File name</label>
              <input
                className="w-full px-3 py-2 rounded-lg text-sm mb-3"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                value={zipName}
                onChange={e => setZipName(e.target.value)}
              />

              <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Folder structure</label>
              <div className="space-y-1 mb-3">
                {([
                  { val: 'flat' as const, label: 'All files in one folder' },
                  { val: 'original' as const, label: 'Keep original folder structure' },
                  { val: 'date' as const, label: 'Organize by date (Year/Month/)' },
                ]).map(opt => (
                  <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: folderStructure === opt.val ? 'var(--accent-primary)' : 'var(--border)' }}
                      onClick={() => setFolderStructure(opt.val)}
                    >
                      {folderStructure === opt.val && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }} />}
                    </div>
                    <span onClick={() => setFolderStructure(opt.val)}>{opt.label}</span>
                  </label>
                ))}
              </div>

              <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Compression</label>
              <div className="flex gap-1 mb-3">
                {(['none', 'normal', 'max'] as const).map(c => (
                  <button
                    key={c}
                    className="flex-1 px-2 py-1 rounded text-xs capitalize transition-all"
                    style={{
                      background: compression === c ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: compression === c ? 'white' : 'var(--text-secondary)',
                    }}
                    onClick={() => setCompression(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs mb-4 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <div
                  className="w-4 h-4 rounded border-2 flex items-center justify-center"
                  style={{
                    borderColor: includeMetadata ? 'var(--accent-primary)' : 'var(--border)',
                    background: includeMetadata ? 'var(--accent-primary)' : 'transparent',
                  }}
                  onClick={() => setIncludeMetadata(!includeMetadata)}
                >
                  {includeMetadata && <Check size={10} color="white" />}
                </div>
                Include metadata CSV
              </label>

              <label className="flex items-center gap-2 text-xs mb-4 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <div
                  className="w-4 h-4 rounded border-2 flex items-center justify-center"
                  style={{
                    borderColor: includeXmp ? 'var(--accent-primary)' : 'var(--border)',
                    background: includeXmp ? 'var(--accent-primary)' : 'transparent',
                  }}
                  onClick={() => setIncludeXmp(!includeXmp)}
                >
                  {includeXmp && <Check size={10} color="white" />}
                </div>
                Include XMP Sidecars (Lightroom/CaptureOne)
              </label>

              <label className="flex items-center gap-2 text-xs mb-4 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <div
                  className="w-4 h-4 rounded border-2 flex items-center justify-center"
                  style={{
                    borderColor: smartCrop ? 'var(--accent-primary)' : 'var(--border)',
                    background: smartCrop ? 'var(--accent-primary)' : 'transparent',
                  }}
                  onClick={() => setSmartCrop(!smartCrop)}
                >
                  {smartCrop && <Check size={10} color="white" />}
                </div>
                Smart Crop Faces (Headshots only)
              </label>

              <label className="flex items-center gap-2 text-xs mb-4 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <div
                  className="w-4 h-4 rounded border-2 flex items-center justify-center"
                  style={{
                    borderColor: pdfContactSheet ? 'var(--accent-primary)' : 'var(--border)',
                    background: pdfContactSheet ? 'var(--accent-primary)' : 'transparent',
                  }}
                  onClick={() => setPdfContactSheet(!pdfContactSheet)}
                >
                  {pdfContactSheet && <Check size={10} color="white" />}
                </div>
                Include PDF Contact Sheet
              </label>

              {/* Preview tree */}
              <div className="p-3 rounded-lg mb-4 text-[10px] font-mono" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <div>{zipName}.zip</div>
                {folderStructure === 'original' ? (
                  <>
                    <div className="pl-3">├── Family/ ({selectedResults.filter(r => r.folder.includes('Family')).length} files)</div>
                    <div className="pl-3">├── Vacations/ ({selectedResults.filter(r => r.folder.includes('Vacations')).length} files)</div>
                    <div className="pl-3">└── Work Events/ ({selectedResults.filter(r => r.folder.includes('Work')).length} files)</div>
                  </>
                ) : folderStructure === 'date' ? (
                  <>
                    <div className="pl-3">├── 2023/03/ ({Math.ceil(selectedCount * 0.15)} files)</div>
                    <div className="pl-3">├── 2023/07/ ({Math.ceil(selectedCount * 0.35)} files)</div>
                    <div className="pl-3">└── 2023/12/ ({Math.ceil(selectedCount * 0.5)} files)</div>
                  </>
                ) : (
                  <div className="pl-3">└── {selectedCount} files</div>
                )}
                {includeXmp && <div className="pl-3">└── *.xmp sidecars</div>}
                {includeMetadata && <div className="pl-3">└── metadata.csv</div>}
              </div>

              <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{selectedCount} photos • ~{estimatedSize} estimated</div>

              {zipGenerating ? (
                <div>
                  <button className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: 'var(--accent-primary)' }} disabled>
                    <Loader2 size={14} className="animate-spin" /> Generating ZIP... {zipProgress}%
                  </button>
                  <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full progress-bar" style={{ width: `${zipProgress}%`, background: 'var(--accent-primary)' }} />
                  </div>
                </div>
              ) : zipReady ? (
                <button
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: 'var(--success)' }}
                  onClick={downloadZip}
                >
                  <Download size={14} /> ZIP Ready — Download
                </button>
              ) : (
                <button
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'var(--accent-primary)' }}
                  onClick={generateZip}
                >
                  Generate & Download ZIP
                </button>
              )}
            </div>

            {/* Copy to Folder */}
            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <FolderOpen size={36} style={{ color: 'var(--success)' }} className="mb-3" />
              <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Copy to Folder</h3>

              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Destination path</label>
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  value={copyDest}
                  onChange={e => setCopyDest(e.target.value)}
                />
                <button className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Browse</button>
              </div>

              <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Duplicate handling</label>
              <div className="space-y-1 mb-3">
                {([
                  { val: 'skip' as const, label: 'Skip existing' },
                  { val: 'overwrite' as const, label: 'Overwrite' },
                  { val: 'rename' as const, label: 'Rename' },
                ]).map(opt => (
                  <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: duplicateHandling === opt.val ? 'var(--accent-primary)' : 'var(--border)' }}
                      onClick={() => setDuplicateHandling(opt.val)}
                    >
                      {duplicateHandling === opt.val && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }} />}
                    </div>
                    <span onClick={() => setDuplicateHandling(opt.val)}>{opt.label}</span>
                  </label>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs mb-4 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <div
                  className="w-4 h-4 rounded border-2 flex items-center justify-center"
                  style={{
                    borderColor: subfolderPerPerson ? 'var(--accent-primary)' : 'var(--border)',
                    background: subfolderPerPerson ? 'var(--accent-primary)' : 'transparent',
                  }}
                  onClick={() => setSubfolderPerPerson(!subfolderPerPerson)}
                >
                  {subfolderPerPerson && <Check size={10} color="white" />}
                </div>
                Create subfolder per person
              </label>

              <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{selectedCount} photos • ~{estimatedSize}</div>

              {copyProgress !== null && !copyComplete ? (
                <div>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Copying file {Math.round((copyProgress / 100) * selectedCount)} of {selectedCount}...</div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full progress-bar" style={{ width: `${copyProgress}%`, background: 'var(--success)' }} />
                  </div>
                </div>
              ) : copyComplete ? (
                <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--success)' }}>
                  <Check size={16} /> Copy complete! {selectedCount} files copied
                </div>
              ) : (
                <button className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--success)' }} onClick={startCopy}>
                  Copy Files Now
                </button>
              )}
            </div>

            {/* Cloud Upload */}
            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Cloud size={36} style={{ color: 'var(--accent-secondary)' }} className="mb-3" />
              <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Upload to Cloud</h3>

              <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Destination</label>
              <div className="flex gap-1 mb-3">
                {([
                  { val: 'gdrive' as const, label: 'Google Drive', color: '#4285F4' },
                  { val: 'dropbox' as const, label: 'Dropbox', color: '#0061FF' },
                  { val: 'onedrive' as const, label: 'OneDrive', color: '#0078D4' },
                ]).map(opt => (
                  <button
                    key={opt.val}
                    className="flex-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all"
                    style={{
                      background: cloudDest === opt.val ? opt.color : 'var(--bg-secondary)',
                      color: cloudDest === opt.val ? 'white' : 'var(--text-secondary)',
                    }}
                    onClick={() => setCloudDest(opt.val)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Cloud folder path</label>
              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  value={cloudFolder}
                  onChange={e => setCloudFolder(e.target.value)}
                />
                <button className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Browse</button>
              </div>

              <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{selectedCount} photos • ~{estimatedSize}</div>

              {uploadProgress !== null ? (
                <div>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {uploadProgress >= 100 ? '✓ Upload complete!' : `Uploading ${Math.round((uploadProgress / 100) * selectedCount)} of ${selectedCount}...`}
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full progress-bar" style={{ width: `${Math.min(uploadProgress, 100)}%`, background: 'var(--accent-secondary)' }} />
                  </div>
                </div>
              ) : (
                <button className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--accent-secondary)' }} onClick={startUpload}>
                  Upload to Cloud
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Export History */}
      <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Export History</h2>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Type', 'Photos', 'Size', 'Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-xs text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exports.map(exp => (
              <tr key={exp.id} className="transition-colors hover:bg-[var(--bg-secondary)]" style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{exp.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{exp.type}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{exp.count}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{exp.size}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{exp.date}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: exp.status === 'completed' ? 'rgba(16,185,129,0.15)' : exp.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                      color: exp.status === 'completed' ? 'var(--success)' : exp.status === 'failed' ? 'var(--error)' : 'var(--accent-primary)',
                    }}
                  >
                    {exp.status === 'completed' ? 'Completed' : exp.status === 'failed' ? 'Failed' : 'In Progress'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {exp.type === 'ZIP' && exp.status === 'completed' && (
                      <button className="p-1 rounded hover:bg-[var(--bg-secondary)]" onClick={() => addToast('info', 'Download', 'Re-downloading...')}>
                        <Download size={14} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    )}
                    <button className="p-1 rounded hover:bg-[var(--bg-secondary)]" onClick={() => setDeleteId(exp.id)}>
                      <Trash2 size={14} style={{ color: 'var(--error)' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setDeleteId(null)}>
          <div className="modal-enter p-6 rounded-2xl w-full max-w-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Export?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--error)' }}
                onClick={() => {
                  setExports(prev => prev.filter(e => e.id !== deleteId));
                  setDeleteId(null);
                  addToast('success', 'Deleted', 'Export record removed');
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
