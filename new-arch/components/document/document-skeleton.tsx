import { Skeleton } from "@/components/ui/skeleton";

export function DocumentSkeleton() {
    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 flex-1" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
    );
}
