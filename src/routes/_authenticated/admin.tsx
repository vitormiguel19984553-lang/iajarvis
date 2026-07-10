import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, KeyRound, Copy, Ban, Users, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — J.A.R.V.I.S" }] }),
});

type Plan = "pro" | "ultra";

type Key = {
  id: string;
  key_code: string;
  plan_type: Plan;
  duration_days: number;
  notes: string | null;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
  is_revoked: boolean;
};

type ProfileRow = {
  id: string;
  email: string | null;
  preferred_name: string | null;
  plan_type: string;
  plan_expires_at: string | null;
  is_suspended: boolean;
  messages_today: number;
};

function genCode(): string {
  const part = () =>
    Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "X");
  return `JRV-${part()}-${part()}-${part()}`;
}

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const [keys, setKeys] = useState<Key[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [plan, setPlan] = useState<Plan>("pro");
  const [days, setDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"keys" | "users">("keys");

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Acesso negado");
      navigate({ to: "/chat", replace: true });
    }
  }, [loading, isAdmin, navigate]);

  const load = useCallback(async () => {
    const [{ data: k }, { data: p }] = await Promise.all([
      supabase
        .from("activation_keys")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("profiles")
        .select("id,email,preferred_name,plan_type,plan_expires_at,is_suspended,messages_today")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setKeys((k ?? []) as Key[]);
    setProfiles((p ?? []) as ProfileRow[]);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const generate = async () => {
    setBusy(true);
    try {
      const rows = Array.from({ length: count }).map(() => ({
        key_code: genCode(),
        plan_type: plan,
        duration_days: days,
        notes: notes || null,
      }));
      const { error } = await supabase.from("activation_keys").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} chave(s) geradas`);
      setNotes("");
      load();
    } catch (e) {
      toast.error("Erro ao gerar chaves", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string, revoke: boolean) => {
    const { error } = await supabase
      .from("activation_keys")
      .update({ is_revoked: revoke })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(revoke ? "Chave revogada" : "Chave reativada");
    load();
  };

  const copyKey = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copiado", { description: code });
  };

  const toggleSuspend = async (id: string, suspend: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: suspend })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(suspend ? "Utilizador suspenso" : "Utilizador reativado");
    load();
  };

  const changePlan = async (id: string, newPlan: string) => {
    const expires =
      newPlan === "free"
        ? null
        : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ plan_type: newPlan as "free" | "pro" | "ultra" | "enterprise", plan_expires_at: expires })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    load();
  };

  if (loading || !isAdmin) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-muted-foreground">
        A verificar permissões…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full text-foreground overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
        style={{ background: "var(--gradient-halo)" }}
      />
      <header className="glass-panel border-0 border-b border-[color:var(--sidebar-border)] px-6 py-4 flex items-center justify-between rounded-none">

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/chat" })}
            className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted/40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Shield className="h-5 w-5 text-[color:var(--accent-cyan)]" />
          <h1 className="text-lg font-semibold tracking-tight">Admin · J.A.R.V.I.S</h1>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={tab === "keys" ? "default" : "ghost"}
            onClick={() => setTab("keys")}
          >
            <KeyRound className="h-4 w-4 mr-2" /> Chaves
          </Button>
          <Button
            size="sm"
            variant={tab === "users" ? "default" : "ghost"}
            onClick={() => setTab("users")}
          >
            <Users className="h-4 w-4 mr-2" /> Utilizadores
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {tab === "keys" && (
          <>
            <section className="glass-panel hud-border rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[color:var(--accent-cyan)]" /> Gerar chaves
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Plano</Label>
                  <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pro">PRO</SelectItem>
                      <SelectItem value="ultra">ULTRA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Duração (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value) || 30)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Notas (opcional)</Label>
                  <Input
                    placeholder="Campanha, cliente, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={generate} disabled={busy}>
                  {busy ? "A gerar…" : "Gerar chaves"}
                </Button>
              </div>
            </section>

            <section className="glass-panel hud-border rounded-xl">
              <div className="px-5 py-3 border-b border-border/60 text-sm font-semibold">
                Chaves geradas ({keys.length})
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((k) => {
                      const used = !!k.used_by;
                      return (
                        <TableRow key={k.id}>
                          <TableCell className="font-mono text-xs">{k.key_code}</TableCell>
                          <TableCell className="uppercase text-xs">{k.plan_type}</TableCell>
                          <TableCell>{k.duration_days}</TableCell>
                          <TableCell className="text-xs">
                            {k.is_revoked
                              ? <span className="text-destructive">revogada</span>
                              : used
                                ? <span className="text-muted-foreground">usada</span>
                                : <span className="text-[color:var(--accent-cyan)]">disponível</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{k.notes ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => copyKey(k.key_code)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              {!used && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => revoke(k.id, !k.is_revoked)}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {keys.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma chave gerada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}

        {tab === "users" && (
          <section className="glass-panel hud-border rounded-xl">
            <div className="px-5 py-3 border-b border-border/60 text-sm font-semibold">
              Utilizadores ({profiles.length})
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Msgs/dia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{p.email}</TableCell>
                      <TableCell className="text-xs">{p.preferred_name ?? "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={p.plan_type}
                          onValueChange={(v) => changePlan(p.id, v)}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">free</SelectItem>
                            <SelectItem value="pro">pro</SelectItem>
                            <SelectItem value="ultra">ultra</SelectItem>
                            <SelectItem value="enterprise">enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.plan_expires_at ? new Date(p.plan_expires_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{p.messages_today}</TableCell>
                      <TableCell className="text-xs">
                        {p.is_suspended
                          ? <span className="text-destructive">suspenso</span>
                          : <span className="text-[color:var(--accent-cyan)]">ativo</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleSuspend(p.id, !p.is_suspended)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {profiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Sem utilizadores
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        )}
      </main>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
