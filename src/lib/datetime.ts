const SP_TZ = "America/Sao_Paulo";

/** Formata uma data (ISO ou Date) no fuso de São Paulo: DD/MM/AAAA, HH:MM. */
export function formatSaoPaulo(value: string | Date): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: SP_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return typeof value === "string" ? value : value.toISOString();
  }
}
