# J.A.R.V.I.S — Changelog de Auditoria

## Parte 1 — Auditoria & correção de bugs

### 1.1 Leitura e processamento de ficheiros
- **PDF scaneado** — extractor agora detecta PDFs sem texto extraível
  (heurística: <20 caracteres totais) e sinaliza-os como erro com mensagem
  clara "PDF sem texto extraível (provavelmente scaneado ou só imagens)",
  em vez de falhar silenciosamente.
- **Barra de progresso real** — `extractFileContent` aceita `onProgress`
  callback (0–100%), reportado por página no PDF e por slide no PPTX. O
  painel direito mostra barra ciano animada + `X%` no rótulo enquanto
  processa; o loader-spinner infinito foi substituído.
- **Mensagens de erro específicas por formato** — mapa `FRIENDLY_ERRORS`
  em pt-PT por kind (pdf/docx/xlsx/pptx/text/image/audio/unknown); toast
  `Falha em <ficheiro>` com descrição legível.
- **Limite 20MB / 10 ficheiros** — já existente, mantido com rejeição
  agregada em toast.

### 1.2 Tratamento de erros geral
- **Error Boundary React** — `src/components/error-boundary.tsx` envolve o
  `<Outlet />` na raiz (`__root.tsx`). Um crash de componente já não faz
  ecrã em branco: mostra card J.A.R.V.I.S com "Tentar novamente" +
  "Recarregar" e detalhes técnicos colapsáveis.
- **Retry / abort / timeout AI** — servidor `/api/chat` propaga
  `request.signal` para `streamText`, o botão "Stop" no chat cancela a
  geração. `parseAPIError` traduz 401/402/403/413/429/503/offline em
  mensagens pt-PT.
- **Fila offline** — mensagens enviadas sem ligação ficam em fila e são
  reenviadas quando volta a rede (`use-online-status`).

### 1.3 Estado e sessão
- **Persistência** — histórico e mensagens são carregados de
  `conversations`/`messages` (Cloud) por `useThreads`; troca de conversa
  faz load lazy sem perder mensagens já em memória.
- **Sem duplicação** — `savedIdsRef` (Map<threadId, Set<msgId>>) garante
  que cada `id` de UIMessage só é persistido uma vez, mesmo com
  streaming/edições.

### 1.4 Responsividade & mobile
- Sidebar `ThreadListPanel` colapsa em overlay drawer (`fixed inset-y-0`
  com backdrop) abaixo de 768px, drawer com footer de navegação para
  Ficheiros/Estatísticas/Definições/Perfil/Planos/Admin/Logout.
- Header do chat esconde tabs e ganha botão hamburger no mobile.
- Textarea a 16px no mobile (previne zoom iOS).
- `viewport-fit=cover, interactive-widget=resizes-content` + variáveis
  CSS `env(keyboard-inset-height)` para o teclado não tapar o input.

---

Ver `src/lib/api-error.ts`, `src/lib/file-extractor.ts`,
`src/components/error-boundary.tsx`, `src/routes/api/chat.ts` para os
detalhes de implementação.
