export function normalizarPlaca(v: string): string {
  return (v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Padrão antigo (ABC1234) e Mercosul (ABC1D23). */
export function placaValida(v: string): boolean {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(v));
}
