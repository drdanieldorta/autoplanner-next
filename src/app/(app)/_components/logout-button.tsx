"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Button, type ButtonProps } from "@/components/ui/button";

type Props = ButtonProps & { children?: React.ReactNode; iconOnly?: boolean };

export function LogoutButton({
  children,
  iconOnly = false,
  ...buttonProps
}: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      {...buttonProps}
      disabled={isPending || buttonProps.disabled}
      onClick={() => startTransition(() => signOut())}
    >
      {iconOnly ? <LogOut className="h-4 w-4" /> : children ?? "Sair"}
    </Button>
  );
}
