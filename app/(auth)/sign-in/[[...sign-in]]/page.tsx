import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn 
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-none border border-outline-variant/10 rounded-2xl bg-surface-container-lowest w-full",
          headerTitle: "font-sans text-2xl font-bold tracking-tight text-on-surface",
          headerSubtitle: "text-on-surface-variant text-sm",
          formButtonPrimary: "bg-primary hover:bg-primary-dim text-on-primary font-medium",
          formFieldLabel: "text-sm font-sans font-medium text-on-surface",
          formFieldInput: "bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20",
          footerActionLink: "text-primary hover:text-primary-dim hover:underline",
          socialButtonsBlockButton: "border border-outline-variant/20 hover:bg-surface-container-low text-on-surface",
        }
      }}
    />
  );
}
