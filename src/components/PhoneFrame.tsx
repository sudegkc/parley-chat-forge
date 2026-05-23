import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  avatar?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
};

export function PhoneFrame({ title, subtitle, avatar, rightSlot, children }: Props) {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-border bg-phone-bg"
      style={{ boxShadow: "var(--shadow-phone)" }}
    >
      <div className="flex items-center gap-3 border-b border-border bg-phone-header px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {avatar ?? title.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{title}</div>
          {subtitle && (
            <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}
