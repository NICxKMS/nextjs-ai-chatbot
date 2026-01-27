import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { CrossIcon } from "./icons";
import { Button } from "./ui/button";

function PureArtifactCloseButton() {
  const { setArtifact } = useArtifact();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="h-fit p-2 dark:hover:bg-zinc-700"
          data-testid="artifact-close-button"
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
          <span className="sr-only">Close artifact</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Close artifact</TooltipContent>
    </Tooltip>
  );
}

export const ArtifactCloseButton = memo(PureArtifactCloseButton, () => true);
