"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

import type { CompanyCrmLink } from "@/lib/services/empresa-detail";
import { linkEmpresaToCrm, type LinkCrmState } from "../actions";

type CrmCompany = {
  id_company_api: string;
  legalName: string;
  documentId?: string;
};

type Props = {
  companyId: string;
  currentLink: CompanyCrmLink | null;
};

export function EmpresaCrmTab({ companyId, currentLink }: Props) {
  const router = useRouter();
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [selected, setSelected] = useState(currentLink?.crm_company_id ?? "");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLoad = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/empresas", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Falha ao carregar empresas do CRM");
        return;
      }
      const data = (await res.json()) as CrmCompany[];
      setCompanies(data);
      toast.success(`${data.length} empresas carregadas do CRM`);
    } catch {
      toast.error("Erro de rede ao chamar a API do CRM");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = () => {
    if (!selected) {
      toast.error("Selecione uma empresa CRM");
      return;
    }
    const company = companies.find((c) => c.id_company_api === selected);
    const name =
      company?.legalName ?? currentLink?.crm_company_name ?? "Empresa CRM";
    startTransition(async () => {
      const fd = new FormData();
      fd.set("company_id", companyId);
      fd.set("crm_company_id", selected);
      fd.set("crm_company_name", name);
      const result: LinkCrmState = await linkEmpresaToCrm(null, fd);
      if (result?.ok) {
        toast.success("Empresa vinculada ao CRM");
        router.refresh();
      } else {
        toast.error(result?.error ?? "Falha ao vincular");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vinculação CRM</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentLink ? (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">
                Vinculada a: {currentLink.crm_company_name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ID CRM: {currentLink.crm_company_id}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma empresa CRM vinculada ainda.
          </p>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleLoad}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Carregando..." : "Buscar empresas no CRM"}
        </Button>

        {companies.length > 0 && (
          <div className="space-y-2">
            <Label>Empresa CRM</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id_company_api} value={c.id_company_api}>
                    {c.legalName}
                    {c.documentId ? ` (${c.documentId})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleLink}
              disabled={!selected || isPending}
              className="w-full"
            >
              <Link2 className="h-4 w-4 mr-2" />
              {isPending ? "Vinculando..." : "Vincular ao CRM"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
