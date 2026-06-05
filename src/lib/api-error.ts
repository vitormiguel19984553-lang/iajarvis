// Friendly mapping of API/network errors to user-facing messages (pt-PT).
export function parseAPIError(err: unknown): { title: string; description?: string } {
  const e = err as { name?: string; message?: string } | null;
  if (e?.name === "AbortError") return { title: "⏹ Geração interrompida" };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { title: "⚠ Sem ligação à internet" };
  }
  const msg = (e?.message ?? String(err ?? "")).toLowerCase();

  if (msg.includes("daily_limit_reached"))
    return {
      title: "Limite diário atingido",
      description: "Plano Free: 50 mensagens/dia. Faz upgrade ou ativa uma chave.",
    };
  if (msg.includes("429") || msg.includes("rate_limit"))
    return { title: "⏳ Demasiados pedidos", description: "Aguarda alguns segundos e tenta de novo." };
  if (msg.includes("402") || msg.includes("credits"))
    return { title: "Créditos esgotados", description: "Adiciona créditos no workspace." };
  if (msg.includes("401") || msg.includes("unauthorized"))
    return { title: "🔑 Sessão expirada", description: "Faz login novamente." };
  if (msg.includes("403") || msg.includes("suspended"))
    return { title: "🚫 Conta suspensa", description: "Contacta o suporte." };
  if (msg.includes("413") || msg.includes("too long") || msg.includes("context_length"))
    return { title: "📏 Conversa demasiado longa", description: "Inicia uma nova conversa." };
  if (msg.includes("503") || msg.includes("overloaded") || msg.includes("unavailable"))
    return { title: "🔄 Servidor ocupado", description: "Tenta novamente em instantes." };
  if (msg.includes("content_filter") || msg.includes("safety") || msg.includes("moderation"))
    return { title: "🛡 Conteúdo bloqueado", description: "Reformula o pedido." };
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return { title: "📡 Erro de rede", description: "Verifica a tua ligação." };

  return {
    title: "Erro na resposta",
    description: (e?.message ?? "Erro desconhecido").slice(0, 200),
  };
}
