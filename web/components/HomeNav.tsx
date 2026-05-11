"use client";

import { useAuth } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomeNav() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <Button render={<Link href="/dashboard" />} variant="outline" size="sm">
          My Dashboard
        </Button>
        <UserButton />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <SignInButton mode="modal">
        <Button variant="outline" size="sm">Sign In</Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button size="sm">Get Access</Button>
      </SignUpButton>
    </div>
  );
}
