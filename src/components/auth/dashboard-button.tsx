"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

export type DashboardAwareButtonProps = ComponentProps<typeof Button> & {
  signedOutLabel: string;
  signedOutHref: string;
  signedInLabel?: string;
  signedInHref?: string;
  linkClassName?: string;
};

export function DashboardAwareButton({
  signedOutLabel,
  signedOutHref,
  signedInLabel = "Go to dashboard",
  signedInHref = "/dashboard",
  linkClassName,
  ...buttonProps
}: DashboardAwareButtonProps) {
  const { user } = useAuth();

  const label = user ? signedInLabel : signedOutLabel;
  const href = user ? signedInHref : signedOutHref;

  return (
    <Button {...buttonProps} asChild>
      <Link href={href} className={linkClassName}>
        {label}
      </Link>
    </Button>
  );
}
