import { Construction } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  title: string;
  phase: 2 | 3 | 4 | 5 | 6;
  description?: string;
};

export function ComingSoon({ title, phase, description }: Props) {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-amber-500/10 rounded-xl w-fit mb-2">
            <Construction className="h-8 w-8 text-amber-500" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Disponível na <strong>Fase {phase}</strong> da migração.
          </CardDescription>
        </CardHeader>
        {description && (
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              {description}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
