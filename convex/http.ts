import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const headers = request.headers;

    try {
      const svixId = headers.get("svix-id");
      const svixTimestamp = headers.get("svix-timestamp");
      const svixSignature = headers.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        return new Response("Missing svix headers", { status: 400 });
      }

      const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("Missing CLERK_WEBHOOK_SECRET");
        return new Response("Server configuration error", { status: 500 });
      }

      const wh = new Webhook(webhookSecret);
      const evt = wh.verify(payloadString, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as any;

      const { id, ...attributes } = evt.data;

      // Handle the webhooks
      switch (evt.type) {
        case "user.created":
        case "user.updated":
          await ctx.runMutation(internal.users.upsertUser, {
            clerkId: id,
            email: attributes.email_addresses?.[0]?.email_address || "",
            firstName: attributes.first_name,
            lastName: attributes.last_name,
            imageUrl: attributes.image_url,
          });
          break;
        case "user.deleted":
          await ctx.runMutation(internal.users.deleteUser, { clerkId: id });
          break;
        case "organization.created":
        case "organization.updated":
          await ctx.runMutation(internal.users.upsertOrganization, {
            clerkId: id,
            name: attributes.name,
            slug: attributes.slug,
            imageUrl: attributes.image_url,
          });
          break;
        case "organization.deleted":
          await ctx.runMutation(internal.users.deleteOrganization, { clerkId: id });
          break;
        case "organizationMembership.created":
          await ctx.runMutation(internal.users.addOrganizationMembership, {
            userClerkId: attributes.public_user_data.user_id,
            orgClerkId: attributes.organization.id,
          });
          break;
        case "organizationMembership.deleted":
          await ctx.runMutation(internal.users.removeOrganizationMembership, {
            userClerkId: attributes.public_user_data.user_id,
            orgClerkId: attributes.organization.id,
          });
          break;
      }

      return new Response(null, { status: 200 });
    } catch (err: any) {
      console.error("Webhook Error:", err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
  }),
});

export default http;
