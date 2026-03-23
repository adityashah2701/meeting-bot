import { api } from "@/convex/_generated/api";

export const integrationsService = {
  getGoogleCalendarConnection: api.integrations.index.getGoogleCalendarConnection,
  disconnectGoogleCalendar: api.integrations.index.disconnectGoogleCalendar,
};
