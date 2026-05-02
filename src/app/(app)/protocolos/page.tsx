import Link from "next/link";
import { FileText, Plus, Edit2 } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { listProtocols } from "@/lib/services/protocols";
import { formatCurrency } from "@/lib/currency";

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
import { SearchBox } from "../_components/search-box";
import { DeleteButton } from "../_components/delete-button";
import { deleteProtocolFromForm } from "./actions";

export const metadata = { title: "Protocolos · InfinitePlan" };
export const dynamic = "force-dynamic";

type Search = { search?: string };

export default async function ProtocolosPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
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

  const { search } = await searchParams;
  const protocols = await listProtocols({
    companyId: user.companyId,
    search,
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title="Protocolos"
        description="Gerencie protocolos de procedimentos médicos"
        icon={FileText}
        backHref="/sistema-acompanhamento"
        actions={
          <Button asChild className="bg-primary-blue hover:bg-primary-blue/90">
            <Link href="/protocolos/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Protocolo
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <SearchBox
            placeholder="Buscar protocolos por nome..."
            initialValue={search ?? ""}
          />
        </CardContent>
      </Card>

      {protocols.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title={
                search
                  ? "Nenhum protocolo encontrado para essa busca"
                  : "Nenhum protocolo cadastrado"
              }
              description={
                search
                  ? "Tente outro termo ou crie um novo protocolo."
                  : "Comece criando seu primeiro protocolo."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Itens</TableHead>
                    <TableHead className="text-right">Valor total</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocols.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{p.itemsCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.total_value_cents)}
                      </TableCell>
                      <TableCell>{formatDate(p.created_at ?? "")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/protocolos/${p.id}/editar`}>
                              <Edit2 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteButton
                            action={deleteProtocolFromForm}
                            id={p.id}
                            title="Excluir protocolo"
                            description={`Tem certeza que deseja excluir "${p.name}"? Os itens serão removidos junto.`}
                            successMessage="Protocolo excluído"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile */}
          <MobileCardList>
            {protocols.map((p) => (
              <MobileCard key={p.id}>
                <MobileCardHeader>
                  <MobileCardTitle>{p.name}</MobileCardTitle>
                </MobileCardHeader>
                <MobileCardBody>
                  <MobileCardField label="Itens">
                    {p.itemsCount}
                  </MobileCardField>
                  <MobileCardField label="Valor">
                    {formatCurrency(p.total_value_cents)}
                  </MobileCardField>
                  <MobileCardField label="Criado em">
                    {formatDate(p.created_at ?? "")}
                  </MobileCardField>
                </MobileCardBody>
                <MobileCardActions>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/protocolos/${p.id}/editar`}>
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteButton
                    action={deleteProtocolFromForm}
                    id={p.id}
                    title="Excluir protocolo"
                    description={`Tem certeza que deseja excluir "${p.name}"?`}
                    successMessage="Protocolo excluído"
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
