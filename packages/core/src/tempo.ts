export const FUSO = "America/Sao_Paulo";

/** Diferença (ms) entre o relógio de SP e UTC no instante `d`. */
function offsetSP(d: Date): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  const comoUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return comoUTC - Math.floor(d.getTime() / 1000) * 1000;
}

/** Data (yyyy, mm, dd) em São Paulo. */
export function dataSP(d: Date): { ano: number; mes: number; dia: number } {
  const local = new Date(d.getTime() + offsetSP(d));
  return { ano: local.getUTCFullYear(), mes: local.getUTCMonth() + 1, dia: local.getUTCDate() };
}

/** Instante UTC que corresponde a 23:59:59.999 do dia (em SP) de `ref`. */
export function fimDoDiaSP(ref: Date): Date {
  const { ano, mes, dia } = dataSP(ref);
  const alvoLocal = Date.UTC(ano, mes - 1, dia, 23, 59, 59, 999);
  return new Date(alvoLocal - offsetSP(new Date(alvoLocal)));
}

/** Instante UTC de 00:00 do dia (em SP) de `ref`. */
export function inicioDoDiaSP(ref: Date): Date {
  const { ano, mes, dia } = dataSP(ref);
  const alvoLocal = Date.UTC(ano, mes - 1, dia, 0, 0, 0, 0);
  return new Date(alvoLocal - offsetSP(new Date(alvoLocal)));
}

export function formatarDataHora(d: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "medium" }).format(new Date(d));
}
