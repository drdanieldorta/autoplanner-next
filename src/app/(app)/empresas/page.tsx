import Link from "next/link";
import { Building2, Plus, Pencil } from "lucide-react";

import { requireSuperAdmin } from "@/lib/auth";
import { listCompanies } from "@/lib/services/empresas";

import { Button } from "@/components/ui/button";
import { DeleteButton } from "../_components/delete-button";
import { deleteEmpresaFromForm } from "./actions";
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

export const metadata = { title: "Empresas · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  await requireSuperAdmin();
  const companies = await listCompanies();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title="Empresas"
        description="Gerenciar empresas do sistema"
        icon={Building2}
        backHref="/"
        actions={
          <Button asChild>
            <Link href="/empresas/novo">
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Link>
          </Button>
        }
      />

      {companies.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Building2}
              title="Nenhuma empresa cadastrada"
              description="Crie a primeira empresa para começar."
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
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Nicho</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.cnpj || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.nicho || "—"}
                      </TableCell>
                      <TableCell>{formatDate(c.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/empresas/${c.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteButton
                            action={deleteEmpresaFromForm}
                            id={c.id}
                            title="Excluir empresa?"
                            description={`A empresa "${c.name}" será removida. Funcionários, propostas, contratos e protocolos vinculados podem ficar órfãos.`}
                            successMessage="Empresa excluída"
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
            {companies.map((c) => (
              <MobileCard key={c.id}>
                <MobileCardHeader>
                  <MobileCardTitle>{c.name}</MobileCardTitle>
                </MobileCardHeader>
                <MobileCardBody>
                  {c.cnpj && (
                    <MobileCardField label="CNPJ">{c.cnpj}</MobileCardField>
                  )}
                  {c.nicho && (
                    <MobileCardField label="Nicho">{c.nicho}</MobileCardField>
                  )}
                  <MobileCardField label="Criada em">
                    {formatDate(c.created_at)}
                  </MobileCardField>
                </MobileCardBody>
                <MobileCardActions>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/empresas/${c.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteButton
                    action={deleteEmpresaFromForm}
                    id={c.id}
                    title="Excluir empresa?"
                    description={`A empresa "${c.name}" será removida.`}
                    successMessage="Empresa excluída"
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
