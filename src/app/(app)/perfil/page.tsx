import { User } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "../_components/page-header";
import { PerfilForm } from "./_components/perfil-form";

export const metadata = { title: "Meu Perfil · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireUser();

  let companyName: string | null = null;
  if (user.companyId) {
    const supabase = await createClient();
    const result = await supabase
      .from("companies")
      .select("name")
      .eq("id", user.companyId)
      .maybeSingle<{ name: string }>();
    companyName = result.data?.name ?? null;
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-3xl">
      <PageHeader
        title="Meu Perfil"
        description="Visualizar e editar dados pessoais"
        icon={User}
        backHref="/"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <PerfilForm
            name={user.profile?.name ?? ""}
            email={user.profile?.email ?? user.email ?? ""}
            phone={user.profile?.phone ?? ""}
            display_name={user.profile?.display_name ?? ""}
          />
        </CardContent>
      </Card>

      {companyName && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Você pertence a:</p>
            <p className="font-medium text-foreground">{companyName}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
