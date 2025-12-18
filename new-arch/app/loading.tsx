export default function Loading() {
    return (
        <div className="flex h-dvh w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <span className="text-muted-foreground text-sm">
                    Loading...
                </span>
            </div>
        </div>
    );
}
