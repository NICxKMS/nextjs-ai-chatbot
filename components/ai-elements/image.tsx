import type { Experimental_GeneratedImage } from "ai";
import { cn } from "@/lib/utils/index";

export type ImageProps = Experimental_GeneratedImage & {
    className?: string;
    alt?: string;
};

/**
 * Image component for AI-generated images.
 * Uses native img element because Next.js Image doesn't support data URLs (base64).
 */
export const Image = ({
    base64,
    uint8Array,
    mediaType,
    ...props
}: ImageProps) => (
    // biome-ignore lint/nursery/useImageSize: dynamic base64 dimensions
    // biome-ignore lint/performance/noImgElement: data URLs not supported by Next.js Image
    <img
        {...props}
        alt={props.alt ?? "AI generated image"}
        className={cn(
            "h-auto max-w-full overflow-hidden rounded-md",
            props.className
        )}
        src={`data:${mediaType};base64,${base64}`}
    />
);
