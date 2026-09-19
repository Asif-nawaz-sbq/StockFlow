import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-3 h-6 w-44" />
          <Skeleton className="mt-3 h-5 w-72" />
        </div>
        <Skeleton className="h-9 w-56" />
      </div>
      <SkeletonTable rows={5} cols={7} />
    </div>
  );
}
