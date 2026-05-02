import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";

import { requireSuperAdmin } from "@/lib/auth";
import { loadEmpresaDetail } from "@/lib/services/empresa-detail";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PageHeader } from "../../_components/page-header";
import { DeleteButton } from "../../_components/delete-button";
import { EmpresaForm } from "../_components/empresa-form";
import { EmpresaFuncionariosTab } from "../_components/empresa-funcionarios-tab";
import { EmpresaToolsTab } from "../_components/empresa-tools-tab";
import { EmpresaCrmTab } from "../_components/empresa-crm-tab";
import { deleteEmpresaFromForm } from "../actions";

export const metadata = { title: "Empresa · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function EmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSuperAdmin();

  const detail = await loadEmpresaDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-6xl">
      <PageHeader
        title={detail.company.name}
        description="Edição completa da empresa"
        icon={Building2}
        backHref="/empresas"
        actions={
          <DeleteButton
            action={deleteEmpresaFromForm}
            id={detail.company.id}
            label="Excluir empresa"
            title="Excluir empresa?"
            description="A empresa será removida. Funcionários, propostas, contratos e protocolos vinculados podem ficar órfãos — verifique antes."
            successMessage="Empresa excluída"
          />
        }
      />

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
          <TabsTrigger value="ferramentas">Ferramentas</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <EmpresaForm
            mode="edit"
            initialValues={{
              id: detail.company.id,
              name: detail.company.name,
              cnpj: detail.company.cnpj,
              nicho: detail.company.nicho,
              endereco: detail.company.endereco,
              ceo_name: detail.company.ceo_name,
              ceo_cpf: detail.company.ceo_cpf,
            }}
          />
        </TabsContent>

        <TabsContent value="funcionarios" className="mt-4">
          <EmpresaFuncionariosTab
            companyId={detail.company.id}
            funcionarios={detail.funcionarios}
          />
        </TabsContent>

        <TabsContent value="ferramentas" className="mt-4">
          <EmpresaToolsTab
            companyId={detail.company.id}
            availableTools={detail.availableTools}
            assignedTools={detail.assignedTools}
          />
        </TabsContent>

        <TabsContent value="crm" className="mt-4">
          <EmpresaCrmTab
            companyId={detail.company.id}
            currentLink={detail.crmLink}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
