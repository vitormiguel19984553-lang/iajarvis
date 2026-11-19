import type { PlanTier } from "./models";

export type CreateEngine = "image" | "image-edit" | "tts" | "stt" | "text";

export type CreateCategory =
  | "image"
  | "photo"
  | "design"
  | "video"
  | "audio"
  | "writing"
  | "code"
  | "business"
  | "study";

export const CREATE_CATEGORY_LABEL: Record<CreateCategory, string> = {
  image: "Imagem & Arte",
  photo: "Foto & Edição",
  design: "Design & Marca",
  video: "Vídeo & Motion",
  audio: "Áudio & Voz",
  writing: "Escrita & Conteúdo",
  code: "Código & Dados",
  business: "Negócio & Marketing",
  study: "Estudo & Produtividade",
};

export type CreateField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: string[];
  optional?: boolean;
};

export type CreateTool = {
  id: string;
  label: string;
  description: string;
  category: CreateCategory;
  engine: CreateEngine;
  minPlan: PlanTier;
  /** Extra guidance sent to the model on top of the user's input. */
  instruction: string;
  /** Optional extra inputs beyond the main prompt. */
  fields?: CreateField[];
  /** Label for the main prompt input. */
  promptLabel?: string;
  promptPlaceholder?: string;
  /** Image size hint for image engines. */
  size?: "1024x1024" | "1536x1024" | "1024x1536";
};

const FREE_ENGINE: CreateField = {
  id: "motor",
  label: "Motor de IA",
  type: "select",
  options: ["Automático", "Grátis — Flux", "Grátis — GPT Image", "Grátis — Sana"],
  optional: true,
};

const ASPECT: CreateField = {
  id: "aspect",
  label: "Formato",
  type: "select",
  options: ["Quadrado", "Horizontal", "Vertical"],
};

const TONE: CreateField = {
  id: "tone",
  label: "Tom",
  type: "select",
  options: ["Profissional", "Casual", "Divertido", "Persuasivo", "Técnico", "Inspirador"],
  optional: true,
};

const LANG: CreateField = {
  id: "lang",
  label: "Idioma",
  type: "select",
  options: ["Português (PT)", "Português (BR)", "Inglês", "Espanhol", "Francês", "Alemão"],
  optional: true,
};

const VOICE: CreateField = {
  id: "voice",
  label: "Voz",
  type: "select",
  options: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
};

