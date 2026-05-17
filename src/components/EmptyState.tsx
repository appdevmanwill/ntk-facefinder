import { type ReactNode } from 'react';
import {
  Search, FolderOpen, Users, Image, Cloud, Download, ScanFace, FileQuestion
} from 'lucide-react';

interface EmptyStateProps {
  icon?: 'search' | 'folder' | 'users' | 'image' | 'cloud' | 'download' | 'face' | 'file';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

const icons = {
  search: Search,
  folder: FolderOpen,
  users: Users,
  image: Image,
  cloud: Cloud,
  download: Download,
  face: ScanFace,
  file: FileQuestion,
};

export default function EmptyState({ icon = 'file', title, description, action, children }: EmptyStateProps) {
  const IconComponent = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div 
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <IconComponent size={36} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-md mb-6" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
      {action && (
        <button
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ background: 'var(--accent-primary)' }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function NoSearchResults({ onNewSearch }: { onNewSearch: () => void }) {
  return (
    <EmptyState
      icon="search"
      title="No matches found"
      description="We couldn't find any photos matching your reference. Try adjusting the sensitivity settings or using a different reference photo."
      action={{ label: 'Try Different Photo', onClick: onNewSearch }}
    />
  );
}

export function NoFolders({ onAddFolder }: { onAddFolder: () => void }) {
  return (
    <EmptyState
      icon="folder"
      title="No folders added yet"
      description="Add photo folders to start organizing and searching through your photos using AI-powered face recognition."
      action={{ label: 'Add Your First Folder', onClick: onAddFolder }}
    />
  );
}

export function NoPeople() {
  return (
    <EmptyState
      icon="users"
      title="No people identified"
      description="Once you scan your photo folders, FaceFinder will automatically detect and group people found in your photos."
    />
  );
}

export function EmptyGallery({ onImport }: { onImport: () => void }) {
  return (
    <EmptyState
      icon="image"
      title="Your gallery is empty"
      description="Import photos from your local folders or cloud storage to start building your searchable photo library."
      action={{ label: 'Import Photos', onClick: onImport }}
    />
  );
}

export function NoExportsSelected({ onGoToResults }: { onGoToResults: () => void }) {
  return (
    <EmptyState
      icon="download"
      title="No photos selected for export"
      description="Select photos from Search Results or Gallery to export them as a ZIP file, copy to a folder, or upload to cloud storage."
      action={{ label: 'Go to Search Results', onClick: onGoToResults }}
    />
  );
}

export function NoCloudConnection({ service, onConnect }: { service: string; onConnect: () => void }) {
  return (
    <EmptyState
      icon="cloud"
      title={`Connect to ${service}`}
      description={`Link your ${service} account to browse, import, and search photos stored in the cloud.`}
      action={{ label: `Connect ${service}`, onClick: onConnect }}
    />
  );
}

export function NoFacesDetected({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon="face"
      title="No faces detected"
      description="We couldn't detect any faces in this image. Try uploading a photo with clearer, larger faces or better lighting."
      action={{ label: 'Try Another Photo', onClick: onRetry }}
    >
      <div className="mt-4 text-xs text-left max-w-sm" style={{ color: 'var(--text-muted)' }}>
        <p className="font-medium mb-2">Tips for better detection:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Use photos where faces are clearly visible</li>
          <li>Avoid heavily obscured or very small faces</li>
          <li>Photos with good lighting work best</li>
          <li>Front-facing photos are easier to match</li>
        </ul>
      </div>
    </EmptyState>
  );
}
