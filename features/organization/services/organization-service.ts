import { api } from "@/convex/_generated/api";

export const organizationService = {
  ensureIntegrations: api.organization.ensureIntegrations,
  listIntegrations: api.organization.listIntegrations,
};
