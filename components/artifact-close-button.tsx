import { memo } from "react";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { CrossIcon } from "./icons";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

function PureArtifactCloseButton() {
  const { setArtifact } = useArtifact();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="h-fit p-2 dark:hover:bg-zinc-700"
          data-testid="artifact-close-button"
          aria-label="Close artifact"
          onClick={() => {
            setArtifact((currentArtifact) =>
              currentArtifact.status === "streaming"
                ? {
                    ...currentArtifact,
                    isVisible: false,
                  }
                : { ...initialArtifactData, status: "idle" }
            );
          }}
          variant="outline"
        >
          <CrossIcon size={18} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Close</TooltipContent>
    </Tooltip>
  );
}

export const ArtifactCloseButton = memo(PureArtifactCloseButton, () => true);
