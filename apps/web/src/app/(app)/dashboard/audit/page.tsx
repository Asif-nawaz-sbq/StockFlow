import { ScrollText } from 'lucide-react';
import { serverFetch } from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { Page } from '@/lib/types';
import { Pagination } from '@/components/pagination';
import { SearchField } from '@/components/search-field';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, Td, THead, Th, Tr, TableWrap } from '@/components/ui/table';

export const metadata = { title: 'Audit log' };

interface AuditLog {
  id: string;
  createdAt: string;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
}

const ACTION_TONES: Record<string, 'success' | 'danger' | 'info' | 'neutral'> = {
  create: 'success',
  confirm: 'info',
  ship: 'success',
  receive: 'success',
  cancel: 'danger',
  archive: 'danger',
  adjust: 'neutral',
};

function toneFor(action: string) {
  const verb = action.split('.').pop() ?? '';
  return ACTION_TONES[verb] ?? 'neutral';
}

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AuditPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams({
    page: params.page ?? '1',
    pageSize: '30',
  });
  if (params.search) query.set('search', params.search);

  const logs = await serverFetch<Page<AuditLog>>(`/audit-logs?${query}`);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description={`${formatNumber(logs.meta.total)} entries · every write is recorded with actor and IP`}
      />

      <SearchField placeholder="Action or user" />

      <Card className="overflow-hidden">
        {logs.data.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No entries yet"
            hint="The log fills up as soon as changes are made through the interface."
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <Th>When</Th>
                  <Th>User</Th>
                  <Th>Action</Th>
                  <Th>Entity</Th>
                  <Th>IP</Th>
                </THead>
                <TBody>
                  {logs.data.map((log) => (
                    <Tr key={log.id}>
                      <Td muted>{formatDateTime(log.createdAt)}</Td>
                      <Td>{log.actorEmail ?? '—'}</Td>
                      <Td>
                        <Badge tone={toneFor(log.action)}>
                          <span className="font-mono text-2xs">{log.action}</span>
                        </Badge>
                      </Td>
                      <Td muted>
                        <span className="font-mono text-2xs">
                          {log.entityType ?? '—'}
                          {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}
                        </span>
                      </Td>
                      <Td muted>
                        <span className="font-mono text-2xs">{log.ipAddress ?? '—'}</span>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <Pagination meta={logs.meta} />
          </>
        )}
      </Card>
    </div>
  );
}
