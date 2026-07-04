import { mutation } from "./_generated/server";

export const deleteAll = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "integrations",
      "meeting_assets",
      "meeting_audit_logs",
      "meeting_exports",
      "meeting_invites",
      "meeting_participants",
      "meeting_reactions",
      "meeting_recordings",
      "meeting_whiteboards",
      "meetings",
      "messages",
      "notifications",
      "notion_integrations",
      "organization_billing_snapshots",
      "organizations",
      "signals",
      "summary_chunks",
      "tasks",
      "transcripts",
      "user_integrations",
      "user_org_memberships",
      "users",
    ] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    return { success: true };
  },
});
