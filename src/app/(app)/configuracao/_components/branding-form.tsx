"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Palette, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DOC_FALLBACK_PRIMARY,
  normalizeHex,
  resolveDocPalette,
} from "@/lib/branding/palette";

import { updateBranding, type UpdateBrandingState } from "../actions";

type Props = {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Save className="h-4 w-4 mr-2" />
      {pending ? "Salvando..." : "Salvar identidade visual"}
    </Button>
  );
}

export function BrandingForm({
  logoUrl,
  primaryColor,
  secondaryColor,
}: Props) {
  const [state, action] = useActionState<UpdateBrandingState, FormData>(
    updateBranding,
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [primary, setPrimary] = useState(primaryColor ?? "");
  const [secondary, setSecondary] = useState(secondaryColor ?? "");
  // null = mantém a logo atual; string = preview do arquivo escolhido
  const [pickedPreview, setPickedPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      // Não precisa resetar `removeLogo`: o revalidatePath já devolve
      // logoUrl=null, e escolher um arquivo novo limpa a flag.
      toast.success("Identidade visual salva");
    } else {
      toast.error(state.error);
    }
  }, [state]);

  // Object URL do arquivo escolhido precisa ser revogado ao trocar/desmontar.
  useEffect(() => {
    return () => {
      if (pickedPreview) URL.revokeObjectURL(pickedPreview);
    };
  }, [pickedPreview]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setRemoveLogo(false);
  };

  const onRemoveLogo = () => {
    setPickedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setRemoveLogo(true);
  };

  const shownLogo = pickedPreview ?? (removeLogo ? null : logoUrl);

  // Mesma resolução do PDF: sem secundária, deriva um tom da primária.
  const palette = resolveDocPalette(primary || null, secondary || null);
  const previewAccent = normalizeHex(primary) ?? DOC_FALLBACK_PRIMARY;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Palette className="h-5 w-5 text-primary-blue" />
          Identidade visual
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Logo e cores da empresa aplicadas aos documentos gerados (contratos).
          Sem nada configurado, o documento sai no padrão neutro do sistema.
        </p>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          <input
            type="hidden"
            name="removeLogo"
            value={removeLogo ? "1" : "0"}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="logo">Logo</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-40 shrink-0 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                  {shownLogo ? (
                    // next/image exige domínios liberados; o preview local é
                    // blob: e a logo salva vem do Storage. <img> evita a
                    // configuração de remotePatterns só para isso.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shownLogo}
                      alt="Logo da empresa"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Sem logo
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    ref={fileInputRef}
                    id="logo"
                    name="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={onPickFile}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    <Upload className="h-3 w-3 inline mr-1" />
                    PNG, JPG, WEBP ou SVG · máx. 2 MB
                  </p>
                  {shownLogo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRemoveLogo}
                      className="text-destructive hover:text-destructive h-8 px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remover logo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="primaryColor">Cor primária</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    aria-label="Seletor de cor primária"
                    value={normalizeHex(primary) ?? DOC_FALLBACK_PRIMARY}
                    onChange={(e) => setPrimary(e.target.value)}
                    className="h-10 w-14 rounded border cursor-pointer bg-transparent p-1"
                  />
                  <Input
                    id="primaryColor"
                    name="primaryColor"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    placeholder="#1e40af"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Filete do cabeçalho, barras de seção e cabeçalho da tabela.
                </p>
              </div>

              <div>
                <Label htmlFor="secondaryColor">Cor secundária</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    aria-label="Seletor de cor secundária"
                    value={normalizeHex(secondary) ?? palette.secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                    className="h-10 w-14 rounded border cursor-pointer bg-transparent p-1"
                  />
                  <Input
                    id="secondaryColor"
                    name="secondaryColor"
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                    placeholder="Opcional"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fundos sutis. Em branco, derivo um tom claro da primária.
                </p>
              </div>
            </div>
          </div>

          {/* Prévia do cabeçalho que entra no documento */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Prévia do cabeçalho do documento
            </Label>
            <div className="mt-2 rounded-lg border bg-white p-6">
              {shownLogo ? (
                <div
                  className="flex items-center pb-3"
                  style={{ borderBottom: `3px solid ${previewAccent}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shownLogo}
                    alt=""
                    className="max-h-12 max-w-[200px] object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pb-3 border-b">
                  Sem logo, o documento sai sem cabeçalho — as cores
                  continuam sendo aplicadas.
                </p>
              )}
              <div
                className="mt-3 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide"
                style={{
                  background: palette.secondary,
                  color: palette.onSecondary,
                }}
              >
                Entregas e quantidades
              </div>
            </div>
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
