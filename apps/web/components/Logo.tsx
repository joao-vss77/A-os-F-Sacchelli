// Recriação do logo Aços F Sacchelli a partir da interface de referência.
// PENDENTE: substituir pelo arquivo oficial (public/logo-sacchelli.svg) quando disponível.
export function Simbolo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 64" className={className} role="img" aria-label="Símbolo Sacchelli">
      <circle cx="32" cy="32" r="30" fill="#0B3D91" />
      <path d="M52 4h30l18 28-18 28H52l18-28z" fill="#F2C200" />
      <path d="M86 4h30l18 28-18 28H86l18-28z" fill="#1F9D55" />
    </svg>
  );
}

export function Logo({ claro = false, compacto = false }: { claro?: boolean; compacto?: boolean }) {
  const cor = claro ? "#FFFFFF" : "#0B2A5B";
  return (
    <div className="flex items-center gap-3">
      <Simbolo className={compacto ? "h-8 w-auto" : "h-11 w-auto"} />
      <div className="leading-none">
        <div className="font-marca text-[26px] font-extrabold tracking-tight" style={{ color: cor }}>
          SACCHELLI
        </div>
        {!compacto && (
          <div className="mt-1 text-[10.5px] font-semibold tracking-[0.32em]" style={{ color: cor }}>
            QUALIDADE DE AÇO
          </div>
        )}
      </div>
    </div>
  );
}
