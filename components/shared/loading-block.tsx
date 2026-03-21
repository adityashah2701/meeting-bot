import { Skeleton } from "@/components/ui/skeleton";

export function LoadingBlock({
  className = "h-32 w-full",
}: {
  className?: string;
}) {
  return <Skeleton className={className} />;
}
