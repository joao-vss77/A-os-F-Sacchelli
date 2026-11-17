export function normalizarCpf(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

export function cpfValido(v: string): boolean {
  const c = normalizarCpf(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export function formatarCpf(v: string): string {
  const c = normalizarCpf(v);
  if (c.length !== 11) return v;
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
}

/** Mostra só os 3 primeiros e 2 últimos dígitos (LGPD em listagens). */
export function mascararCpf(v: string): string {
  const c = normalizarCpf(v);
  if (c.length !== 11) return v;
  return `${c.slice(0, 3)}.***.***-${c.slice(9)}`;
}
