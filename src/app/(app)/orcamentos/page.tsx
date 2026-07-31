import Link from "next/link";
import { Calculator, Plus, Edit2, FileText } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { listPropostas } from "@/lib/services/propostas";
import { formatCurrency } from "@/lib/currency";

import { Button } from "@/components/ui/button";
import { DeleteButton } from "../_components/delete-button";
import { deleteOrcamentoFromForm } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  MobileCardList,
  MobileCard,
  MobileCardHeader,
  MobileCardTitle,
  MobileCardBody,
  MobileCardField,
  MobileCardActions,
} from "@/components/ui/mobile-card-list";
import { PageHeader } from "../_components/page-header";
import { EmptyState } from "../_components/empty-state";

export const metadata = { title: "Orçamentos · InfinitePlan" };
export const dynamic = "force-dynamic";

const statusLabels: Record<number, string> = {
  1: "Pendente",
  2: "Aprovada",
  3: "Recusada",
  4: "Em execução",
  5: "Finalizada",
};

const statusColors: Record<number, string> = {
  1: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  2: "bg-green-500/10 text-green-600 dark:text-green-400",
  3: "bg-destructive/10 text-destructive",
  4: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  5: "bg-muted text-muted-foreground",
};

export default async function OrcamentosPage() {
  const user = await requireUser();
  if (!user.companyId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Sua conta não está associada a uma empresa.
        </p>
      </div>
    );
  }

  const propostas = await listPropostas({ companyId: user.companyId });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title="Orçamentos"
        description="Gerencie propostas e orçamentos de procedimentos"
        icon={Calculator}
        iconColor="text-accent-gold"
        iconBg="bg-accent-gold/10"
        backHref="/sistema-acompanhamento"
        actions={
          <Button asChild className="bg-primary-blue hover:bg-primary-blue/90">
            <Link href="/orcamentos/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Link>
          </Button>
        }
      />

      {propostas.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Calculator}
              title="Nenhum orçamento cadastrado"
              description="Crie seu primeiro orçamento para começar."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propostas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.paciente_nome}
                      </TableCell>
                      <TableCell>{p.profissional_nome}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[p.status_id ?? 1]}
                        >
                          {statusLabels[p.status_id ?? 1] ?? p.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.valor_total_cents)}
                      </TableCell>
                      <TableCell>{formatDate(p.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            title="Ver contrato"
                          >
                            <a
                              href={`/api/contratos/${p.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/orcamentos/${p.id}`}>
                              <Edit2 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteButton
                            action={deleteOrcamentoFromForm}
                            id={p.id}
                            title="Excluir orçamento?"
                            description={`O orçamento de ${p.paciente_nome} será removido permanentemente.`}
                            successMessage="Orçamento excluído"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <MobileCardList>
            {propostas.map((p) => (
              <MobileCard key={p.id}>
                <MobileCardHeader>
                  <MobileCardTitle>{p.paciente_nome}</MobileCardTitle>
                  <Badge
                    variant="secondary"
                    className={statusColors[p.status_id ?? 1]}
                  >
                    {statusLabels[p.status_id ?? 1] ?? p.status ?? "—"}
                  </Badge>
                </MobileCardHeader>
                <MobileCardBody>
                  <MobileCardField label="Profissional">
                    {p.profissional_nome}
                  </MobileCardField>
                  <MobileCardField label="Valor">
                    {formatCurrency(p.valor_total_cents)}
                  </MobileCardField>
                  <MobileCardField label="Criado em">
                    {formatDate(p.created_at)}
                  </MobileCardField>
                </MobileCardBody>
                <MobileCardActions>
                  <Button variant="outline" size="sm" asChild title="Ver contrato">
                    <a
                      href={`/api/contratos/${p.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/orcamentos/${p.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteButton
                    action={deleteOrcamentoFromForm}
                    id={p.id}
                    title="Excluir orçamento?"
                    description={`O orçamento de ${p.paciente_nome} será removido permanentemente.`}
                    successMessage="Orçamento excluído"
                  />
                </MobileCardActions>
              </MobileCard>
            ))}
          </MobileCardList>
        </>
      )}
    </div>
  );
}
