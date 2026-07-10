import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, LogOut, KeyRound, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
  head: () => ({ meta: [{ title: "Perfil — J.A.R.V.I.S" }] }),
});

function formatExpiry(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function PerfilPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyCode, setKeyCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPreferredName(profile.preferred_name ?? "");
    }
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, preferred_name: preferredName })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = keyCode.trim();
    if (!code) return;
    setRedeeming(true);
    const { data, error } = await supabase.rpc("redeem_activation_key", { _code: code });
    setRedeeming(false);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean; error?: string; plan_type?: string; expires_at?: string };
    if (!res?.ok) {
      const map: Record<string, string> = {
        invalid_key: "Chave inválida",
        already_used: "Esta chave já foi utilizada",
        revoked: "Esta chave foi revogada",
        not_authenticated: "Sessão expirada",
      };
      return toast.error(map[res?.error ?? ""] ?? "Não foi possível ativar");
    }
    setKeyCode("");
    await refreshProfile();
    toast.success(`Plano ${res.plan_type?.toUpperCase()} ativado!`, {
      description: `Válido até ${formatExpiry(res.expires_at)}`,
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">A carregar…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Link to="/chat" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[color:var(--accent-cyan)] mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar ao chat
        </Link>

        <div className="rounded-2xl border border-border bg-elevated p-8">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-[20px] font-bold"
              style={{ background: "linear-gradient(135deg, #3ee6ff, #7c3aed)" }}
            >
              {(profile?.preferred_name ?? "J").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{profile?.preferred_name ?? "Perfil"}</h1>
              <p className="text-[12px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="text-[12px] text-muted-foreground">Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-[color:var(--accent-cyan)]"
              />
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground">Apelido (como a IA o chama)</label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-[color:var(--accent-cyan)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg bg-background border border-border p-3">
                <div className="text-[11px] text-muted-foreground uppercase">Plano</div>
                <div className="text-sm font-semibold text-[color:var(--accent-cyan)] mt-1">{profile?.plan_type ?? "free"}</div>
              </div>
              <div className="rounded-lg bg-background border border-border p-3">
                <div className="text-[11px] text-muted-foreground uppercase">Mensagens hoje</div>
                <div className="text-sm font-semibold mt-1">{profile?.messages_today ?? 0}</div>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #3ee6ff, #7c3aed)" }}
            >
              {busy ? "..." : "Guardar"}
            </button>
          </form>
        </div>

        {/* Plano atual + redeem */}
        <div className="rounded-2xl border border-border bg-elevated p-6 mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[color:var(--accent-cyan)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Plano</h2>
            </div>
            <Link
              to="/planos"
              className="text-[12px] text-[color:var(--accent-cyan)] hover:underline"
            >
              Ver planos →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-lg bg-background border border-border p-3">
              <div className="text-[11px] text-muted-foreground uppercase">Plano atual</div>
              <div className="text-base font-bold text-[color:var(--accent-cyan)] mt-1 uppercase">
                {profile?.plan_type ?? "free"}
              </div>
            </div>
            <div className="rounded-lg bg-background border border-border p-3">
              <div className="text-[11px] text-muted-foreground uppercase">Expira em</div>
              <div className="text-sm font-semibold mt-1">{formatExpiry(profile?.plan_expires_at)}</div>
            </div>
          </div>

          <form onSubmit={redeem} className="space-y-2">
            <label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Chave de ativação
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyCode}
                onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-sm font-mono tracking-wider focus:outline-none focus:border-[color:var(--accent-cyan)]"
              />
              <button
                type="submit"
                disabled={redeeming || !keyCode.trim()}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #3ee6ff, #7c3aed)" }}
              >
                {redeeming ? "..." : "Ativar"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-elevated p-6 mt-4">
          <button
            onClick={logout}
            className="w-full py-2.5 rounded-lg text-sm font-medium border border-border bg-background hover:bg-accent flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Terminar sessão
          </button>
        </div>
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
