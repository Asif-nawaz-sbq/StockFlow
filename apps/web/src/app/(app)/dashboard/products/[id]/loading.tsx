import { Skeleton, SkeletonStats, SkeletonTable } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="mt-3 h-5 w-28" />
        <Skeleton className="mt-2.5 h-6 w-96" />
      </div>
      <SkeletonStats />
      <SkeletonTable rows={6} cols={6} />
    </div>
  );
}
