"use client";

import { useState } from "react";
import { Focus, Keyboard, MoreHorizontal, PenSquare, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Participant = { _id: string; name: string };

function ToggleRow({
  icon: Icon,
  label,
  active,
  disabled,
  statusLabel,
  onClick,
}: {
  icon: typeof Focus;
  label: string;
  active: boolean;
  disabled?: boolean;
  statusLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-foreground hover:bg-muted"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
        {statusLabel}
      </span>
    </button>
  );
}

/**
 * Consolidates every secondary, occasional action into one popover — Focus
 * mode, the shared whiteboard, pin-participant, Meeting Settings, and
 * Shortcuts. A popover (not the old Drawer) so opening Settings from inside
 * it is just a state flip, not a close-then-reopen animation race.
 */
export function MoreMenu({
  focusMode,
  onFocusModeChange,
  isWhiteboardOpen,
  canUseWhiteboard,
  hasActivePresentation,
  whiteboardOwnerLabel,
  onToggleWhiteboard,
  participants,
  pinnedParticipantId,
  onPinnedParticipantChange,
  canChangeSettings,
  onOpenSettings,
  onOpenShortcuts,
}: {
  focusMode: boolean;
  onFocusModeChange: (value: boolean) => void;
  isWhiteboardOpen: boolean;
  canUseWhiteboard: boolean;
  hasActivePresentation: boolean;
  whiteboardOwnerLabel: string;
  onToggleWhiteboard: () => void;
  participants: Participant[];
  pinnedParticipantId: string | null;
  onPinnedParticipantChange: (id: string | null) => void;
  canChangeSettings: boolean;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}) {
  const [open, setOpen] = useState(false);
  const whiteboardDisabled = !canUseWhiteboard || (hasActivePresentation && !isWhiteboardOpen);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon-lg" variant="outline" className="rounded-xl" title="More">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-72 gap-1.5 p-2 rounded-2xl">
        <ToggleRow
          icon={Focus}
          label="Focus mode"
          active={focusMode}
          statusLabel={focusMode ? "On" : "Off"}
          onClick={() => onFocusModeChange(!focusMode)}
        />

        <ToggleRow
          icon={PenSquare}
          label="Shared whiteboard"
          active={isWhiteboardOpen}
          disabled={whiteboardDisabled}
          statusLabel={isWhiteboardOpen ? `Live by ${whiteboardOwnerLabel}` : "Off"}
          onClick={onToggleWhiteboard}
        />
        {hasActivePresentation && !isWhiteboardOpen ? (
          <p className="px-1 py-1 text-xs text-muted-foreground">
            Stop screen sharing before opening the whiteboard.
          </p>
        ) : !canUseWhiteboard ? (
          <p className="px-1 py-1 text-xs text-muted-foreground">
            Only the host can enable member whiteboard access.
          </p>
        ) : null}

        <div className="rounded-lg border border-border bg-background px-3 py-2.5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Pin participant</p>
          <Select
            value={pinnedParticipantId ?? "none"}
            onValueChange={(value) => onPinnedParticipantChange(value === "none" ? null : value)}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="No pin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No pin</SelectItem>
              {participants.map((participant) => (
                <SelectItem key={participant._id} value={participant._id}>
                  {participant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="my-1 border-t border-border" />

        {canChangeSettings && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Meeting Settings</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onOpenShortcuts();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
        >
          <Keyboard className="h-4 w-4 text-muted-foreground" />
          <span>Keyboard shortcuts</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
