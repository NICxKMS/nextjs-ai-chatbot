import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-background px-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="font-bold text-6xl text-foreground">404</h1>
                <h2 className="font-semibold text-2xl text-foreground">
                    Page not found
                </h2>
                <p className="max-w-md text-muted-foreground">
                    The page you&apos;re looking for doesn&apos;t exist or has
                    been moved.
                </p>
            </div>
            <Button asChild variant="default">
                <Link href="/">Go home</Link>
            </Button>
        </div>
    );
}
