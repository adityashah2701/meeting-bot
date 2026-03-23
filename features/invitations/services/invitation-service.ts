import { api } from "@/convex/_generated/api";

export const invitationService = {
  listMyInvitations: api.invitations.index.listMine,
  respondToInvitation: api.invitations.index.respond,
};
