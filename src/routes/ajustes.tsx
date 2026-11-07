import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Bell, CalendarDays, Check, ChevronRight, Download, LogOut, Pencil, Smartphone, Trash2, Upload, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/features/ritmo/ui";
import { useRitmo } from "@/features/ritmo/store";
import { useMembership, useMembershipActions } from "@/features/ritmo/membership";
import { formatPhone, isValidPhone } from "@/lib/phone";
import { saveMyProfile } from "@/lib/members.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/ajustes")({ head: () => ({ meta: [
  { title: "Ajustes — Ritmo" }, { name: "description", content: "Personalize notificações, semana e backups do Ritmo." }, { property: "og:title", content: "Ajustes — Ritmo" }, { property: "og:description", content: "Personalize notificações, semana e backups do Ritmo." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: SettingsPage });
function SettingsPage() {
  const { preferences, setPreferences, exportData, importData, resetData, session, signOut } = useRitmo(); const fileRef = useRef<HTMLInputElement>(null); const [message, setMessage] = useState(""); const [confirmReset, setConfirmReset] = useState(0);
  const download = () => { const blob = new Blob([exportData()], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `ritmo-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); };
  const upload = async (file?: File) => { if (!file) return; setMessage(importData(await file.text()) ? "Backup restaurado." : "Arquivo inválido."); };
  const install = async () => { setMessage("No celular, use o menu do navegador e escolha “Adicionar à Tela de Início”."); };
  return <><PageHeader eyebrow="Preferências" title="Ajustes" action={<button type="button" aria-label="Sair da conta" onClick={() => { void signOut(); }} className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-destructive"><LogOut className="size-5" /></button>} /><section className="mt-8 overflow-hidden rounded-[24px] border border-border bg-card"><Setting icon={UserRound} title="Conta" detail={session?.user.email ?? "Lincoln"} /><Setting icon={CalendarDays} title="Semana começa na segunda" control={<Switch checked={preferences.weekStartsMonday} onCheckedChange={(weekStartsMonday) => setPreferences({ ...preferences, weekStartsMonday })} aria-label="Semana começa na segunda" />} /><Setting icon={Bell} title="Notificações" control={<Switch checked={preferences.notifications} onCheckedChange={(notifications) => setPreferences({ ...preferences, notifications })} aria-label="Ativar notificações" />} /></section>
<ProfileSection />
  <section className="mt-8"><p className="mb-3 text-sm text-muted-foreground">Seus dados</p><div className="overflow-hidden rounded-[24px] border border-border bg-card"><button onClick={download} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border p-4 text-left"><Download className="size-5 text-primary" /><span><strong className="block text-sm font-medium">Exportar backup</strong><small className="text-muted-foreground">Baixar todos os seus hábitos</small></span><ChevronRight className="size-4 text-muted-foreground" /></button><button onClick={() => fileRef.current?.click()} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-left"><Upload className="size-5 text-primary" /><span><strong className="block text-sm font-medium">Restaurar backup</strong><small className="text-muted-foreground">Importar um arquivo do Ritmo</small></span><ChevronRight className="size-4 text-muted-foreground" /></button><input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /></div></section>
  <section className="mt-8"><p className="mb-3 text-sm text-muted-foreground">Zona de risco</p><div className="overflow-hidden rounded-[24px] border border-border bg-card">
    <button onClick={() => { setConfirmReset(1); setMessage(""); }} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-left"><Trash2 className="size-5 text-destructive" /><span><strong className="block text-sm font-medium text-destructive">Zerar dados</strong><small className="text-muted-foreground">Apaga hábitos, sequências e todo o progresso</small></span><ChevronRight className="size-4 text-muted-foreground" /></button>
    {confirmReset > 0 && <div className="border-t border-border p-4"><p className="text-sm font-medium">{confirmReset === 1 ? "Tem certeza? Essa ação não pode ser desfeita." : "Último aviso: todos os seus dados serão apagados agora."}</p><div className="mt-3 flex gap-2"><Button variant="destructive" className="rounded-full" onClick={() => { if (confirmReset === 1) setConfirmReset(2); else { resetData(); setConfirmReset(0); setMessage("Dados zerados."); } }}>{confirmReset === 1 ? "Sim, continuar" : "Apagar tudo"}</Button><Button variant="ghost" className="rounded-full" onClick={() => setConfirmReset(0)}>Cancelar</Button></div></div>}
  </div></section>
  <section className="mt-8 rounded-[24px] border border-border bg-card p-5"><div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary"><Smartphone className="size-5" /></div><div className="min-w-0"><h2 className="font-medium">Instalar Ritmo</h2><p className="mt-1 text-sm text-muted-foreground">Acesso rápido pela tela inicial, com seus hábitos disponíveis mesmo sem internet.</p><Button onClick={install} className="mt-4 rounded-full">Como instalar</Button></div></div></section>{message && <p role="status" className="mt-4 text-center text-sm text-primary">{message}</p>}<p className="mt-10 text-center text-xs text-muted-foreground">Ritmo 1.0 · Privado por padrão</p></>;
}
function ProfileSection() {
  const membership = useMembership();
  const setMembership = useMembershipActions();
  const save = useServerFn(saveMyProfile);

  const persist = async (next: { fullName: string; nickname: string | null; phone: string }) => {
    await save({ data: { fullName: next.fullName, nickname: next.nickname ?? "", phone: next.phone } });
    if (membership) setMembership?.({ ...membership, ...next });
  };

  return (
    <section className="mt-8">
      <p className="mb-3 text-sm text-muted-foreground">Perfil</p>
      <div className="divide-y divide-border rounded-[24px] border border-border bg-card">
        <ProfileField
          label="Nome e sobrenome"
          value={membership?.fullName ?? ""}
          display={membership?.fullName || "—"}
          validate={(v) => (v.trim().split(/\s+/).length < 2 ? "Informe nome e sobrenome." : null)}
          onSave={async (v) => persist({ fullName: v.trim(), nickname: membership?.nickname ?? null, phone: membership?.phone ?? "" })}
        />
        <ProfileField
          label="Apelido"
          value={membership?.nickname ?? ""}
          display={membership?.nickname || "—"}
          optional
          onSave={async (v) => persist({ fullName: membership?.fullName ?? "", nickname: v.trim() || null, phone: membership?.phone ?? "" })}
        />
        <ProfileField
          label="Telefone"
          value={membership?.phone ?? ""}
          display={membership?.phone || "—"}
          inputMode="tel"
          format={formatPhone}
          validate={(v) => (isValidPhone(v) ? null : "Telefone inválido. Use (55) 43 98402-3440.")}
          onSave={async (v) => persist({ fullName: membership?.fullName ?? "", nickname: membership?.nickname ?? null, phone: v.trim() })}
        />
      </div>
    </section>
  );
}

function ProfileField({
  label,
  value,
  display,
  optional,
  inputMode,
  format,
  validate,
  onSave,
}: {
  label: string;
  value: string;
  display: string;
  optional?: boolean;
  inputMode?: "tel" | "text" | "email";
  format?: (v: string) => string;
  validate?: (v: string) => string | null;
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const begin = () => { setDraft(value); setError(null); setOk(false); setEditing(true); };

  const cancel = () => { setEditing(false); setError(null); };

  const submit = async () => {
    const v = format ? format(draft) : draft;
    if (validate) {
      const err = validate(v);
      if (err) { setError(err); return; }
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(v);
      setOk(true);
      setEditing(false);
      setTimeout(() => setOk(false), 2000);
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      {editing ? (
        <div className="space-y-2">
          <Label>{label}{optional ? " (opcional)" : ""}</Label>
          <Input
            value={draft}
            onChange={(e) => setDraft(format ? format(e.target.value) : e.target.value)}
            inputMode={inputMode}
            placeholder={label}
            className="rounded-xl"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button className="flex-1 rounded-xl gap-2" disabled={saving} onClick={() => void submit()}>
              <Check className="size-4" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="ghost" className="rounded-xl" disabled={saving} onClick={cancel}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            {ok ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-primary"><Check className="size-3.5" /> Atualizado</p>
            ) : (
              <p className="truncate text-sm font-medium">{display}</p>
            )}
          </div>
          <button
            type="button"
            aria-label={`Editar ${label}`}
            onClick={begin}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary transition-colors hover:bg-secondary/80"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
function Setting({ icon: Icon, title, detail, control }: { icon: typeof UserRound; title: string; detail?: string; control?: React.ReactNode }) { return <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border p-4 last:border-0"><Icon className="size-5 text-primary" /><span className="text-sm font-medium">{title}</span>{control ?? <span className="text-sm text-muted-foreground">{detail}</span>}</div>; }
