import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Check, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/ritmo/ui";
import { useMembership } from "@/features/ritmo/membership";
import { listMembers, updateMember, type Member } from "@/lib/members.functions";

export const Route = createFileRoute("/membros")({
  head: () => ({
    meta: [
      { title: "Membros — Ritmo" },
      { name: "description", content: "Aprove novos membros do Ritmo e defina quem tem acesso administrativo." },
      { property: "og:title", content: "Membros — Ritmo" },
      { property: "og:description", content: "Aprove novos membros do Ritmo e defina quem tem acesso administrativo." },
    ],
  }),
  component: MembersPage,
});

function MembersPage() {
  const membership = useMembership();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setMembers(await listMembers());
    } catch {
      toast.error("Não foi possível carregar os membros.");
    }
    setLoading(false);
  };

  useEffect(() => { if (membership?.isAdmin) void load(); }, [membership?.isAdmin]);

  if (!membership?.isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Membros" />
        <p className="text-sm text-muted-foreground">Esta área é exclusiva para administradores.</p>
      </div>
    );
  }

  type MemberAction =
    | { action: "approve" | "admin"; id: string; value: boolean }
    | { action: "remove"; id: string };

  const run = async (action: MemberAction) => {
    try {
      await updateMember({ data: action });
      return true;
    } catch {
      void load();
      return false;
    }
  };

  const setApproved = async (member: Member, approved: boolean) => {
    setMembers((all) => all.map((m) => (m.id === member.id ? { ...m, approved } : m)));
    if (!(await run({ action: "approve", id: member.id, value: approved }))) return void toast.error("Não foi possível salvar.");
    toast.success(approved ? `${member.email} aprovado` : `Acesso de ${member.email} suspenso`);
  };

  const setAdmin = async (member: Member, isAdmin: boolean) => {
    setMembers((all) => all.map((m) => (m.id === member.id ? { ...m, isAdmin } : m)));
    if (!(await run({ action: "admin", id: member.id, value: isAdmin }))) return void toast.error("Não foi possível alterar o acesso.");
    toast.success(isAdmin ? `${member.email} agora é administrador` : `${member.email} deixou de ser administrador`);
  };

  const remove = async (member: Member) => {
    setMembers((all) => all.filter((m) => m.id !== member.id));
    if (!(await run({ action: "remove", id: member.id }))) return void toast.error("Não foi possível remover.");
    toast.success(`${member.email} removido`);
  };

  const pending = members.filter((m) => !m.approved);
  const approved = members.filter((m) => m.approved);

  return (
    <div className="space-y-8">
      <PageHeader title="Membros" eyebrow="Aprovação de acesso" />
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <Section title={`Aguardando aprovação (${pending.length})`} empty="Nenhum pedido no momento.">
            {pending.map((member) => (
              <MemberCard key={member.id} member={member}>
                <Button size="sm" className="rounded-xl" onClick={() => void setApproved(member, true)}>
                  <Check className="size-4" /> Aprovar
                </Button>
                <Button size="icon" variant="ghost" aria-label="Recusar" className="rounded-xl text-muted-foreground" onClick={() => void remove(member)}>
                  <Trash2 className="size-4" />
                </Button>
              </MemberCard>
            ))}
          </Section>

          <Section title={`Membros ativos (${approved.length})`} empty="Ninguém aprovado ainda.">
            {approved.map((member) => (
              <MemberCard key={member.id} member={member}>
                <Button
                  size="sm"
                  variant={member.isAdmin ? "secondary" : "outline"}
                  className="rounded-xl"
                  onClick={() => void setAdmin(member, !member.isAdmin)}
                >
                  {member.isAdmin ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                  {member.isAdmin ? "Remover adm" : "Tornar adm"}
                </Button>
                <Button size="icon" variant="ghost" aria-label="Suspender" className="rounded-xl text-muted-foreground" onClick={() => void setApproved(member, false)}>
                  <Trash2 className="size-4" />
                </Button>
              </MemberCard>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {hasItems ? <div className="space-y-2">{children}</div> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}

function MemberCard({ member, children }: { member: Member; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-border bg-card p-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
        <UserRound className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.email}</p>
        <p className="text-xs text-muted-foreground">{member.isAdmin ? "Administrador" : member.approved ? "Membro" : "Aguardando aprovação"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}
