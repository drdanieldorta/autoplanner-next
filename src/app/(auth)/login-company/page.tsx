import { Building2 } from "lucide-react";
import { OtpForm } from "../_components/otp-form";

export const metadata = { title: "Empresa · InfinitePlan" };
export const dynamic = "force-dynamic";

export default function LoginCompanyPage() {
  return (
    <OtpForm
      title="Empresa"
      subtitle="Acesso administrativo da clínica"
      icon={<Building2 className="h-8 w-8" />}
      mode="company"
    />
  );
}
