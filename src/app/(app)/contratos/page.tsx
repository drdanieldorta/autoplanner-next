import Link from "next/link";
import { FileSignature, Plus, Edit2 } from "lucide-react";

import { requireCompanyAdmin } from "@/lib/auth";
import { listContracts } from "@/lib/services/contratos";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { SearchBox } from "../_components/search-box";
import { DeleteButton } from "../_components/delete-button";
import { deleteContractFromForm } from "./actions";

export const metadata = { title: "Contratos · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requireCompanyAdmin();
  if (!user.companyId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Sua conta não está associada a uma empresa.
        </p>
      </div>
    );
  }
  const { search } = await searchParams;
  const contracts = await listContracts({
    companyId: user.companyId,
    search,
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title="Contratos"
        description="Modelos de contrato customizados"
        icon={FileSignature}
        backHref="/sistema-acompanhamento"
        actions={
          <Button asChild className="bg-primary-blue hover:bg-primary-blue/90">
            <Link href="/contratos/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <SearchBox
            placeholder="Buscar contratos por nome..."
            initialValue={search ?? ""}
          />
        </CardContent>
      </Card>

      {contracts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileSignature}
              title={
                search
                  ? "Nenhum contrato encontrado para essa busca"
                  : "Nenhum contrato cadastrado"
              }
              description={
                search
                  ? "Tente outro termo ou crie um novo contrato."
                  : "Crie um template para usá-lo nos orçamentos."
              }
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Atualizado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.description || "—"}
                      </TableCell>
                      <TableCell>{formatDate(c.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/contratos/${c.id}`}>
                              <Edit2 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteButton
                            action={deleteContractFromForm}
                            id={c.id}
                            title="Excluir contrato"
                            description={`Tem certeza que deseja excluir "${c.name}"?`}
                            successMessage="Contrato excluído"
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
            {contracts.map((c) => (
              <MobileCard key={c.id}>
                <MobileCardHeader>
                  <MobileCardTitle>{c.name}</MobileCardTitle>
                </MobileCardHeader>
                <MobileCardBody>
                  {c.description && (
                    <MobileCardField label="Descrição">
                      {c.description}
                    </MobileCardField>
                  )}
                  <MobileCardField label="Atualizado em">
                    {formatDate(c.updated_at)}
                  </MobileCardField>
                </MobileCardBody>
                <MobileCardActions>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/contratos/${c.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteButton
                    action={deleteContractFromForm}
                    id={c.id}
                    title="Excluir contrato"
                    description={`Tem certeza que deseja excluir "${c.name}"?`}
                    successMessage="Contrato excluído"
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
