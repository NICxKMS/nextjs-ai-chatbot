"use client";

import { Lightbulb } from "lucide-react";
import { ToolbarButton } from "../toolbar-button";

type RequestSuggestionsToolProps = {
    disabled?: boolean;
    onSelect: () => void;
};

export function RequestSuggestionsTool({
    disabled,
    onSelect,
}: RequestSuggestionsToolProps) {
    return (
        <ToolbarButton
            {...(disabled === true ? { disabled: true } : {})}
            icon={<Lightbulb className="h-4 w-4" />}
            label="Request suggestions"
            onClick={onSelect}
            shortcut="Ctrl+Shift+S"
        />
    );
}
