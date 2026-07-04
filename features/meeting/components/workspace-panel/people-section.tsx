"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { MoreHorizontal, UserCheck, UserX, Volume2, VolumeX } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { meetingService } from "@/features/meeting/services/meeting-service";
import type { MeetingJoinMode, MeetingRole } from "@/features/meeting/types/meeting-types";

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

function joinModeLabel(joinMode: MeetingJoinMode) {
  switch (joinMode) {
    case "organization_only":
      return "Organization only";
    case "invite_only":
      return "Invite only";
    case "ask_to_join":
      return "Ask to join";
    default:
      return "Anyone with link";
  }
}

export function PeopleSection({ meetingId }: { meetingId: Id<"meetings"> }) {
  const meeting = useQuery(meetingService.getMeeting, { meetingId });
  const participants = useQuery(
    meetingService.listParticipants,
    meeting?.currentParticipant?.status === "joined" ? { meetingId } : "skip",
  ) ?? [];
  const waitingRoom = useQuery(
    meetingService.listWaitingRoom,
    meeting?.effectivePermissions?.canAdmitOthers ? { meetingId } : "skip",
  ) ?? [];

  const admitParticipant = useMutation(meetingService.admitParticipant);
  const bulkAdmitParticipants = useMutation(meetingService.bulkAdmitParticipants);
  const rejectParticipant = useMutation(meetingService.rejectParticipant);
  const updateParticipantRole = useMutation(meetingService.updateParticipantRole);
  const setParticipantAudio = useMutation(meetingService.setParticipantAudio);
  const removeParticipant = useMutation(meetingService.removeParticipant);

  const canManageParticipants = Boolean(meeting?.effectivePermissions?.canAdmitOthers);
  const canManageRoles = Boolean(meeting?.effectivePermissions?.canManageRoles);
  const canMuteOthers = Boolean(meeting?.effectivePermissions?.canMuteOthers);
  const canRemoveParticipants = Boolean(meeting?.effectivePermissions?.canRemoveParticipants);
  const selfParticipantId = meeting?.currentParticipant?._id ?? null;

  const handleParticipantMutation = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update participant");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {participants.length} participant{participants.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-muted-foreground">
            Join mode: {joinModeLabel(meeting?.settings?.joinMode ?? "organization_only")}
          </p>
        </div>
      </div>

      <ScrollArea className="h-full pr-3">
        <div className="space-y-4">
          {canManageParticipants && waitingRoom.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Waiting room</p>
                  <p className="text-xs text-muted-foreground">
                    {waitingRoom.length} request{waitingRoom.length === 1 ? "" : "s"} pending
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void handleParticipantMutation(
                      () =>
                        bulkAdmitParticipants({
                          meetingId,
                          participantIds: waitingRoom.map((participant) => participant._id),
                        }),
                      "Waiting room admitted",
                    )
                  }
                >
                  Admit all
                </Button>
              </div>

              {waitingRoom.map((participant) => (
                <div
                  key={participant._id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{participant.name}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel(participant.role)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void handleParticipantMutation(
                          () => admitParticipant({ meetingId, participantId: participant._id }),
                          `${participant.name} admitted`,
                        )
                      }
                    >
                      Admit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        void handleParticipantMutation(
                          () => rejectParticipant({ meetingId, participantId: participant._id }),
                          `${participant.name} rejected`,
                        )
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            {participants.map((participant) => {
              const canManageThisParticipant =
                participant._id !== selfParticipantId &&
                participant.role !== "host" &&
                (canManageRoles || canMuteOthers || canRemoveParticipants);

              return (
                <div
                  key={participant._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{participant.name}</p>
                      <Badge variant={participant.role === "host" ? "default" : "secondary"} className="text-[10px]">
                        {roleLabel(participant.role)}
                      </Badge>
                      {participant.isScreenSharing ? (
                        <Badge variant="outline" className="text-[10px]">
                          Presenting
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {participant.isMicEnabled ? "Mic on" : "Mic off"} ·{" "}
                      {participant.isCameraEnabled ? "Camera on" : "Camera off"}
                    </p>
                  </div>

                  {canManageThisParticipant ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{participant.name}</DropdownMenuLabel>
                        {canManageRoles ? (
                          <>
                            {participant.role !== "co_host" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleParticipantMutation(
                                    () =>
                                      updateParticipantRole({
                                        meetingId,
                                        participantId: participant._id,
                                        role: "co_host",
                                      }),
                                    `${participant.name} is now a co-host`,
                                  )
                                }
                              >
                                <UserCheck className="h-4 w-4" />
                                Make co-host
                              </DropdownMenuItem>
                            ) : null}
                            {participant.role !== "participant" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleParticipantMutation(
                                    () =>
                                      updateParticipantRole({
                                        meetingId,
                                        participantId: participant._id,
                                        role: "participant",
                                      }),
                                    `${participant.name} is now a participant`,
                                  )
                                }
                              >
                                <UserCheck className="h-4 w-4" />
                                Make participant
                              </DropdownMenuItem>
                            ) : null}
                            {participant.role !== "viewer" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleParticipantMutation(
                                    () =>
                                      updateParticipantRole({
                                        meetingId,
                                        participantId: participant._id,
                                        role: "viewer",
                                      }),
                                    `${participant.name} is now a viewer`,
                                  )
                                }
                              >
                                <UserCheck className="h-4 w-4" />
                                Make viewer
                              </DropdownMenuItem>
                            ) : null}
                          </>
                        ) : null}

                        {canMuteOthers ? (
                          <DropdownMenuItem
                            onClick={() =>
                              void handleParticipantMutation(
                                () =>
                                  setParticipantAudio({
                                    meetingId,
                                    participantId: participant._id,
                                    isMicEnabled: !participant.isMicEnabled,
                                  }),
                                participant.isMicEnabled
                                  ? `${participant.name} muted`
                                  : `${participant.name} unmuted`,
                              )
                            }
                          >
                            {participant.isMicEnabled ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                            {participant.isMicEnabled ? "Mute participant" : "Unmute participant"}
                          </DropdownMenuItem>
                        ) : null}

                        {canRemoveParticipants ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                void handleParticipantMutation(
                                  () => removeParticipant({ meetingId, participantId: participant._id }),
                                  `${participant.name} removed`,
                                )
                              }
                            >
                              <UserX className="h-4 w-4" />
                              Remove from meeting
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
