export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full border-collapse">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-border bg-surface-sunken">
      <tr>{children}</tr>
    </thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

// Explicit map, not a `text-${align}` template: Tailwind scans source text
// and would never emit the classes for an interpolated name.
const ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

export function Th({
  children,
  align = 'left',
  className = '',
}: {
  children?: React.ReactNode;
  align?: keyof typeof ALIGN;
  className?: string;
}) {
  return <th className={`th ${ALIGN[align]} ${className}`}>{children}</th>;
}

export function Td({
  children,
  align = 'left',
  className = '',
  muted = false,
  numeric = false,
}: {
  children?: React.ReactNode;
  align?: keyof typeof ALIGN;
  className?: string;
  muted?: boolean;
  numeric?: boolean;
}) {
  return (
    <td
      className={`td ${ALIGN[align]} ${muted ? 'text-fg-muted' : ''} ${numeric ? 'tabular' : ''} ${className}`}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={`row ${className}`}>{children}</tr>;
}
