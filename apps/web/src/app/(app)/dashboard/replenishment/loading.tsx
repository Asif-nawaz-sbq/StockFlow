import { SkeletonPageHeader, SkeletonStats, SkeletonTable } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-5">
      <SkeletonPageHeader />
      <SkeletonStats count={3} />
      <SkeletonTable rows={10} cols={8} />
    </div>
  );
}
