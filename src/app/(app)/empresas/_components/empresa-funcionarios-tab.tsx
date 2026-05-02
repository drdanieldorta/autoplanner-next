"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCPF } from "@/lib/masks";

import type { Funcionario } from "@/lib/services/funcionarios";
import {
  addFuncionarioToEmpresa,
  removeFuncionarioFromEmpresa,
  type AddFuncionarioState,
} from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="h-4 w-4 mr-2" />
      {pending ? "Adicionando..." : "Adicionar"}
    </Button>
  );
}

type Props = {
  companyId: string;
  funcionarios: Funcionario[];
};

export function EmpresaFuncionariosTab({ companyId, funcionarios }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [cpf, setCpf] = useState("");

  const [state, formAction] = useActionState<AddFuncionarioState, FormData>(
    addFuncionarioToEmpresa,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Funcionário criado — convite enviado por email");
      formRef.current?.reset();
      // setState após effect para evitar a regra react-hooks/set-state-in-effect.
      Promise.resolve().then(() => setCpf(""));
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Funcionários</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="company_id" value={companyId} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="emp-name" className="text-xs">
                Nome *
              </Label>
              <Input id="emp-name" name="name" required />
            </div>
            <div>
              <Label htmlFor="emp-email" className="text-xs">
                Email *
              </Label>
              <Input id="emp-email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="emp-cpf" className="text-xs">
                CPF *
              </Label>
              <Input
                id="emp-cpf"
                name="cpf"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>
            <div>
              <Label htmlFor="emp-role" className="text-xs">
                Função
              </Label>
              <Input id="emp-role" name="role" placeholder="Ex: Recepção" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox id="emp-isAdmin" name="isAdmin" />
              <Label htmlFor="emp-isAdmin" className="cursor-pointer text-sm">
                Tornar admin da empresa
              </Label>
            </div>
            <SubmitButton />
          </div>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funcionarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum funcionário cadastrado
                </TableCell>
              </TableRow>
            ) : (
              funcionarios.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.email}</TableCell>
                  <TableCell>{f.cpf || "—"}</TableCell>
                  <TableCell>{f.role || "—"}</TableCell>
                  <TableCell>{f.isAdmin ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right">
                    <RemoveFuncionarioButton
                      companyId={companyId}
                      userId={f.user_id}
                      name={f.name ?? f.email ?? "este usuário"}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RemoveFuncionarioButton({
  companyId,
  userId,
  name,
}: {
  companyId: string;
  userId: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("user_id", userId);
        formData.set("company_id", companyId);
        await removeFuncionarioFromEmpresa(formData);
        toast.success("Funcionário removido");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao remover funcionário",
        );
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover funcionário?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} será removido do sistema (incluindo a conta de auth).
            Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
