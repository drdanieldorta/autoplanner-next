import Link from "next/link";
import { Building2, Check, LogIn, X } from "lucide-react";

import { requireSuperAdmin } from "@/lib/auth";
import { loadCompanyOverview } from "@/lib/services/admin-dashboard";
import { startImpersonation } from "@/lib/impersonation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  MobileCard,
  MobileCardList,
} from "@/components/ui/mobile-card-list";

import { PageHeader } from "../_components/page-header";

export const metadata = { title: "Admin · InfinitePlan" };
export const dynamic = "force-dynamic";

function formatLast(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function TokenIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="h-4 w-4 text-emerald-600" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground" />
  );
}

export default async function AdminDashboardPage() {
  await requireSuperAdmin();
  const companies = await loadCompanyOverview();

  const totalPropostas = companies.reduce(
    (acc, c) => acc + c.propostas_count,
    0,
  );
  const totalFuncionarios = companies.reduce(
    (acc, c) => acc + c.funcionarios_count,
    0,
  );
  const withFeegow = companies.filter((c) => c.has_feegow).length;
  const withAuthentique = companies.filter((c) => c.has_authentique).length;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title="Painel Super Admin"
        description="Panorama de todas as empresas, status de tokens e atividade"
        icon={Building2}
        iconColor="text-accent-gold"
        iconBg="bg-accent-gold/10"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Empresas</CardDescription>
            <CardTitle className="text-2xl">{companies.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Funcionários</CardDescription>
            <CardTitle className="text-2xl">{totalFuncionarios}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Propostas</CardDescription>
            <CardTitle className="text-2xl">{totalPropostas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Com Feegow</CardDescription>
            <CardTitle className="text-2xl">
              {withFeegow}
              <span className="text-sm text-muted-foreground font-normal">
                {" "}
                / {companies.length}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Com Authentique</CardDescription>
            <CardTitle className="text-2xl">
              {withAuthentique}
              <span className="text-sm text-muted-foreground font-normal">
                {" "}
                / {companies.length}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabela desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Empresas</CardTitle>
          <CardDescription>
            Tokens configurados por empresa. Clique em &quot;Entrar como&quot;
            para usar o painel como aquela empresa — sai pelo banner amarelo
            no topo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Feegow</TableHead>
                <TableHead className="text-center">Authentique</TableHead>
                <TableHead className="text-center">Helena</TableHead>
                <TableHead className="text-right">Funcionários</TableHead>
                <TableHead className="text-right">Propostas</TableHead>
                <TableHead>Última proposta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/empresas/${c.id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <TokenIcon ok={c.has_feegow} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <TokenIcon ok={c.has_authentique} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <TokenIcon ok={c.has_helena} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.funcionarios_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.propostas_count}
                  </TableCell>
                  <TableCell>{formatLast(c.last_proposta_at)}</TableCell>
                  <TableCell className="text-right">
                    <form action={startImpersonation.bind(null, c.id)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        Entrar como
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile */}
      <MobileCardList className="md:hidden">
        {companies.map((c) => (
          <MobileCard key={c.id}>
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/empresas/${c.id}`}
                className="font-medium hover:underline"
              >
                {c.name}
              </Link>
              <form action={startImpersonation.bind(null, c.id)}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Entrar
                </Button>
              </form>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mt-3">
              <div className="flex items-center gap-1">
                <TokenIcon ok={c.has_feegow} /> Feegow
              </div>
              <div className="flex items-center gap-1">
                <TokenIcon ok={c.has_authentique} /> Authentique
              </div>
              <div className="flex items-center gap-1">
                <TokenIcon ok={c.has_helena} /> Helena
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div>
                <p className="text-muted-foreground">Funcionários</p>
                <p className="font-medium">{c.funcionarios_count}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Propostas</p>
                <p className="font-medium">{c.propostas_count}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Última</p>
                <p className="font-medium">{formatLast(c.last_proposta_at)}</p>
              </div>
            </div>
          </MobileCard>
        ))}
      </MobileCardList>
    </div>
  );
}
