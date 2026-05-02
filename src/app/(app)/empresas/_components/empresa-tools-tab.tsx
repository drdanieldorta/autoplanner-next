"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Tool, CompanyTool } from "@/lib/services/empresa-detail";
import { addToolToEmpresa, removeToolFromEmpresa } from "../actions";

type Props = {
  companyId: string;
  availableTools: Tool[];
  assignedTools: CompanyTool[];
};

export function EmpresaToolsTab({
  companyId,
  availableTools,
  assignedTools,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  const assignedIds = new Set(assignedTools.map((a) => a.tool_id));
  const selectableTools = availableTools.filter((t) => !assignedIds.has(t.id));

  const handleAdd = () => {
    if (!selected) {
      toast.error("Selecione uma ferramenta");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("company_id", companyId);
      fd.set("tool_id", selected);
      try {
        await addToolToEmpresa(fd);
        toast.success("Ferramenta vinculada");
        setSelected("");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao vincular ferramenta",
        );
      }
    });
  };

  const handleRemove = (companyToolId: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", companyToolId);
      fd.set("company_id", companyId);
      try {
        await removeToolFromEmpresa(fd);
        toast.success("Ferramenta removida");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao remover ferramenta",
        );
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ferramentas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selected}
            onValueChange={setSelected}
            disabled={selectableTools.length === 0}
          >
            <SelectTrigger className="w-full sm:flex-1">
              <SelectValue
                placeholder={
                  selectableTools.length === 0
                    ? "Todas as ferramentas já foram vinculadas"
                    : "Selecione uma ferramenta"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {selectableTools.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAdd}
            disabled={!selected || isPending}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ferramenta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignedTools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhuma ferramenta atribuída
                </TableCell>
              </TableRow>
            ) : (
              assignedTools.map((ct) => (
                <TableRow key={ct.id}>
                  <TableCell>{ct.tool?.name ?? "—"}</TableCell>
                  <TableCell>{ct.enabled ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleRemove(ct.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
