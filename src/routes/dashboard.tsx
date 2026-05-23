import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Business Owner" },
      { name: "description", content: "Manage your business profile." },
    ],
  }),
  component: DashboardPage,
});

const schema = z.object({
  business_name: z.string().trim().min(1, "Business name is required").max(120),
  owner_name: z.string().trim().min(1, "Owner name is required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  telegram_id: z.string().trim().max(80).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

const empty: FormState = {
  business_name: "",
  owner_name: "",
  email: "",
  phone: "",
  category: "",
  address: "",
  website: "",
  telegram_id: "",
};

function DashboardPage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
    });

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      if (!active) return;
      setUserEmail(session.user.email ?? null);

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        toast.error(error.message);
      } else if (data) {
        setForm({
          business_name: data.business_name ?? "",
          owner_name: data.owner_name ?? "",
          email: data.email ?? session.user.email ?? "",
          phone: data.phone ?? "",
          category: data.category ?? "",
          address: data.address ?? "",
          website: data.website ?? "",
          telegram_id: data.telegram_id ?? "",
        });
      } else {
        setForm((f) => ({ ...f, email: session.user.email ?? "" }));
      }
      setLoading(false);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setSaving(false);
      navigate({ to: "/login" });
      return;
    }
    const payload = { user_id: userId, ...parsed.data };
    const { error } = await supabase
      .from("businesses")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Business profile saved.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading your profile…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/dashboard" className="text-base font-semibold tracking-tight">
            Business Owner
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{userEmail}</span>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Business profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your business information up to date.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" required>
              <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} required maxLength={120} />
            </Field>
            <Field label="Owner name" required>
              <Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} required maxLength={120} />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required maxLength={255} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} placeholder="+1 555 123 4567" />
            </Field>
            <Field label="Category">
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} maxLength={80} placeholder="Café, Retail, Services…" />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} maxLength={255} placeholder="https://example.com" />
            </Field>
            <Field label="Telegram ID">
              <Input value={form.telegram_id} onChange={(e) => set("telegram_id", e.target.value)} maxLength={80} placeholder="@yourhandle" />
            </Field>
          </div>
          <Field label="Address">
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={3} maxLength={500} />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
