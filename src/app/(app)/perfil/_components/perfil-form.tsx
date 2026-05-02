"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateProfile, type UpdateProfileState } from "../actions";

type Props = {
  name: string;
  email: string;
  phone: string;
  display_name: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4 mr-2" />
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function PerfilForm({ name, email, phone, display_name }: Props) {
  const [state, action] = useActionState<UpdateProfileState, FormData>(
    updateProfile,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Perfil atualizado");
    else toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" name="name" defaultValue={name} required />
        </div>
        <div>
          <Label htmlFor="display_name">Nome de exibição</Label>
          <Input
            id="display_name"
            name="display_name"
            defaultValue={display_name}
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={phone}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
