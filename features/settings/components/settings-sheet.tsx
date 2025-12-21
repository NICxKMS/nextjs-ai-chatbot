/**
 * Settings Sheet Component
 *
 * Slide-out panel for configuring AI model parameters and behavior.
 * Includes sampling controls, system prompt, and behavior toggles.
 *
 * @module features/settings/components/settings-sheet
 */

'use client';

import { Settings2Icon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/button';
import { Textarea } from '@/shared/components/textarea';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { cn } from '@/lib/utils';

import { useSettings, type AppSettings } from '../stores/settings-store';

/**
 * Props for SettingsButton component.
 */
export interface SettingsButtonProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button that opens the settings sheet.
 *
 * @example
 * ```tsx
 * <SettingsButton className="ml-2" />
 * ```
 */
export function SettingsButton({ className }: SettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className={className}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <Settings2Icon className="mr-1 h-4 w-4" />
        Settings
      </Button>
      <SettingsSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * Icon-only settings button for compact layouts.
 */
export function SettingsIconButton({ className }: SettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className={className}
        onClick={() => setOpen(true)}
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open settings"
      >
        <Settings2Icon className="h-4 w-4" />
      </Button>
      <SettingsSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * Props for SettingsSheet component.
 */
interface SettingsSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (value: boolean) => void;
}

/**
 * Settings sheet containing all configuration options.
 */
export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const {
    sampling,
    systemPrompt,
    enableReasoning,
    streamArtifacts,
    autoScroll,
    updateSampling,
    setSystemPrompt,
    setEnableReasoning,
    setStreamArtifacts,
    setAutoScroll,
    resetSettings,
  } = useSettings();

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col gap-4 sm:max-w-xl"
        side="right"
      >
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>

        {/* Sampling Section */}
        <section className="space-y-4">
          <header>
            <h3 className="font-semibold text-sm">Sampling</h3>
            <p className="text-muted-foreground text-xs">
              Adjust how creative or focused the model should be.
            </p>
          </header>

          {/* Temperature */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between font-medium text-xs">
              <span>Temperature</span>
              <span className="text-muted-foreground text-xs">
                {sampling.temperature.toFixed(2)}
              </span>
            </Label>
            <Input
              max={1.5}
              min={0}
              onChange={(event) =>
                handleNumericInput(event, (value) =>
                  updateSampling({
                    temperature: Math.min(1.5, Math.max(0, Number(value.toFixed(2)))),
                  })
                )
              }
              step={0.01}
              type="number"
              value={sampling.temperature}
            />
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between font-medium text-xs">
              <span>Top P</span>
              <span className="text-muted-foreground text-xs">
                {sampling.topP.toFixed(2)}
              </span>
            </Label>
            <Input
              max={1}
              min={0}
              onChange={(event) =>
                handleNumericInput(event, (value) =>
                  updateSampling({
                    topP: Math.min(1, Math.max(0, Number(value.toFixed(2)))),
                  })
                )
              }
              step={0.01}
              type="number"
              value={sampling.topP}
            />
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between font-medium text-xs">
              <span>Max Output Tokens</span>
              <span className="text-muted-foreground text-xs">
                {sampling.maxOutputTokens.toLocaleString()}
              </span>
            </Label>
            <Input
              max={1_000_000}
              min={256}
              onChange={(event) =>
                handleNumericInput(event, (value) =>
                  updateSampling({
                    maxOutputTokens: Math.round(Math.min(1_000_000, Math.max(256, value))),
                  })
                )
              }
              step={64}
              type="number"
              value={sampling.maxOutputTokens}
            />
          </div>
        </section>

        {/* System Prompt Section */}
        <section className="space-y-2">
          <header>
            <h3 className="font-semibold text-sm">System Prompt</h3>
            <p className="text-muted-foreground text-xs">
              Provide baseline instructions that apply to every conversation.
            </p>
          </header>
          <Textarea
            onChange={(event) => setSystemPrompt(event.target.value)}
            placeholder="You are a helpful assistant..."
            rows={4}
            value={systemPrompt}
          />
        </section>

        {/* Behavior Section */}
        <section className="space-y-3">
          <header>
            <h3 className="font-semibold text-sm">Behavior</h3>
            <p className="text-muted-foreground text-xs">
              Fine-tune runtime options for the chat experience.
            </p>
          </header>

          <SettingToggle
            checked={enableReasoning}
            description="Allow reasoning models to stream their thoughts."
            label="Enable reasoning"
            onCheckedChange={setEnableReasoning}
          />

          <SettingToggle
            checked={streamArtifacts}
            description="Stream artifact updates in real time while generating."
            label="Stream artifacts"
            onCheckedChange={setStreamArtifacts}
          />

          <SettingToggle
            checked={autoScroll}
            description="Automatically follow the latest assistant response."
            label="Auto-scroll conversation"
            onCheckedChange={setAutoScroll}
          />
        </section>

        {/* Footer */}
        <SheetFooter className="mt-auto flex flex-col gap-2 sm:flex-row">
          <Button onClick={resetSettings} type="button" variant="outline">
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

/**
 * Toggle switch for boolean settings.
 */
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
          <p className="text-muted-foreground text-xs">{description}</p>
        ) : null}
      </div>
      <Button
        aria-pressed={checked}
        className={cn(
          'h-6 w-12 rounded-full px-1 text-xs',
          checked ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
        onClick={() => onCheckedChange(!checked)}
        type="button"
        variant="ghost"
      >
        {checked ? 'On' : 'Off'}
      </Button>
    </div>
  );
}
