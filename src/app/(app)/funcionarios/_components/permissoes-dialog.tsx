"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { setFuncionarioToolPermissions } from "../actions";

type Tool = { id: string; name: string; description: string | null };

type FetchedPermissions = {
  isAdmin: boolean;
  toolIds: string[];
  companyTools: Tool[];
};

type Props = {
  userId: string;
  funcionarioName: string;
};

/**
 * Dialog de permissões de ferramentas. Carrega lazy ao abrir (chama
 * `GET /api/funcionarios/:id/permissions`) — evita N queries ao montar
 * a tabela de funcionários.
 */
export function PermissoesDialog({ userId, funcionarioName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FetchedPermissions | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset quando fechar
      setData(null);
      setSelected(new Set());
      return;
    }
    // Carrega permissões no abrir
    setLoading(true);
    try {
      const res = await fetch(
        `/api/funcionarios/${userId}/permissions`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Falha ao carregar permissões");
        setOpen(false);
        return;
      }
      const fetched = (await res.json()) as FetchedPermissions;
      setData(fetched);
      setSelected(new Set(fetched.toolIds));
    } catch {
      toast.error("Erro de rede ao carregar permissões");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (toolId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  const handleSave = () => {
    if (!data) return;
    startTransition(async () => {
      const result = await setFuncionarioToolPermissions({
        user_id: userId,
        tool_ids: Array.from(selected),
      });
      if (result?.ok) {
        toast.success("Permissões atualizadas");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result?.error ?? "Erro ao salvar permissões");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Permissões">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permissões de ferramentas</DialogTitle>
          <DialogDescription>
            Selecione as ferramentas que {funcionarioName} pode acessar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Carregando...
          </p>
        ) : data?.isAdmin ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Administradores têm acesso automático a todas as ferramentas
            da empresa.
          </p>
        ) : data ? (
          data.companyTools.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma ferramenta disponível. Vincule ferramentas à empresa
              primeiro.
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
              {data.companyTools.map((tool) => (
                <label
                  key={tool.id}
                  className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/40 cursor-pointer"
                >
                  <Checkbox
                    id={`tool-${tool.id}`}
                    checked={selected.has(tool.id)}
                    onCheckedChange={() => toggle(tool.id)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`tool-${tool.id}`}
                      className="cursor-pointer font-medium"
                    >
                      {tool.name}
                    </Label>
                    {tool.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {tool.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading || isPending || data?.isAdmin}
            onClick={handleSave}
          >
            <Save className="h-4 w-4 mr-2" />
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
