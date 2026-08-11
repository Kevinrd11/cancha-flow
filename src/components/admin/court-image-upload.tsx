"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, LoaderCircle, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAllowedImageUrl } from "@/lib/images";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  fieldId: string;
  imageUrl: string;
  /** Mantiene sincronizado el campo del formulario que guarda el resto de la ficha. */
  onChange: (imageUrl: string) => void;
};

export function CourtImageUpload({ fieldId, imageUrl, onChange }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Vista previa local mientras el archivo viaja al servidor.
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? (isAllowedImageUrl(imageUrl) ? imageUrl : null);

  async function upload(file: File) {
    setError("");
    if (!ACCEPTED.includes(file.type)) { setError("El archivo debe ser una imagen JPG, PNG o WEBP"); return; }
    if (file.size > MAX_BYTES) { setError("La fotografía no puede pesar más de 5 MB"); return; }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setLoading(true);
    const body = new FormData();
    body.append("fieldId", fieldId);
    body.append("file", file);
    const response = await fetch("/api/admin/court/image", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    URL.revokeObjectURL(objectUrl);
    setPreview(null);
    if (!response.ok) { setError(payload.error ?? "No se pudo subir la fotografía"); return; }
    onChange(payload.imageUrl);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("¿Quitar la fotografía? Su cancha se publicará sin imagen.")) return;
    setLoading(true); setError("");
    const response = await fetch("/api/admin/court/image", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fieldId }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) { setError(payload.error ?? "No se pudo quitar la fotografía"); return; }
    onChange("");
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm font-bold text-navy">Fotografía principal</p>

      <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-2xl border border-line bg-paper">
        {shown ? (
          // La vista previa local es un blob: del propio navegador, que
          // next/image no puede optimizar ni servir.
          preview
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={preview} alt="Vista previa de la fotografía" className="size-full object-cover" />
            : <Image src={shown} alt="Fotografía de la cancha" fill sizes="448px" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-center text-muted">
            <div><ImageIcon className="mx-auto text-forest/25" size={40} /><p className="mt-2 text-sm">Todavía no hay fotografía</p></div>
          </div>
        )}
        {loading && <div className="absolute inset-0 grid place-items-center bg-white/70"><LoaderCircle className="animate-spin text-forest" size={28} /></div>}
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ""; }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={loading} onClick={() => input.current?.click()}>
          <Upload size={17} /> {shown ? "Cambiar fotografía" : "Subir fotografía"}
        </Button>
        {shown && !preview && (
          <Button type="button" variant="ghost" disabled={loading} onClick={remove}>
            <Trash2 size={17} /> Quitar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">Elija una foto de su galería. JPG, PNG o WEBP, hasta 5 MB. Se publica de inmediato en la página de su cancha.</p>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
