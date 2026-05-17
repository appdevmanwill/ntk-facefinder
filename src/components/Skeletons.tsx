// Skeleton loading components with shimmer animation

interface SkeletonProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`rounded-xl overflow-hidden ${className}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="aspect-[3/2] skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 skeleton rounded" />
        <div className="h-2 w-1/2 skeleton rounded" />
      </div>
    </div>
  );
}

export function SkeletonPerson({ className = '' }: SkeletonProps) {
  return (
    <div className={`p-5 rounded-xl text-center ${className}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="w-20 h-20 rounded-full mx-auto mb-3 skeleton" />
      <div className="h-4 w-20 mx-auto mb-2 skeleton rounded" />
      <div className="h-3 w-24 mx-auto mb-1 skeleton rounded" />
      <div className="h-3 w-16 mx-auto skeleton rounded" />
    </div>
  );
}

export function SkeletonStat({ className = '' }: SkeletonProps) {
  return (
    <div className={`p-5 rounded-xl ${className}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="w-8 h-8 mb-3 skeleton rounded-lg" />
      <div className="h-8 w-20 mb-2 skeleton rounded" />
      <div className="h-3 w-24 skeleton rounded" />
    </div>
  );
}

export function SkeletonRow({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl ${className}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="w-10 h-10 skeleton rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 skeleton rounded" />
        <div className="h-3 w-1/3 skeleton rounded" />
      </div>
      <div className="w-16 h-6 skeleton rounded-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex gap-4 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-4 flex-1 skeleton rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          {[1, 2, 3, 4, 5].map(j => (
            <div key={j} className="h-4 flex-1 skeleton rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 8, columns = 4 }: { count?: number; columns?: number }) {
  return (
    <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ width = '100%', height = '1rem' }: { width?: string; height?: string }) {
  return <div className="skeleton rounded" style={{ width, height }} />;
}
