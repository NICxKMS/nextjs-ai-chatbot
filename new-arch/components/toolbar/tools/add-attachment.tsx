"use client";

import { Paperclip } from "lucide-react";
import { ToolbarButton } from "../toolbar-button";

type AddAttachmentToolProps = {
    disabled?: boolean;
    onSelect: () => void;
};

export function AddAttachmentTool({
    disabled,
    onSelect,
}: AddAttachmentToolProps) {
    return (
        <ToolbarButton
            disabled={disabled}
            icon={<Paperclip className="h-4 w-4" />}
            label="Add attachment"
            onClick={onSelect}
            shortcut="Ctrl+U"
        />
    );
}
