import type { ReactNode } from "react";

export type ToolType =
    | "add-attachment"
    | "create-document"
    | "request-suggestions";

export type ToolbarTool = {
    id: ToolType;
    label: string;
    icon: ReactNode;
    shortcut?: string;
    disabled?: boolean;
    onClick: () => void;
};

export type ToolbarProps = {
    tools?: ToolType[];
    isLoading?: boolean;
    className?: string;
    onToolSelect?: (tool: ToolType) => void;
};

export type ToolbarButtonProps = {
    icon: ReactNode;
    label: string;
    shortcut?: string;
    disabled?: boolean;
    isActive?: boolean;
    onClick: () => void;
};

export type ToolbarGroupProps = {
    children: ReactNode;
    className?: string;
};

export type Shortcut = {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
};
