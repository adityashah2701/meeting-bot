"use client";

import { useEffect } from "react";
import { useUser, useOrganizationList } from "@clerk/nextjs";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";

export function SyncUserWithConvex() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const { userMemberships, isLoaded: isOrgsLoaded } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  const syncUser = useMutation(api.users.index.syncUser);

  useEffect(() => {
    if (isAuthenticated && user && isOrgsLoaded && userMemberships.data) {
      const orgIds = userMemberships.data.map((membership) => membership.organization.id);
      syncUser({ orgIds }).catch(console.error);
    }
  }, [isAuthenticated, user, isOrgsLoaded, userMemberships.data, syncUser]);

  return null;
}
