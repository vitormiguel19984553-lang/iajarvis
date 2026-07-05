import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles, Zap, Crown, Building2 } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/planos")({
  component: PlansPage,
  head: () => ({ meta: [{ title: "Planos — J.A.R.V.I.S" }] }),
});

type Tier = {
  id: "free" | "pro" | "ultra" | "enterprise";
  name: string;
  price: string;
  period: string;
  icon: typeof Sparkles;
  accent: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    period: "para sempre",
    icon: Sparkles,
    accent: "#94a3b8",
    features: [
      "50 mensagens / dia",
      "Modelos Gemini Flash e GPT-5 Nano/Mini",
      "Histórico de conversas guardado",
      "Voz e ficheiros básicos",
    ],
    cta: "Plano atual",
  },
  {
    id: "pro",
    name: "Pro",
    price: "€9,99",
    period: "/mês",
    icon: Zap,
    accent: "#3ee6ff",
    highlight: true,
    features: [
      "Mensagens ilimitadas",
      "Todos os modelos Pro (GPT-5, Gemini 3 Pro, Claude, Llama, Grok, DeepSeek...)",
      "Auto Router inteligente",
      "Prompts de sistema avançados",
      "Cérebro generativo com skills",
    ],
    cta: "Tenho uma chave",
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "€24,99",
    period: "/mês",
    icon: Crown,
    accent: "#fbbf24",
    features: [
      "Tudo do Pro",
      "Modelos frontier (GPT-5.5 Pro, Claude Opus, Grok 4)",
      "Geração de imagens (Nano Banana)",
      "Modo voz prioritário",
      "Suporte prioritário",
    ],
    cta: "Tenho uma chave",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Contacto",
    period: "personalizado",
    icon: Building2,
    accent: "#a78bfa",
    features: [
      "Tudo do Ultra",
      "SSO e gestão de equipa",
      "Chaves de ativação em volume",
      "SLA dedicado",
      "Onboarding personalizado",
    ],
    cta: "Falar com vendas",
  },
];

function PlansPage() {
  const { profile } = useAuth();
  const current = profile?.plan_type ?? "free";

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#3ee6ff] mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao chat
        </Link>

        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Escolhe o teu plano</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Ativa Pro ou Ultra com uma chave de ativação no teu perfil.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = current === tier.id;
            return (
              <div
                key={tier.id}
                className="relative rounded-2xl border bg-elevated p-6 flex flex-col"
                style={{
                  borderColor: tier.highlight ? tier.accent : "hsl(var(--border))",
                  boxShadow: tier.highlight
                    ? `0 0 0 1px ${tier.accent}33, 0 10px 40px -10px ${tier.accent}44`
                    : undefined,
                }}
              >
                {tier.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-black"
                    style={{ background: tier.accent }}
                  >
                    Mais popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${tier.accent}22`, color: tier.accent }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">{tier.name}</h2>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    <span className="text-xs text-muted-foreground">{tier.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <Check
                        className="h-4 w-4 mt-0.5 shrink-0"
                        style={{ color: tier.accent }}
                      />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-lg text-sm font-medium text-center border border-border bg-background text-muted-foreground">
                    Plano atual
                  </div>
                ) : tier.id === "enterprise" ? (
                  <a
                    href="mailto:hello@jarvis.app?subject=Plano Enterprise"
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-center border border-border hover:bg-accent transition-colors"
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <Link
                    to="/perfil"
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-center text-white transition-opacity hover:opacity-90"
                    style={{
                      background:
                        tier.id === "ultra"
                          ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                          : "linear-gradient(135deg, #3ee6ff, #7c3aed)",
                    }}
                  >
                    {tier.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Pagamento por cartão chegará em breve. Por agora, ativa qualquer plano com uma chave
          fornecida pelo administrador.
        </p>
      </div>
    </div>
  );
}
