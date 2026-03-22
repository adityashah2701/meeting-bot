import { api } from "@/convex/_generated/api";

export const organizationService = {
  ensureIntegrations: api.organization.index.ensureIntegrations,
  listIntegrations: api.organization.index.listIntegrations,
};
