import { SkeletonPageHeader, SkeletonStats, SkeletonTable } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonStats />
      <SkeletonTable rows={8} />
    </div>
  );
}
