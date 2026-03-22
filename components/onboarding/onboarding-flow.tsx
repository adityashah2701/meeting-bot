"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateOrganization, useOrganization, useAuth } from '@clerk/nextjs';
import { Target, Cpu, Building2, CheckCircle2, ChevronRight, Languages, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const { isLoaded: isAuthLoaded, userId } = useAuth();

  // Local state for Step 1
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);

  // Local state for Step 2
  const [autoJoin, setAutoJoin] = useState(true);
  const [language, setLanguage] = useState('English');

  // Redirect to sign in if not authenticated
  React.useEffect(() => {
    if (isAuthLoaded && !userId) {
      router.push('/sign-in');
    }
  }, [isAuthLoaded, userId, router]);

  // If organization exists, we should be done!
  React.useEffect(() => {
    if (isOrgLoaded && organization) {
      router.push('/dashboard');
    }
  }, [isOrgLoaded, organization, router]);

  if (!isAuthLoaded || !isOrgLoaded) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!userId || organization) {
    return null;
  }

  const useCases = [
    { id: '1', title: 'Product & Engineering', desc: 'Sprint planning, design reviews, standups.' },
    { id: '2', title: 'Sales & Marketing', desc: 'Client pitches, campaign strategy, discovery.' },
    { id: '3', title: 'Executive Leadership', desc: 'Board meetings, all-hands, strategic alignment.' },
    { id: '4', title: 'Consulting & Agencies', desc: 'Client workshops, interviews, deliverables.' },
  ];

  return (
    <div className="w-full flex justify-center animate-in fade-in duration-500">
      <div className="w-full max-w-2xl bg-card rounded-xl p-8 sm:p-12 border border-border shadow-md relative overflow-hidden">
        
        {/* Progress Bar Header */}
        <div className="flex items-center justify-between mb-12 relative z-10">
          {[
            { num: 1, label: "Use Case", icon: Target },
            { num: 2, label: "Preferences", icon: Cpu },
            { num: 3, label: "Organization", icon: Building2 },
          ].map((s) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div key={s.num} className="flex flex-col items-center gap-2 relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isActive 
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm' 
                    : isCompleted 
                      ? 'border-primary bg-primary/20 text-primary' 
                      : 'border-border bg-background text-muted-foreground'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-bold tracking-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
          {/* Connecting lines */}
          <div className="absolute top-5 left-10 right-10 h-[2px] bg-border -z-10" />
          <div 
            className="absolute top-5 left-10 h-[2px] bg-primary transition-all duration-500 ease-in-out -z-10" 
            style={{ width: `${(step - 1) * 50}%` }} 
          />
        </div>

        {/* --- STEP 1: USE CASE --- */}
        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">How will you use MeetMind?</h2>
              <p className="text-muted-foreground font-medium text-sm">Select your primary use case to pre-configure your AI agents.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {useCases.map((uc) => (
                <div 
                  key={uc.id}
                  onClick={() => setSelectedUseCase(uc.id)}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedUseCase === uc.id 
                      ? 'border-primary bg-primary/5 shadow-sm transform scale-[1.02]' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-foreground text-sm">{uc.title}</h3>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedUseCase === uc.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
                    }`}>
                      {selectedUseCase === uc.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {uc.desc}
                  </p>
                </div>
              ))}
            </div>

            <Button 
              disabled={!selectedUseCase} 
              onClick={() => setStep(2)} 
              className="w-full h-12 rounded-xl text-base shadow-sm"
            >
              Continue <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* --- STEP 2: PREFERENCES --- */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">AI Preferences</h2>
              <p className="text-muted-foreground font-medium text-sm">Customize how the intelligence agents behave during your meetings.</p>
            </div>
            
            <div className="space-y-4">
              {/* Auto Join */}
              <div 
                onClick={() => setAutoJoin(!autoJoin)}
                className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  autoJoin ? 'bg-primary border-primary' : 'border-border bg-background'
                }`}>
                  {autoJoin && <div className="w-2.5 h-2.5 bg-primary-foreground rounded-full" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-foreground" />
                    <h3 className="font-bold text-sm text-foreground">Auto-join Calendar Events</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Allow MeetMind&apos;s bot to automatically join and transcribe meetings marked on your integrated calendar.
                  </p>
                </div>
              </div>

               {/* Language */}
               <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl">
                <div className="w-6 h-6 rounded-full border border-transparent shrink-0 mt-0.5" />
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Languages className="w-4 h-4 text-foreground" />
                    <h3 className="font-bold text-sm text-foreground">Primary Spoken Language</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    The bot will optimize transcription models for this language.
                  </p>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-3 bg-secondary border border-transparent rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)} 
                className="flex-1 h-12 rounded-xl"
              >
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                className="flex-2 h-12 rounded-xl text-base shadow-sm"
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* --- STEP 3: CREATE ORGANIZATION --- */}
        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col items-center text-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">Establish Your Workspace</h2>
              <p className="text-muted-foreground font-medium text-sm mb-6 max-w-md mx-auto">
                Invite your team to collaborate on transcripts, action items, and insights across your entire organization.
              </p>
            </div>
            
            <div className="w-full max-w-md mx-auto p-2 bg-card border border-border rounded-xl shadow-sm">
              <CreateOrganization 
                routing="hash"
                afterCreateOrganizationUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: "w-full flex justify-center shadow-none",
                    card: "shadow-none w-full bg-transparent border-none",
                    headerTitle: "hidden",     // Hide clerk's default title
                    headerSubtitle: "hidden",  // Hide clerk's default subtitle
                    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-medium w-full rounded-xl py-3 h-auto shadow-sm",
                    formFieldInput: "bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 rounded-xl h-11",
                    formFieldLabel: "text-foreground font-semibold text-sm mb-1.5",
                    logoImage: "hidden",       // Hide logo inside org creator
                    footerActionLink: "text-primary hover:text-primary/80 font-medium"
                  }
                }}
              />
            </div>
            
            <button 
              type="button"
              onClick={() => setStep(2)} 
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mt-4"
            >
              Wait, go back to Preferences
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
