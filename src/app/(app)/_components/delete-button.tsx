"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Button, type ButtonProps } from "@/components/ui/button";

type Props = {
  /** Server Action que recebe FormData com `id` e deleta. */
  action: (formData: FormData) => Promise<void>;
  /** ID do registro a deletar. */
  id: string;
  /** Texto do título do dialog. */
  title?: string;
  /** Texto da descrição. */
  description?: string;
  /** Mensagem de sucesso. */
  successMessage?: string;
  /** Variant do botão. */
  variant?: ButtonProps["variant"];
  /** Tamanho do botão. */
  size?: ButtonProps["size"];
  /** Texto do botão (se omitido, mostra só o ícone). */
  label?: string;
};

/**
 * Botão de deleção genérico com confirmação via AlertDialog.
 * A Server Action é chamada via FormData (campo `id`).
 */
export function DeleteButton({
  action,
  id,
  title = "Confirmar exclusão",
  description = "Esta ação não pode ser desfeita.",
  successMessage = "Item excluído",
  variant = "destructive",
  size = "sm",
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", id);
        await action(formData);
        toast.success(successMessage);
        setOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao excluir item",
        );
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={isPending}>
          <Trash2 className="h-4 w-4" />
          {label && <span className="ml-2">{label}</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
            {isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
