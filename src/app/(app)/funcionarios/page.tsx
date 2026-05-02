import { Settings, Users } from "lucide-react";

import { requireCompanyAdmin } from "@/lib/auth";
import { listFuncionarios } from "@/lib/services/funcionarios";

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
import { DeleteButton } from "../_components/delete-button";
import { CriarFuncionarioDialog } from "./_components/criar-funcionario-dialog";
import { PermissoesDialog } from "./_components/permissoes-dialog";
import { deleteFuncionarioFromForm } from "./actions";

export const metadata = { title: "Funcionários · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function FuncionariosPage() {
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

  const funcionarios = await listFuncionarios({ companyId: user.companyId });

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title="Funcionários"
        description="Gerencie funcionários e suas permissões de ferramentas"
        icon={Users}
        backHref="/"
        actions={<CriarFuncionarioDialog />}
      />

      {funcionarios.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title="Nenhum funcionário cadastrado"
              description="Clique em 'Novo Funcionário' para enviar um convite."
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
                    <TableHead>Email</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionarios.map((f) => (
                    <TableRow key={f.user_id}>
                      <TableCell className="font-medium">
                        {f.name || f.display_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.cpf || "—"}
                      </TableCell>
                      <TableCell>
                        {f.isAdmin ? (
                          <Badge variant="default">Admin</Badge>
                        ) : (
                          <Badge variant="secondary">Funcionário</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {f.status === "approved" ? (
                          <Badge
                            variant="secondary"
                            className="bg-success/10 text-success"
                          >
                            Aprovado
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-warning/10 text-warning"
                          >
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {f.isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title="Admins têm acesso a todas as ferramentas"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          ) : (
                            <PermissoesDialog
                              userId={f.user_id}
                              funcionarioName={f.name || f.email || "este usuário"}
                            />
                          )}
                          <DeleteButton
                            action={deleteFuncionarioFromForm}
                            id={f.user_id}
                            title="Excluir funcionário"
                            description={`Tem certeza que deseja excluir "${f.name || f.email}"? Esta ação não pode ser desfeita.`}
                            successMessage="Funcionário excluído"
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
            {funcionarios.map((f) => (
              <MobileCard key={f.user_id}>
                <MobileCardHeader>
                  <MobileCardTitle>
                    {f.name || f.display_name || "—"}
                  </MobileCardTitle>
                  {f.isAdmin ? (
                    <Badge variant="default">Admin</Badge>
                  ) : (
                    <Badge variant="secondary">Funcionário</Badge>
                  )}
                </MobileCardHeader>
                <MobileCardBody>
                  <MobileCardField label="Email">
                    {f.email || "—"}
                  </MobileCardField>
                  {f.cpf && (
                    <MobileCardField label="CPF">{f.cpf}</MobileCardField>
                  )}
                  <MobileCardField label="Status">
                    {f.status ?? "—"}
                  </MobileCardField>
                </MobileCardBody>
                <MobileCardActions>
                  {f.isAdmin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      title="Admins têm acesso a todas as ferramentas"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  ) : (
                    <PermissoesDialog
                      userId={f.user_id}
                      funcionarioName={f.name || f.email || "este usuário"}
                    />
                  )}
                  <DeleteButton
                    action={deleteFuncionarioFromForm}
                    id={f.user_id}
                    title="Excluir funcionário"
                    description={`Tem certeza que deseja excluir "${f.name || f.email}"?`}
                    successMessage="Funcionário excluído"
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
