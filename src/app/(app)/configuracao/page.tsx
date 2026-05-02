import { CheckCircle, Settings, XCircle } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getCredentialsStatus } from "@/lib/services/credentials";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "../_components/page-header";
import { ConfiguracaoForm } from "./_components/configuracao-form";

export const metadata = { title: "Configuração · InfinitePlan" };
export const dynamic = "force-dynamic";

function Indicator({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-2 text-success">
      <CheckCircle className="h-4 w-4" />
      Configurado
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-destructive">
      <XCircle className="h-4 w-4" />
      Não configurado
    </span>
  );
}

export default async function ConfiguracaoPage() {
  const user = await requireUser();
  if (!user.isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Acesso restrito a administradores.
        </p>
      </div>
    );
  }
  if (!user.companyId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Sua conta não está associada a uma empresa.
        </p>
      </div>
    );
  }

  const status = await getCredentialsStatus({ companyId: user.companyId });

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title="Configurações"
        description="Configure as integrações e tokens das APIs"
        icon={Settings}
        backHref="/"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <CheckCircle className="h-5 w-5 text-success" />
            Status das Integrações
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="font-medium">Feegow</p>
              <p className="text-sm text-muted-foreground">
                Sistema médico — pacientes, profissionais e propostas
              </p>
            </div>
            <Indicator ok={status?.hasFeegow ?? false} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="font-medium">Authentique</p>
              <p className="text-sm text-muted-foreground">
                Assinatura digital de contratos via WhatsApp
              </p>
            </div>
            <Indicator ok={status?.hasAuthentique ?? false} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="font-medium">MD.IA</p>
              <p className="text-sm text-muted-foreground">
                Vínculo com o painel MD.IA (api.helena.run)
              </p>
            </div>
            <Indicator ok={status?.hasCrm ?? false} />
          </div>

          {user.isSuperAdmin && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <p className="font-medium">MD.IA Admin</p>
                <p className="text-sm text-muted-foreground">
                  Token administrativo do MD.IA (apenas super admins)
                </p>
              </div>
              <Indicator ok={status?.hasCrmAdmin ?? false} />
            </div>
          )}
        </CardContent>
      </Card>

      <ConfiguracaoForm
        isSuperAdmin={user.isSuperAdmin}
        hasFeegow={status?.hasFeegow ?? false}
        hasAuthentique={status?.hasAuthentique ?? false}
        hasCrm={status?.hasCrm ?? false}
        hasCrmAdmin={status?.hasCrmAdmin ?? false}
      />
    </div>
  );
}
