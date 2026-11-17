"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";

/** Captura a face pela webcam do PC da portaria e devolve JPEG base64 (sem prefixo), máx. 640 px. */
export function CapturaFace({ onCapturar }: { onCapturar: (base64: string | null) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  async function ligar() {
    setErro("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      setStream(s);
      setFoto(null);
      onCapturar(null);
      if (video.current) video.current.srcObject = s;
    } catch {
      setErro("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
    }
  }

  function capturar() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const escala = Math.min(1, 640 / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * escala);
    c.height = Math.round(v.videoHeight * escala);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.85);
    setFoto(url);
    onCapturar(url.split(",")[1]);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  return (
    <div>
      <div className="relative flex aspect-[4/3] w-full max-w-sm items-center justify-center overflow-hidden rounded-xl bg-navy-900">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="Foto capturada" className="h-full w-full object-cover" />
        ) : (
          <video ref={video} autoPlay playsInline muted className={`h-full w-full -scale-x-100 object-cover ${stream ? "" : "hidden"}`} />
        )}
        {!foto && !stream && <Camera className="h-12 w-12 text-navy-100/60" />}
        {stream && <div className="pointer-events-none absolute inset-[18%] rounded-[50%] border-2 border-dashed border-sac-amarelo/80" />}
      </div>
      <div className="mt-3 flex gap-2">
        {!stream ? (
          <button type="button" onClick={ligar} className="btn-contorno h-10">
            {foto ? <RefreshCw className="h-4 w-4" /> : <Camera className="h-4 w-4" />} {foto ? "Capturar novamente" : "Abrir câmera"}
          </button>
        ) : (
          <button type="button" onClick={capturar} className="btn-primario h-10"><Camera className="h-4 w-4" /> Capturar</button>
        )}
      </div>
      {erro && <p className="msg-erro">{erro}</p>}
      <p className="mt-2 text-xs text-suave">Rosto centralizado, sem óculos escuros ou boné, com boa iluminação.</p>
    </div>
  );
}
