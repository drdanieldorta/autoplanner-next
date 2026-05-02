"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  createFuncionario,
  type FuncionarioFormState,
} from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4 mr-2" />
      {pending ? "Criando..." : "Criar funcionário"}
    </Button>
  );
}

export function CriarFuncionarioDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FuncionarioFormState, FormData>(
    createFuncionario,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Funcionário criado — convite enviado por email");
      // setOpen via microtask para evitar setState dentro do effect
      // (regra react-hooks/set-state-in-effect do React 19).
      Promise.resolve().then(() => setOpen(false));
    } else {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Funcionário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action}>
          <DialogHeader>
            <DialogTitle>Novo Funcionário</DialogTitle>
            <DialogDescription>
              Será enviado um email de convite para o endereço informado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                name="cpf"
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox id="isAdmin" name="isAdmin" />
              <Label htmlFor="isAdmin" className="cursor-pointer">
                Tornar administrador da empresa
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
