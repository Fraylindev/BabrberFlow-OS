export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-[var(--color-border)]">
      <table className="w-full min-w-max border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
      {children}
    </tbody>
  );
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return (
    <tr className="transition-colors hover:bg-[var(--color-surface-raised)]">
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`px-4 py-3 text-[var(--color-paper)] ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </td>
  );
}
