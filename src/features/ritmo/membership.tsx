import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, UserRound } from "lucide-react";
import { useRitmo } from "@/features/ritmo/store";
import { getCurrentSession, saveMyProfile, type Membership } from "@/lib/members.functions";
import { formatPhone, isValidPhone } from "@/lib/phone";

type MembershipValue = { membership: Membership; setMembership: (next: Membership) => void };
const MembershipContext = createContext<MembershipValue | null>(null);
export const useMembership = () => useContext(MembershipContext)?.membership ?? null;
export const useMembershipActions = () => useContext(MembershipContext)?.setMembership ?? null;

export function MembershipGate({ children }: { children: ReactNode }) {
  const { session, setSession, signOut } = useRitmo();
  const membership = session?.membership ?? null;
  const setMembership = (next: Membership) => {
    if (session) setSession({ ...session, membership: next });
  };
  const waiting = Boolean(session) && !membership?.approved;

  // Enquanto aguarda aprovação, confere a cada 30 s se um administrador já aprovou.
  useEffect(() => {
    if (!waiting) return;
    const check = () => {
      void getCurrentSession().then((current) => {
        if (current?.membership.approved) setSession(current);
      }).catch(() => {});
    };
    const interval = window.setInterval(check, 30_000);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [waiting, setSession]);

  if (!membership?.approved) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
        <div className="w-full max-w-sm rounded-[24px] border border-border bg-card p-6 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-secondary text-primary">
            <Clock className="size-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">Aguardando aprovação</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu cadastro foi enviado. Assim que um administrador aprovar, o Ritmo abre automaticamente.
          </p>
          <Button variant="secondary" className="mt-6 w-full rounded-xl" onClick={() => void signOut()}>
            Sair da conta
          </Button>
        </div>
      </div>
    );
  }

  if (!membership.fullName) {
    return <ProfileSetup onDone={(next) => setMembership({ ...membership, ...next })} />;
  }

  return <MembershipContext.Provider value={{ membership, setMembership }}>{children}</MembershipContext.Provider>;
}

function ProfileSetup({
  onDone,
}: {
  onDone: (next: { fullName: string; nickname: string | null; phone: string }) => void;
}) {
  const save = useServerFn(saveMyProfile);
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = isValidPhone(phone);

  const submit = async () => {
    const name = fullName.trim();
    if (name.split(/\s+/).length < 2) return setError("Informe nome e sobrenome.");
    if (!phoneValid) return setError("Informe um telefone válido no formato (55) 43 98402-3440.");
    setError(null);
    setSaving(true);
    try {
      await save({ data: { fullName: name, nickname: nickname.trim(), phone: phone.trim() } });
      onDone({ fullName: name, nickname: nickname.trim() || null, phone: phone.trim() });
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
      <div className="w-full max-w-sm rounded-[24px] border border-border bg-card p-6">
        <span className="grid size-11 place-items-center rounded-full bg-secondary text-primary">
          <UserRound className="size-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Complete seu cadastro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Só para personalizar o Ritmo do seu jeito.
        </p>
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nome e sobrenome</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome e sobrenome" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nickname">Apelido (opcional)</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Apelido" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" placeholder="(55) 43 98402-3440" className="rounded-xl" />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <Button className="mt-6 w-full rounded-xl" disabled={saving || !phoneValid} onClick={() => void submit()}>
          {saving ? "Salvando..." : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
