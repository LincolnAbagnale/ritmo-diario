import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRitmo } from "@/features/ritmo/store";
import { signIn, signUp } from "@/lib/members.functions";

export function AuthScreen() {
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { setSession } = useRitmo();

  const submit = async () => {
    setBusy(true);
    setMessage("");
    try {
      const credentials = { email: email.trim(), password };
      const result = mode === "criar" ? await signUp({ data: credentials }) : await signIn({ data: credentials });
      if ("error" in result) setMessage(result.error);
      else setSession(result);
    } catch {
      setMessage("Confira o e-mail e a senha (mínimo de 6 caracteres) e tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-10 text-foreground">
      <div className="w-full max-w-sm rounded-[24px] border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Check className="size-5 stroke-[3]" />
          </span>
          <h1 className="text-xl font-semibold">Ritmo</h1>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Entre para salvar seus hábitos na nuvem e acessá-los de qualquer aparelho.
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-12 rounded-xl bg-secondary"
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "criar" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-12 rounded-xl bg-secondary"
            />
          </div>
          <Button
            onClick={submit}
            disabled={busy || !email.trim() || password.length < 6}
            className="h-12 w-full rounded-full"
          >
            {mode === "criar" ? "Criar conta" : "Entrar"}
          </Button>
          <button
            onClick={() => { setMode(mode === "entrar" ? "criar" : "entrar"); setMessage(""); }}
            className="w-full text-center text-sm text-muted-foreground"
          >
            {mode === "entrar" ? "Não tem conta? Criar agora" : "Já tenho conta"}
          </button>
          {message && <p role="status" className="text-center text-sm text-primary">{message}</p>}
        </div>
      </div>
    </div>
  );
}
