import { Users } from "lucide-react";
import { OtpForm } from "../_components/otp-form";

export const metadata = { title: "Funcionário · InfinitePlan" };
export const dynamic = "force-dynamic";

export default function LoginEmployeePage() {
  return (
    <OtpForm
      title="Funcionário"
      subtitle="Acesso operacional"
      icon={<Users className="h-8 w-8" />}
      mode={null}
    />
  );
}
