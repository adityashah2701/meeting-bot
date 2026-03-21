"use client";

import { useEffect } from "react";
import { OrganizationProfile, useOrganization } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { LoadingBlock } from "@/components/shared/loading-block";
import { organizationService } from "@/features/organization/services/organization-service";

export function OrganizationPage() {
  const { organization } = useOrganization();
  const ensureIntegrations = useMutation(organizationService.ensureIntegrations);

  useEffect(() => {
    if (organization?.id) {
      ensureIntegrations({ orgId: organization.id }).catch(() => undefined);
    }
  }, [ensureIntegrations, organization?.id]);

  if (!organization) {
    return <LoadingBlock className="h-80 w-full" />;
  }

  return (
    <div className="max-w-5xl">
      <div className="border border-border bg-card p-2">
        <OrganizationProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none w-full bg-transparent border-none rounded-none",
              navbar: "hidden md:flex border-r border-border pr-6",
              navbarButton: "text-muted-foreground hover:bg-muted hover:text-foreground rounded-none",
              headerTitle: "text-xl font-bold tracking-tight text-foreground",
              headerSubtitle: "text-muted-foreground text-sm",
              profileSectionTitle: "text-foreground font-semibold border-b border-border pb-2 mb-4",
              profileSectionContent: "text-muted-foreground",
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-none",
              badge: "bg-primary/10 text-primary border border-primary/20 rounded-none",
              tableHead: "text-muted-foreground font-semibold text-xs uppercase tracking-wider",
              tableData: "text-foreground text-sm",
              userPreviewTextContainer: "mt-0.5",
              formFieldInput: "rounded-none border-border bg-background",
            },
          }}
        />
      </div>
    </div>
  );
}
