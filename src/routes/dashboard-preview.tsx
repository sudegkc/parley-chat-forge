import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/dashboard-preview")({
  head: () => ({
    meta: [
      { title: "Business profile preview" },
      { name: "description", content: "Preview of the business profile form with sample data." },
    ],
  }),
  component: DashboardPreviewPage,
});

type FormState = {
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  category: string;
  address: string;
  website: string;
  telegram_id: string;
};

const sample: FormState = {
  business_name: "Brew & Bean Café",
  owner_name: "Sarah Chen",
  email: "sarah@brewandbean.com",
  phone: "+1 415 555 0123",
  category: "Café & Bakery",
  website: "https://brewandbean.com",
  telegram_id: "@brewandbean",
  address: "482 Valencia Street, San Francisco, CA 94103",
};

function DashboardPreviewPage() {
  const [form, setForm] = useState<FormState>(sample);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const onSubmit = (e: FormEvent) => e.preventDefault();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-base font-semibold tracking-tight">
            Business Owner
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              Preview mode
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Business profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sample data — sign in to edit your own business.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" required>
              <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Owner name" required>
              <Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
            </Field>
            <Field label="Category">
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} maxLength={80} />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} maxLength={255} />
            </Field>
            <Field label="Telegram ID">
              <Input value={form.telegram_id} onChange={(e) => set("telegram_id", e.target.value)} maxLength={80} />
            </Field>
          </div>
          <Field label="Address">
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={3} maxLength={500} />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled>
              Save changes (preview)
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
