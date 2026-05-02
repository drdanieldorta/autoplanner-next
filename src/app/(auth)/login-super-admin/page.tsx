import { Shield } from "lucide-react";
import { OtpForm } from "../_components/otp-form";

export const metadata = { title: "Super Admin · InfinitePlan" };
export const dynamic = "force-dynamic";

export default function LoginSuperAdminPage() {
  return (
    <OtpForm
      title="Super Admin"
      subtitle="Acesso administrativo global"
      icon={<Shield className="h-8 w-8" />}
      mode="super_admin"
    />
  );
}
