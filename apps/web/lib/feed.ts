// Compartilhado entre servidor e navegador (não pode ficar num arquivo "use client").
export interface EventoFeed {
  id: string; data_hora: string; tipo_movimento: string; resultado: string; motivo_negativa: string | null; origem: string;
  pessoa: { nome_completo: string } | null; dispositivo: { nome: string } | null;
}
export const SELECT_FEED = "id, data_hora, tipo_movimento, resultado, motivo_negativa, origem, pessoa:pessoa_id(nome_completo), dispositivo:dispositivo_id(nome)";
