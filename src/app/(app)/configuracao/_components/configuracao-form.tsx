"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { updateCredentials, type UpdateCredentialsState } from "../actions";

type Props = {
  isSuperAdmin: boolean;
  hasFeegow: boolean;
  hasAuthentique: boolean;
  hasCrm: boolean;
  hasCrmAdmin: boolean;
  webhookUrl: string;
  webhookSecret: string;
  webhookEnabled: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="bg-primary-blue hover:bg-primary-blue/90 w-full sm:w-auto"
    >
      <Save className="h-4 w-4 mr-2" />
      {pending ? "Salvando..." : "Salvar Configurações"}
    </Button>
  );
}

export function ConfiguracaoForm({
  isSuperAdmin,
  hasFeegow,
  hasAuthentique,
  hasCrm,
  hasCrmAdmin,
  webhookUrl,
  webhookSecret,
  webhookEnabled,
}: Props) {
  const [state, action] = useActionState<UpdateCredentialsState, FormData>(
    updateCredentials,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Configurações salvas com sucesso");
    } else {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={action} className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Feegow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="feegowToken">Token de acesso</Label>
              <Input
                id="feegowToken"
                name="feegowToken"
                type="password"
                placeholder={
                  hasFeegow ? "Token configurado — preencha para substituir" : "Insira o token Feegow"
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Header <code className="text-xs">x-access-token</code> em
                chamadas à Feegow. Ver docs/INTEGRACOES.md.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Authentique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="authentiqueToken">Token de acesso</Label>
              <Input
                id="authentiqueToken"
                name="authentiqueToken"
                type="password"
                placeholder={
                  hasAuthentique
                    ? "Token configurado — preencha para substituir"
                    : "Insira o token Authentique"
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bearer GraphQL para assinatura digital de contratos.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API CRM (Helena)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="crmToken">Token CRM</Label>
              <Input
                id="crmToken"
                name="crmToken"
                type="password"
                placeholder={
                  hasCrm
                    ? "Token configurado — preencha para substituir"
                    : "Insira o token CRM"
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bearer para <code>api.helena.run/core/v1</code>.
              </p>
            </div>

            {isSuperAdmin && (
              <div>
                <Label htmlFor="crmAdminToken">
                  Token Admin CRM{" "}
                  <span className="text-amber-500">(Super Admin)</span>
                </Label>
                <Input
                  id="crmAdminToken"
                  name="crmAdminToken"
                  type="password"
                  placeholder={
                    hasCrmAdmin
                      ? "Token configurado — preencha para substituir"
                      : "Insira o token admin CRM"
                  }
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Webhook outbound (proposal.created)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="webhookUrl">URL de destino</Label>
              <Input
                id="webhookUrl"
                name="webhookUrl"
                type="url"
                defaultValue={webhookUrl}
                placeholder="https://meu-sistema/webhook/proposta-criada"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recebe POST JSON sempre que uma proposta é criada (modo manual
                ou automático).
              </p>
            </div>
            <div>
              <Label htmlFor="webhookSecret">Secret (HMAC)</Label>
              <Input
                id="webhookSecret"
                name="webhookSecret"
                type="password"
                placeholder={
                  webhookSecret
                    ? "Configurado — preencha para substituir"
                    : "Opcional — usado para HMAC SHA-256"
                }
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="webhookEnabled"
                name="webhookEnabled"
                defaultChecked={webhookEnabled}
              />
              <Label htmlFor="webhookEnabled" className="cursor-pointer">
                Habilitado
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
