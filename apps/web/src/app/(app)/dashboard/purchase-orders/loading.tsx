import { Skeleton, SkeletonPageHeader, SkeletonTable } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-5">
      <SkeletonPageHeader />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-80" />
      </div>
      <SkeletonTable rows={10} cols={7} />
    </div>
  );
}