export const CREATE_TOOLS: CreateTool[] = [
  // ── Imagem & Arte ────────────────────────────────────────────────
  {
    id: "text-to-image",
    label: "Texto → Imagem",
    description: "Gera qualquer imagem a partir de uma descrição.",
    category: "image",
    engine: "image",
    minPlan: "free",
    instruction: "Cria uma imagem de altíssima qualidade, detalhada e coerente.",
    fields: [ASPECT, FREE_ENGINE],
  },
  {
    id: "photoreal",
    label: "Foto Realista",
    description: "Fotografia hiper-realista com luz natural.",
    category: "image",
    engine: "image",
    minPlan: "free",
    instruction:
      "Fotografia hiper-realista, lente 50mm, profundidade de campo natural, luz suave, sem aspeto de ilustração.",
    fields: [ASPECT],
  },
  {
    id: "digital-art",
    label: "Arte Digital",
    description: "Ilustração artística estilizada.",
    category: "image",
    engine: "image",
    minPlan: "free",
    instruction: "Ilustração digital artística, cores ricas, composição dramática, pincelada visível.",
    fields: [ASPECT],
  },
  {
    id: "anime",
    label: "Estilo Anime",
    description: "Ilustração em estilo anime/manga.",
    category: "image",
    engine: "image",
    minPlan: "free",
    instruction: "Estilo anime moderno, linhas limpas, sombreamento cel-shading, cores vibrantes.",
    fields: [ASPECT],
  },
  {
    id: "pixel-art",
    label: "Pixel Art",
    description: "Sprites e cenários em pixel art.",
    category: "image",
    engine: "image",
    minPlan: "free",
    instruction: "Pixel art 16-bit, paleta limitada, grelha de pixels nítida.",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk / Sci-Fi",
    description: "Cenas futuristas com neon.",
    category: "image",
    engine: "image",
    minPlan: "free",
    instruction: "Estética cyberpunk, neon ciano e magenta, chuva, reflexos, atmosfera noturna.",
    fields: [ASPECT],
  },
  {
    id: "concept-art",
    label: "Concept Art",
    description: "Arte conceitual para jogos e filmes.",
    category: "image",
    engine: "image",
    minPlan: "pro",
    instruction: "Concept art cinematográfico, escala épica, iluminação volumétrica, nível de produção AAA.",
    fields: [ASPECT],
  },
  {
    id: "character",
    label: "Design de Personagem",
    description: "Folha de personagem com poses e detalhes.",
    category: "image",
    engine: "image",
    minPlan: "pro",
    instruction:
      "Character design sheet: corpo inteiro, vistas frontal e de perfil, detalhes de vestuário, fundo neutro.",
  },
  {
    id: "3d-render",
    label: "Render 3D",
    description: "Objeto em render 3D limpo.",
    category: "image",
    engine: "image",
    minPlan: "pro",
    instruction: "Render 3D fotorrealista, materiais PBR, iluminação de estúdio, fundo suave.",
  },
  {
    id: "isometric",
    label: "Cena Isométrica",
    description: "Ilustração isométrica detalhada.",
    category: "image",
    engine: "image",
    minPlan: "free",
    instruction: "Ilustração isométrica limpa, perspetiva 45°, cores pastel, detalhe miniatura.",
  },
  {
    id: "watercolor",
    label: "Aquarela",
    description: "Pintura em aquarela suave.",
    category: "image",
    engine: "image",
    minPlan: "free",
    instruction: "Pintura em aquarela, bordas difusas, papel texturado, paleta suave.",
  },
  {
    id: "line-art",
    label: "Line Art",
    description: "Desenho a linha para colorir ou tatuagem.",
    category: "image",
    engine: "image",
    minPlan: "free",
    instruction: "Line art a preto sobre branco, traço uniforme, sem sombreado, sem cor.",
  },

  // ── Foto & Edição ────────────────────────────────────────────────
  {
    id: "remove-bg",
    label: "Remover Fundo",
    description: "Isola o sujeito num fundo branco limpo.",
    category: "photo",
    engine: "image-edit",
    minPlan: "free",
    instruction:
      "Remove completamente o fundo e coloca o sujeito sobre um fundo branco puro e uniforme, mantendo os contornos perfeitos.",
    promptLabel: "Instrução adicional",
    promptPlaceholder: "Mantém o cabelo bem definido",
  },
  {
    id: "replace-bg",
    label: "Substituir Fundo",
    description: "Troca o cenário mantendo o sujeito.",
    category: "photo",
    engine: "image-edit",
    minPlan: "free",
    instruction: "Substitui o fundo pelo cenário pedido, mantendo o sujeito intacto e a luz coerente.",
    promptLabel: "Novo fundo",
    promptPlaceholder: "Praia ao pôr do sol",
  },
  {
    id: "upscale",
    label: "Melhorar Qualidade",
    description: "Aumenta nitidez e detalhe da foto.",
    category: "photo",
    engine: "image-edit",
    minPlan: "free",
    instruction: "Aumenta a nitidez, o detalhe e a definição da imagem sem alterar o conteúdo nem as cores.",
    promptLabel: "Instrução adicional",
    promptPlaceholder: "Reduz o ruído",
  },
  {
    id: "restore-photo",
    label: "Restaurar Foto Antiga",
    description: "Recupera fotografias danificadas.",
    category: "photo",
    engine: "image-edit",
    minPlan: "pro",
    instruction:
      "Restaura a fotografia: remove riscos, manchas e granulado, recupera detalhe e equilibra a exposição.",
    promptLabel: "Instrução adicional",
    promptPlaceholder: "Mantém o aspeto vintage",
  },
  {
    id: "colorize",
    label: "Colorir Preto & Branco",
    description: "Adiciona cor realista a fotos antigas.",
    category: "photo",
    engine: "image-edit",
    minPlan: "pro",
    instruction: "Coloriza a fotografia a preto e branco com cores realistas e tons de pele naturais.",
    promptLabel: "Instrução adicional",
    promptPlaceholder: "Casaco azul escuro",
  },
  {
    id: "style-transfer",
    label: "Transferir Estilo",
    description: "Aplica um estilo artístico à foto.",
    category: "photo",
    engine: "image-edit",
    minPlan: "free",
    instruction: "Reinterpreta a imagem no estilo artístico pedido, preservando a composição.",
    promptLabel: "Estilo",
    promptPlaceholder: "Van Gogh, pinceladas espessas",
  },
  {
    id: "object-remove",
    label: "Remover Objeto",
    description: "Apaga elementos indesejados.",
    category: "photo",
    engine: "image-edit",
    minPlan: "free",
    instruction: "Remove o elemento indicado e reconstrói o fundo de forma invisível.",
    promptLabel: "O que remover",
    promptPlaceholder: "A pessoa do lado direito",
  },
  {
    id: "object-add",
    label: "Adicionar Elemento",
    description: "Insere objetos coerentes na cena.",
    category: "photo",
    engine: "image-edit",
    minPlan: "free",
    instruction: "Adiciona o elemento pedido com perspetiva, escala e iluminação coerentes com a cena.",
    promptLabel: "O que adicionar",
    promptPlaceholder: "Um cão a dormir no sofá",
  },
  {
    id: "expand",
    label: "Expandir Imagem",
    description: "Alarga a cena para além das bordas.",
    category: "photo",
    engine: "image-edit",
    minPlan: "pro",
    instruction: "Expande a cena para além das bordas originais mantendo total continuidade visual.",
    promptLabel: "Direção / conteúdo",
    promptPlaceholder: "Expande para os lados com mais paisagem",
  },
  {
    id: "portrait-retouch",
    label: "Retoque de Retrato",
    description: "Pele natural e luz de estúdio.",
    category: "photo",
    engine: "image-edit",
    minPlan: "pro",
    instruction:
      "Retoque profissional de retrato: pele natural sem plástico, olhos nítidos, luz de estúdio suave.",
    promptLabel: "Instrução adicional",
    promptPlaceholder: "Mantém as sardas",
  },
  {
    id: "product-shot",
    label: "Foto de Produto",
    description: "Transforma a foto num shot de e-commerce.",
    category: "photo",
    engine: "image-edit",
    minPlan: "pro",
    instruction:
      "Transforma numa fotografia de produto de e-commerce: fundo branco limpo, sombra suave, luz de estúdio.",
    promptLabel: "Instrução adicional",
    promptPlaceholder: "Reflexo subtil na base",
  },

  // ── Design & Marca ───────────────────────────────────────────────
  {
    id: "logo",
    label: "Logótipo",
    description: "Marca vetorial simples e memorável.",
    category: "design",
    engine: "image",
    minPlan: "free",
    instruction:
      "Logótipo minimalista vetorial, formas simples e memoráveis, fundo branco, sem texto decorativo extra.",
  },
  {
    id: "icon-set",
    label: "Conjunto de Ícones",
    description: "Ícones consistentes para a app.",
    category: "design",
    engine: "image",
    minPlan: "free",
    instruction: "Grelha de ícones de linha consistentes, traço uniforme, fundo branco.",
  },
  {
    id: "thumbnail",
    label: "Thumbnail YouTube",
    description: "Miniatura chamativa 16:9.",
    category: "design",
    engine: "image",
    minPlan: "free",
    instruction:
      "Thumbnail de YouTube 16:9, contraste altíssimo, expressão forte, espaço para título curto legível.",
    size: "1536x1024",
  },
  {
    id: "social-post",
    label: "Post para Redes Sociais",
    description: "Criativo pronto a publicar.",
    category: "design",
    engine: "image",
    minPlan: "free",
    instruction: "Criativo para redes sociais, composição limpa, hierarquia visual clara, cores de marca fortes.",
    fields: [ASPECT],
  },
  {
    id: "poster",
    label: "Cartaz / Poster",
    description: "Cartaz de evento com impacto.",
    category: "design",
    engine: "image",
    minPlan: "free",
    instruction: "Cartaz gráfico com composição tipográfica forte e hierarquia clara.",
    size: "1024x1536",
  },
  {
    id: "banner",
    label: "Banner Web",
    description: "Banner horizontal para o site.",
    category: "design",
    engine: "image",
    minPlan: "free",
    instruction: "Banner web horizontal, espaço negativo à esquerda para texto, visual moderno.",
    size: "1536x1024",
  },
  {
    id: "mockup",
    label: "Mockup de Produto",
    description: "Produto aplicado em contexto real.",
    category: "design",
    engine: "image",
    minPlan: "pro",
    instruction: "Mockup fotorrealista do produto em contexto, luz de estúdio, perspetiva ligeira.",
  },
  {
    id: "pattern",
    label: "Padrão Repetível",
    description: "Textura seamless para fundos.",
    category: "design",
    engine: "image",
    minPlan: "free",
    instruction: "Padrão seamless perfeitamente repetível, sem costuras visíveis nas bordas.",
  },
  {
    id: "brand-kit",
    label: "Manual de Marca",
    description: "Paleta, tipografia e tom de voz.",
    category: "design",
    engine: "text",
    minPlan: "pro",
    instruction:
      "Cria um mini manual de marca em markdown: posicionamento, personalidade, paleta de cores com HEX, pares tipográficos, tom de voz, do's & don'ts.",
    fields: [TONE],
  },
  {
    id: "ui-copy",
    label: "Copy de Interface",
    description: "Microcópia para botões e estados.",
    category: "design",
    engine: "text",
    minPlan: "free",
    instruction:
      "Escreve microcópia de UI: títulos, subtítulos, botões, estados vazios e mensagens de erro. Curto e claro, em tabela markdown.",
    fields: [TONE, LANG],
  },

  // ── Vídeo & Motion ───────────────────────────────────────────────
  {
    id: "storyboard",
    label: "Storyboard",
    description: "Painéis de cena para vídeo.",
    category: "video",
    engine: "image",
    minPlan: "pro",
    instruction: "Storyboard em grelha de painéis, desenho a linha, indicações de câmara e ação por painel.",
    size: "1536x1024",
  },
  {
    id: "video-script",
    label: "Guião de Vídeo",
    description: "Guião com tempos e planos.",
    category: "video",
    engine: "text",
    minPlan: "free",
    instruction:
      "Escreve um guião de vídeo com marcas de tempo, descrição de plano, narração e texto no ecrã. Formato tabela markdown.",
    fields: [TONE, LANG],
  },
  {
    id: "shorts-hook",
    label: "Hooks para Shorts",
    description: "10 aberturas que prendem em 3s.",
    category: "video",
    engine: "text",
    minPlan: "free",
    instruction:
      "Gera 10 hooks de 3 segundos para vídeo curto (TikTok/Reels/Shorts), cada um com uma razão de porque funciona.",
    fields: [LANG],
  },
  {
    id: "video-frame",
    label: "Frame Cinematográfico",
    description: "Still de filme para referência.",
    category: "video",
    engine: "image",
    minPlan: "pro",
    instruction: "Still cinematográfico anamórfico, grão de filme, gradação de cor de cinema, 2.39:1.",
    size: "1536x1024",
  },
  {
    id: "subtitles",
    label: "Legendas de Áudio",
    description: "Transcreve áudio para legendas.",
    category: "video",
    engine: "stt",
    minPlan: "free",
    instruction: "Transcreve o áudio com pontuação correta.",
  },

  // ── Áudio & Voz ──────────────────────────────────────────────────
  {
    id: "tts-narration",
    label: "Narração (Texto → Voz)",
    description: "Locução natural do teu texto.",
    category: "audio",
    engine: "tts",
    minPlan: "free",
    instruction: "Lê com clareza e ritmo natural de narração profissional.",
    fields: [VOICE],
  },
  {
    id: "tts-podcast",
    label: "Voz de Podcast",
    description: "Tom conversacional e caloroso.",
    category: "audio",
    engine: "tts",
    minPlan: "free",
    instruction: "Lê em tom conversacional, caloroso e próximo, como num podcast.",
    fields: [VOICE],
  },
  {
    id: "tts-ad",
    label: "Voz de Anúncio",
    description: "Locução energética para publicidade.",
    category: "audio",
    engine: "tts",
    minPlan: "pro",
    instruction: "Lê com energia e entusiasmo de locutor publicitário, ritmo rápido e final marcado.",
    fields: [VOICE],
  },
  {
    id: "tts-audiobook",
    label: "Audiolivro",
    description: "Leitura pausada para textos longos.",
    category: "audio",
    engine: "tts",
    minPlan: "pro",
    instruction: "Lê de forma pausada, expressiva e constante, como um audiolivro.",
    fields: [VOICE],
  },
  {
    id: "transcribe",
    label: "Transcrever Áudio",
    description: "Áudio → texto com pontuação.",
    category: "audio",
    engine: "stt",
    minPlan: "free",
    instruction: "Transcreve fielmente o áudio.",
  },
  {
    id: "meeting-notes",
    label: "Ata de Reunião",
    description: "Resumo e ações a partir do áudio.",
    category: "audio",
    engine: "stt",
    minPlan: "pro",
    instruction: "Transcreve o áudio da reunião.",
  },
  {
    id: "lyrics",
    label: "Letra de Música",
    description: "Versos, refrão e estrutura.",
    category: "audio",
    engine: "text",
    minPlan: "free",
    instruction:
      "Escreve uma letra de música completa com estrutura marcada (Verso, Pré-refrão, Refrão, Ponte) e sugestão de andamento.",
    fields: [TONE, LANG],
  },

  // ── Escrita & Conteúdo ───────────────────────────────────────────
  {
    id: "blog-post",
    label: "Artigo de Blog",
    description: "Artigo otimizado para SEO.",
    category: "writing",
    engine: "text",
    minPlan: "free",
    instruction:
      "Escreve um artigo de blog em markdown, com H1 único, subtítulos, parágrafos curtos, meta-descrição no fim e palavras-chave naturais.",
    fields: [TONE, LANG],
  },
  {
    id: "email",
    label: "Email Profissional",
    description: "Email claro e com ação clara.",
    category: "writing",
    engine: "text",
    minPlan: "free",
    instruction: "Escreve um email profissional com assunto, corpo curto e call-to-action claro.",
    fields: [TONE, LANG],
  },
  {
    id: "social-copy",
    label: "Legendas para Redes",
    description: "5 variações + hashtags.",
    category: "writing",
    engine: "text",
    minPlan: "free",
    instruction: "Gera 5 variações de legenda para redes sociais, cada uma com hashtags relevantes.",
    fields: [TONE, LANG],
  },
  {
    id: "rewrite",
    label: "Reescrever Texto",
    description: "Melhora clareza e fluidez.",
    category: "writing",
    engine: "text",
    minPlan: "free",
    instruction:
      "Reescreve o texto melhorando clareza, ritmo e correção, mantendo o significado. Devolve só o texto final.",
    fields: [TONE, LANG],
    promptLabel: "Texto a reescrever",
  },
  {
    id: "summarize",
    label: "Resumir",
    description: "Resumo executivo em bullets.",
    category: "writing",
    engine: "text",
    minPlan: "free",
    instruction: "Resume em bullets curtos, terminando com uma conclusão de uma frase.",
    promptLabel: "Texto a resumir",
  },
  {
    id: "translate",
    label: "Traduzir",
    description: "Tradução natural, não literal.",
    category: "writing",
    engine: "text",
    minPlan: "free",
    instruction: "Traduz de forma natural e idiomática para o idioma escolhido. Devolve apenas a tradução.",
    fields: [LANG],
    promptLabel: "Texto a traduzir",
  },
  {
    id: "story",
    label: "História / Conto",
    description: "Narrativa com início, meio e fim.",
    category: "writing",
    engine: "text",
    minPlan: "free",
    instruction: "Escreve um conto envolvente com arco narrativo completo e diálogo natural.",
    fields: [TONE, LANG],
  },
  {
    id: "seo-keywords",
    label: "Pesquisa de Palavras-chave",
    description: "Clusters de keywords e intenção.",
    category: "writing",
    engine: "text",
    minPlan: "pro",
    instruction:
      "Gera clusters de palavras-chave em tabela markdown: keyword, intenção de busca, dificuldade estimada e título sugerido.",
    fields: [LANG],
  },

  // ── Código & Dados ───────────────────────────────────────────────
  {
    id: "code-gen",
    label: "Gerar Código",
    description: "Código pronto a usar e comentado.",
    category: "code",
    engine: "text",
    minPlan: "free",
    instruction: "Escreve código correto, idiomático e comentado. Explica brevemente as decisões no fim.",
  },
  {
    id: "code-explain",
    label: "Explicar Código",
    description: "Passo a passo do que o código faz.",
    category: "code",
    engine: "text",
    minPlan: "free",
    instruction: "Explica o código linha a linha em linguagem simples e aponta riscos.",
    promptLabel: "Código",
  },
  {
    id: "code-debug",
    label: "Encontrar Bugs",
    description: "Diagnóstico e correção.",
    category: "code",
    engine: "text",
    minPlan: "free",
    instruction:
      "Encontra bugs no código, explica a causa raiz e apresenta a versão corrigida num bloco de código.",
    promptLabel: "Código com problema",
  },
  {
    id: "regex",
    label: "Gerar Regex",
    description: "Expressão regular explicada.",
    category: "code",
    engine: "text",
    minPlan: "free",
    instruction: "Cria a expressão regular pedida, explica cada parte e dá exemplos que passam e que falham.",
  },
  {
    id: "sql",
    label: "Consulta SQL",
    description: "Query otimizada e explicada.",
    category: "code",
    engine: "text",
    minPlan: "free",
    instruction: "Escreve a consulta SQL pedida, formatada, com explicação e notas de performance.",
  },
  {
    id: "data-analysis",
    label: "Analisar Dados",
    description: "Insights a partir dos teus dados.",
    category: "code",
    engine: "text",
    minPlan: "pro",
    instruction:
      "Analisa os dados fornecidos: tendências, anomalias, 3 insights acionáveis e próximos passos sugeridos.",
    promptLabel: "Dados (CSV, JSON ou descrição)",
  },
  {
    id: "api-docs",
    label: "Documentar API",
    description: "Documentação clara de endpoints.",
    category: "code",
    engine: "text",
    minPlan: "pro",
    instruction:
      "Gera documentação de API em markdown: endpoint, método, parâmetros, exemplo de pedido e resposta, erros.",
  },

  // ── Negócio & Marketing ──────────────────────────────────────────
  {
    id: "business-plan",
    label: "Plano de Negócio",
    description: "Estrutura completa e realista.",
    category: "business",
    engine: "text",
    minPlan: "pro",
    instruction:
      "Cria um plano de negócio em markdown: problema, solução, mercado, modelo de receita, concorrência, go-to-market, riscos e marcos.",
    fields: [TONE],
  },
  {
    id: "pitch-deck",
    label: "Pitch Deck",
    description: "Slide a slide para investidores.",
    category: "business",
    engine: "text",
    minPlan: "pro",
    instruction:
      "Escreve um pitch deck slide a slide (título + bullets + nota do orador) para investidores, 10 a 12 slides.",
    fields: [TONE],
  },
  {
    id: "ad-copy",
    label: "Anúncios que Convertem",
    description: "Variações para Meta e Google.",
    category: "business",
    engine: "text",
    minPlan: "free",
    instruction:
      "Cria 5 variações de anúncio (headline, corpo, CTA) para Meta e Google Ads, com ângulo psicológico indicado.",
    fields: [TONE, LANG],
  },
  {
    id: "landing-copy",
    label: "Copy de Landing Page",
    description: "Secções completas e persuasivas.",
    category: "business",
    engine: "text",
    minPlan: "free",
    instruction:
      "Escreve copy de landing page completa: hero, benefícios, prova social, objeções, FAQ e CTA final.",
    fields: [TONE, LANG],
  },
  {
    id: "product-desc",
    label: "Descrição de Produto",
    description: "Ficha de produto vendedora.",
    category: "business",
    engine: "text",
    minPlan: "free",
    instruction:
      "Escreve uma descrição de produto: gancho, benefícios em bullets, especificações e frase de fecho.",
    fields: [TONE, LANG],
  },
  {
    id: "brand-names",
    label: "Nomes de Marca",
    description: "20 nomes com domínio sugerido.",
    category: "business",
    engine: "text",
    minPlan: "free",
    instruction:
      "Sugere 20 nomes de marca em tabela: nome, significado, domínio .com sugerido e nota de disponibilidade provável.",
  },
  {
    id: "swot",
    label: "Análise SWOT",
    description: "Forças, fraquezas, oportunidades.",
    category: "business",
    engine: "text",
    minPlan: "free",
    instruction: "Faz uma análise SWOT em quatro secções, cada uma com 4 a 6 pontos concretos.",
  },
  {
    id: "persona",
    label: "Persona de Cliente",
    description: "Perfil detalhado do cliente ideal.",
    category: "business",
    engine: "text",
    minPlan: "free",
    instruction:
      "Cria 2 personas detalhadas: dados demográficos, objetivos, dores, objeções, canais e mensagem que ressoa.",
  },

  // ── Estudo & Produtividade ───────────────────────────────────────
  {
    id: "study-plan",
    label: "Plano de Estudo",
    description: "Cronograma realista por semanas.",
    category: "study",
    engine: "text",
    minPlan: "free",
    instruction:
      "Cria um plano de estudo semanal em tabela markdown, com objetivos por semana, recursos e forma de avaliação.",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Perguntas e respostas para memorizar.",
    category: "study",
    engine: "text",
    minPlan: "free",
    instruction: "Gera 20 flashcards em tabela markdown com colunas Pergunta e Resposta, curtas e precisas.",
  },
  {
    id: "quiz",
    label: "Quiz de Avaliação",
    description: "Perguntas com respostas e explicação.",
    category: "study",
    engine: "text",
    minPlan: "free",
    instruction:
      "Cria um quiz de 10 perguntas de escolha múltipla com 4 opções, resposta correta e explicação no fim.",
  },
  {
    id: "explain-simple",
    label: "Explica-me Simples",
    description: "Qualquer tema como se tivesses 12 anos.",
    category: "study",
    engine: "text",
    minPlan: "free",
    instruction:
      "Explica o tema como se falasses com alguém de 12 anos: analogia central, 3 pontos-chave e um exemplo do dia-a-dia.",
  },
  {
    id: "mindmap",
    label: "Mapa Mental",
    description: "Estrutura hierárquica do tema.",
    category: "study",
    engine: "text",
    minPlan: "free",
    instruction: "Cria um mapa mental em lista hierárquica markdown, até 3 níveis de profundidade.",
  },
  {
    id: "cv",
    label: "Currículo / CV",
    description: "CV moderno orientado a resultados.",
    category: "study",
    engine: "text",
    minPlan: "free",
    instruction:
      "Escreve um CV moderno em markdown, com resumo, experiência orientada a resultados quantificados e competências.",
    fields: [LANG],
  },
  {
    id: "cover-letter",
    label: "Carta de Motivação",
    description: "Carta personalizada e direta.",
    category: "study",
    engine: "text",
    minPlan: "free",
    instruction: "Escreve uma carta de motivação personalizada, específica e sem clichés, com no máximo 4 parágrafos.",
    fields: [TONE, LANG],
  },
  {
    id: "checklist",
    label: "Checklist / Processo",
    description: "Passos acionáveis e ordenados.",
    category: "study",
    engine: "text",
    minPlan: "free",
    instruction: "Cria uma checklist acionável, ordenada, com critério de conclusão para cada passo.",
  },
];

export function getCreateTool(id: string): CreateTool | undefined {
  return CREATE_TOOLS.find((t) => t.id === id);
}

export const PLAN_RANK_CREATE: Record<PlanTier, number> = { free: 0, pro: 1, ultra: 2 };

export function canUseTool(plan: PlanTier | "enterprise", toolId: string): boolean {
  const tool = getCreateTool(toolId);
  if (!tool) return false;
  const p: PlanTier = plan === "enterprise" ? "ultra" : plan;
  return PLAN_RANK_CREATE[p] >= PLAN_RANK_CREATE[tool.minPlan];
}

export const CREATE_CATEGORIES = Object.keys(CREATE_CATEGORY_LABEL) as CreateCategory[];
