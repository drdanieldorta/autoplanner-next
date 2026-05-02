import { Clock, Mail, Shield, Stethoscope } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "./logout-button";

type Props = {
  email: string | null;
  status: string | null;
};

export function PendingApproval({ email, status }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">InfinitePlan</h1>
          <p className="text-muted-foreground">Sistema de Acompanhamento</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <CardTitle className="text-xl">Aguardando Aprovação</CardTitle>
            <CardDescription>
              Sua conta foi criada com sucesso e está aguardando aprovação de um
              administrador.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                </div>
                <p className="font-medium text-foreground">{email}</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                </div>
                <p className="font-medium text-orange-500 capitalize">
                  {status ?? "Pendente"}
                </p>
              </div>
            </div>

            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Você receberá um email quando sua conta for aprovada.</p>
                <p>Isso pode levar até 24 horas.</p>
              </div>

              <LogoutButton variant="outline" className="w-full">
                Sair da conta
              </LogoutButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
