"use client";

import { FilePlus } from "lucide-react";
import { ToolbarButton } from "../toolbar-button";

type CreateDocumentToolProps = {
    disabled?: boolean;
    onSelect: () => void;
};

export function CreateDocumentTool({
    disabled,
    onSelect,
}: CreateDocumentToolProps) {
    return (
        <ToolbarButton
            disabled={disabled}
            icon={<FilePlus className="h-4 w-4" />}
            label="Create document"
            onClick={onSelect}
            shortcut="Ctrl+Shift+D"
        />
    );
}
