import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Nova senha — J.A.R.V.I.S" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    navigate({ to: "/chat", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-elevated p-8 shadow-2xl space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">Definir nova senha</h1>
        <input
          type="password"
          placeholder="Nova senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-[#3ee6ff]"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #3ee6ff, #7c3aed)" }}
        >
          {busy ? "..." : "Atualizar senha"}
        </button>
      </form>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
