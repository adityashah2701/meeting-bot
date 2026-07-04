"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, Lock, Settings2, UserCheck, Unlock } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { meetingService } from "@/features/meeting/services/meeting-service";
import type { MeetingJoinMode, MeetingRole, MeetingSettings } from "@/features/meeting/types/meeting-types";

const DEFAULT_SETTINGS: MeetingSettings = {
  joinMode: "organization_only",
  allowScreenShare: true,
  allowWhiteboard: true,
  allowChat: true,
  allowReactions: true,
  allowRecording: true,
  allowParticipantsToUnmute: true,
  autoAdmitOrgUsers: true,
  lobbyEnabled: false,
};

function roleLabel(role: MeetingRole | undefined) {
  switch (role) {
    case "host":
      return "Host";
    case "co_host":
      return "Co-host";
    case "viewer":
      return "Viewer";
    default:
      return "Participant";
  }
}

function inviteStatusLabel(status: "pending" | "accepted" | "declined" | "expired" | "cancelled") {
  if (status === "accepted") return "Accepted";
  if (status === "declined") return "Declined";
  if (status === "expired") return "Expired";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}

function parseInviteEmails(value: string) {
  return [
    ...new Set(
      value
        .split(/[,\s\n;]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function MeetingSettingsPanel({
  meetingId,
  open,
  onOpenChange,
}: {
  meetingId: Id<"meetings">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const meeting = useQuery(meetingService.getMeeting, { meetingId });
  const meetingInvites = useQuery(
    meetingService.listInvites,
    meeting?.effectivePermissions?.canChangeSettings ? { meetingId } : "skip",
  ) ?? [];

  const updateMeetingSettings = useMutation(meetingService.updateMeetingSettings);
  const inviteParticipants = useMutation(meetingService.inviteParticipants);
  const resendInvite = useMutation(meetingService.resendInvite);
  const cancelInvite = useMutation(meetingService.cancelInvite);

  const [settingsDraft, setSettingsDraft] = useState<MeetingSettings>(DEFAULT_SETTINGS);
  const [lockDraft, setLockDraft] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [inviteEmailsInput, setInviteEmailsInput] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (!meeting?.settings) return;
    setSettingsDraft(meeting.settings);
    setLockDraft(Boolean(meeting.isLocked));
  }, [meeting?.isLocked, meeting?.settings]);

  const handleParticipantMutation = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update participant");
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateMeetingSettings({ meetingId, settings: settingsDraft, isLocked: lockDraft });
      onOpenChange(false);
      toast.success("Meeting settings updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleInviteParticipants = async () => {
    const emails = parseInviteEmails(inviteEmailsInput);
    if (emails.length === 0) {
      toast.error("Add at least one valid email");
      return;
    }

    setIsInviting(true);
    try {
      const inserted = await inviteParticipants({ meetingId, emails });
      setInviteEmailsInput("");
      if (inserted.length === 0) {
        toast.message("No new invites were added");
      } else {
        toast.success(`${inserted.length} invite(s) sent`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send invites");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Meeting settings</DialogTitle>
          <DialogDescription>Control access, lobby behavior, and participant privileges.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="invite">
              <UserCheck className="mr-1.5 h-3.5 w-3.5" />
              Invite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-4 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Join Mode</p>
              <Select
                value={settingsDraft.joinMode}
                onValueChange={(value) =>
                  setSettingsDraft((current) => ({ ...current, joinMode: value as MeetingJoinMode }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization_only">Organization only</SelectItem>
                  <SelectItem value="invite_only">Invite only</SelectItem>
                  <SelectItem value="anyone_with_link">Anyone with link</SelectItem>
                  <SelectItem value="ask_to_join">Ask to join</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissions</p>
              <div className="rounded-lg border border-border divide-y divide-border">
                {[
                  ["allowScreenShare", "Allow screen share"],
                  ["allowWhiteboard", "Allow whiteboard"],
                  ["allowChat", "Allow chat"],
                  ["allowReactions", "Allow reactions"],
                  ["allowRecording", "Allow recording"],
                  ["allowParticipantsToUnmute", "Allow participants to unmute"],
                  ["autoAdmitOrgUsers", "Auto-admit org users"],
                  ["lobbyEnabled", "Enable lobby"],
                ].map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <p className="text-sm text-foreground">{label}</p>
                    <Switch
                      checked={settingsDraft[field as keyof MeetingSettings] as boolean}
                      onCheckedChange={(checked) =>
                        setSettingsDraft((current) => ({ ...current, [field]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                {lockDraft ? (
                  <Lock className="h-4 w-4 text-destructive" />
                ) : (
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                )}
                <p className="text-sm text-foreground">Lock meeting</p>
              </div>
              <Switch checked={lockDraft} onCheckedChange={setLockDraft} />
            </div>
          </TabsContent>

          <TabsContent value="invite" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">Add emails to invite participants to this meeting.</p>
            <div className="flex items-center gap-2">
              <Input
                value={inviteEmailsInput}
                onChange={(event) => setInviteEmailsInput(event.target.value)}
                placeholder="alex@company.com, sam@company.com"
              />
              <Button size="sm" onClick={() => void handleInviteParticipants()} disabled={isInviting}>
                {isInviting ? "Inviting..." : "Invite"}
              </Button>
            </div>

            <ScrollArea className="h-52 rounded-md border border-border/60 p-2">
              <div className="space-y-2">
                {meetingInvites.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">No invites yet.</p>
                ) : (
                  meetingInvites.map((invite) => (
                    <div
                      key={invite._id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {roleLabel(invite.role)} · {inviteStatusLabel(invite.resolvedStatus)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {invite.resolvedStatus !== "accepted" && invite.resolvedStatus !== "cancelled" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void handleParticipantMutation(
                                  () => resendInvite({ meetingId, inviteId: invite._id }),
                                  "Invite resent",
                                )
                              }
                            >
                              Resend
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                void handleParticipantMutation(
                                  () => cancelInvite({ meetingId, inviteId: invite._id }),
                                  "Invite cancelled",
                                )
                              }
                            >
                              Cancel
                            </Button>
                          </>
                        ) : null}
                        {invite.resolvedStatus === "accepted" ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Accepted
                          </Badge>
                        ) : null}
                        {invite.resolvedStatus === "cancelled" ? (
                          <Badge variant="outline" className="text-[10px]">
                            Cancelled
                          </Badge>
                        ) : null}
                        {invite.resolvedStatus === "expired" ? (
                          <Badge variant="outline" className="text-[10px]">
                            Expired
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={() => void handleSaveSettings()} disabled={isSavingSettings}>
            {isSavingSettings ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
