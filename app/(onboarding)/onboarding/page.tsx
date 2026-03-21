import React from 'react';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { createMetadata } from '@/lib/metadata';

export const metadata = createMetadata("Onboarding", "Set up your organization and configure your meeting workspace.");

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
