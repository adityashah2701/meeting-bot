import { api } from "@/convex/_generated/api";

export const integrationsService = {
  getGoogleCalendarConnection: api.integrations.index.getGoogleCalendarConnection,
  disconnectGoogleCalendar: api.integrations.index.disconnectGoogleCalendar,
  getNotionConnection: api.integrations.index.getNotionConnection,
  disconnectNotion: api.integrations.index.disconnectNotion,
  updateNotionTargetPage: api.integrations.index.updateNotionTargetPage,
};
