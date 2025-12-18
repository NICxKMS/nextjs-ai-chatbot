"use client";

import { Settings2Icon } from "lucide-react";
import { useBoolean } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
    type AppSettings,
    useSettings,
    useSettingsSnapshot,
} from "@/lib/ui/settings-store";
import { cn } from "@/lib/utils";

export function SettingsButton({ className }: { className?: string }) {
    const dialog = useBoolean(false);

    return (
        <>
            <Button
                className={className}
                onClick={dialog.setTrue}
                type="button"
                variant="outline"
            >
                <Settings2Icon className="mr-1 h-4 w-4" />
                Settings
            </Button>
            <SettingsSheet onOpenChange={dialog.setValue} open={dialog.value} />
        </>
    );
}

export function SettingsSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (value: boolean) => void;
}) {
    const { updateSettings, resetSettings } = useSettings();
    const settings = useSettingsSnapshot();

    const handleSamplingChange = (
        partial: Partial<AppSettings["sampling"]>
    ) => {
        updateSettings((current) => ({
            ...current,
            sampling: { ...current.sampling, ...partial },
        }));
    };

    const handleNumericInput = (
        event: React.ChangeEvent<HTMLInputElement>,
        updater: (value: number) => void
    ) => {
        const value = Number.parseFloat(event.target.value);
        if (Number.isNaN(value)) {
            return;
        }
        updater(value);
    };

    return (
        <Sheet onOpenChange={onOpenChange} open={open}>
            <SheetContent
                className="flex w-full flex-col gap-4 sm:max-w-xl"
                side="right"
            >
                <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                </SheetHeader>

                <section className="space-y-4">
                    <header>
                        <h3 className="font-semibold text-sm">Sampling</h3>
                        <p className="text-muted-foreground text-xs">
                            Adjust how creative or focused the model should be.
                        </p>
                    </header>

                    <div className="space-y-2">
                        <Label className="flex items-center justify-between font-medium text-xs">
                            <span>Temperature</span>
                            <span className="text-muted-foreground text-xs">
                                {settings.sampling.temperature.toFixed(2)}
                            </span>
                        </Label>
                        <Input
                            max={1.5}
                            min={0}
                            onChange={(event) =>
                                handleNumericInput(event, (value) =>
                                    handleSamplingChange({
                                        temperature: Math.min(
                                            1.5,
                                            Math.max(
                                                0,
                                                Number(value.toFixed(2))
                                            )
                                        ),
                                    })
                                )
                            }
                            step={0.01}
                            type="number"
                            value={settings.sampling.temperature}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center justify-between font-medium text-xs">
                            <span>Top P</span>
                            <span className="text-muted-foreground text-xs">
                                {settings.sampling.topP.toFixed(2)}
                            </span>
                        </Label>
                        <Input
                            max={1}
                            min={0}
                            onChange={(event) =>
                                handleNumericInput(event, (value) =>
                                    handleSamplingChange({
                                        topP: Math.min(
                                            1,
                                            Math.max(
                                                0,
                                                Number(value.toFixed(2))
                                            )
                                        ),
                                    })
                                )
                            }
                            step={0.01}
                            type="number"
                            value={settings.sampling.topP}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center justify-between font-medium text-xs">
                            <span>Max Output Tokens</span>
                            <span className="text-muted-foreground text-xs">
                                {settings.sampling.maxOutputTokens.toLocaleString()}
                            </span>
                        </Label>
                        <Input
                            max={1_000_000}
                            min={256}
                            onChange={(event) =>
                                handleNumericInput(event, (value) =>
                                    handleSamplingChange({
                                        maxOutputTokens: Math.round(
                                            Math.min(
                                                1_000_000,
                                                Math.max(256, value)
                                            )
                                        ),
                                    })
                                )
                            }
                            step={64}
                            type="number"
                            value={settings.sampling.maxOutputTokens}
                        />
                    </div>
                </section>

                <section className="space-y-2">
                    <header>
                        <h3 className="font-semibold text-sm">System Prompt</h3>
                        <p className="text-muted-foreground text-xs">
                            Provide baseline instructions that apply to every
                            conversation.
                        </p>
                    </header>
                    <Textarea
                        onChange={(event) =>
                            updateSettings((current) => ({
                                ...current,
                                systemPrompt: event.target.value,
                            }))
                        }
                        placeholder="You are a helpful assistant..."
                        rows={4}
                        value={settings.systemPrompt}
                    />
                </section>

                <section className="space-y-3">
                    <header>
                        <h3 className="font-semibold text-sm">Behavior</h3>
                        <p className="text-muted-foreground text-xs">
                            Fine-tune runtime options for the chat experience.
                        </p>
                    </header>

                    <SettingToggle
                        checked={settings.enableReasoning}
                        description="Allow reasoning models to stream their thoughts."
                        label="Enable reasoning"
                        onCheckedChange={(value) =>
                            updateSettings((current) => ({
                                ...current,
                                enableReasoning: value,
                            }))
                        }
                    />

                    <SettingToggle
                        checked={settings.streamArtifacts}
                        description="Stream artifact updates in real time while generating."
                        label="Stream artifacts"
                        onCheckedChange={(value) =>
                            updateSettings((current) => ({
                                ...current,
                                streamArtifacts: value,
                            }))
                        }
                    />

                    <SettingToggle
                        checked={settings.autoScroll}
                        description="Automatically follow the latest assistant response."
                        label="Auto-scroll conversation"
                        onCheckedChange={(value) =>
                            updateSettings((current) => ({
                                ...current,
                                autoScroll: value,
                            }))
                        }
                    />
                </section>

                <SheetFooter className="mt-auto flex flex-col gap-2 sm:flex-row">
                    <Button
                        onClick={() => {
                            resetSettings();
                        }}
                        type="button"
                        variant="outline"
                    >
                        Reset to defaults
                    </Button>
                    <Button onClick={() => onOpenChange(false)} type="button">
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

function SettingToggle({
    checked,
    onCheckedChange,
    label,
    description,
}: {
    checked: boolean;
    onCheckedChange: (value: boolean) => void;
    label: string;
    description?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-md border px-3 py-2">
            <div>
                <span className="font-medium text-sm">{label}</span>
                {description ? (
                    <p className="text-muted-foreground text-xs">
                        {description}
                    </p>
                ) : null}
            </div>
            <Button
                aria-pressed={checked}
                className={cn(
                    "h-6 w-12 rounded-full px-1 text-xs",
                    checked ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
                onClick={() => onCheckedChange(!checked)}
                type="button"
                variant="ghost"
            >
                {checked ? "On" : "Off"}
            </Button>
        </div>
    );
}
