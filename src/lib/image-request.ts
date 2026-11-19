// Calls /api/create-image (SSE stream) and resolves with the final base64 image.
// Streaming keeps the connection alive during long generations, which avoids
// the browser dropping the request and showing a false "network error".
export async function requestImage(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<string> {
  const res = await fetch("/api/create-image", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ctype = res.headers.get("content-type") ?? "";
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    let msg = t;
    try { msg = (JSON.parse(t) as { error?: string }).error ?? t; } catch { /* text */ }
    throw new Error(msg || `Erro ${res.status}`);
  }
  if (ctype.includes("application/json")) {
    const j = (await res.json()) as { b64?: string; error?: string };
    if (!j.b64) throw new Error(j.error ?? "O modelo não devolveu imagem.");
    return j.b64;
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  let last: string | undefined;
  let err: string | undefined;
  const handle = (block: string) => {
    let ev = "";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) ev = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (!data.length) return;
    const raw = data.join("\n");
    if (raw === "[DONE]") return;
    try {
      const p = JSON.parse(raw) as { type?: string; b64_json?: string; error?: { message?: string } };
      if (ev === "error" || p.type === "error") err = p.error?.message ?? "Falha a gerar imagem";
      else if (p.b64_json) last = p.b64_json;
    } catch { /* ignore partial */ }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += value.replace(/\r\n/g, "\n");
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      handle(buf.slice(0, i));
      buf = buf.slice(i + 2);
    }
  }
  if (buf.trim()) handle(buf);
  if (err) throw new Error(err);
  if (!last) throw new Error("O modelo não devolveu imagem.");
  return last;
}
