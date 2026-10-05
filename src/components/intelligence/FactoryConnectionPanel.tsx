import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Network, RefreshCw, Sparkles } from 'lucide-react';

const statusSchema = z.object({ configured: z.boolean(), authority: z.literal('local'), mode: z.literal('shadow'),
  legacyAiProvider: z.string(), productKey: z.string().nullable(), centralTenantId: z.string().nullable() });
const snapshotSchema = z.object({ checkedAt: z.string().datetime(), generatedAt: z.string().datetime(), active: z.boolean(),
  productKey: z.string(), tenantId: z.string().uuid(), services: z.array(z.object({ key: z.string(), enabled: z.boolean() })) });
const receiptSchema = z.object({ runId: z.string().uuid(), status: z.literal('queued') });
const runSchema = z.object({ run: z.object({ id: z.string().uuid(), status: z.string(), result: z.unknown().nullable() }) });

async function invoke(action: string, runId?: string) {
  const { data, error } = await supabase.functions.invoke('omniqora-bridge', { body: { action, ...(runId ? { runId } : {}) } });
  if (error) {
    let message = 'Connection unavailable. Check that the bridge is deployed and configured.';
    try { message = (await error.context.json()).error || message; } catch { /* No trusted error body. */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function FactoryConnectionPanel() {
  const { user } = useAuth();
  const permissions = usePermissions();
  if (!user || !permissions.tenantId || !permissions.can('integrations', 'view')) return null;
  return <Connection key={`${user.id}:${permissions.tenantId}`} userId={user.id} tenantId={permissions.tenantId}
    canBrief={permissions.can('reports', 'view') && permissions.can('clients', 'view') && permissions.can('tasks', 'view')} />;
}

function Connection({ userId, tenantId, canBrief }: { userId: string; tenantId: string; canBrief: boolean }) {
  const [runId, setRunId] = useState<string | null>(null);
  const status = useQuery({ queryKey: ['factory-status', userId, tenantId],
    queryFn: async () => statusSchema.parse(await invoke('status')), retry: false });
  const snapshot = useMutation({ mutationFn: async () => snapshotSchema.parse(await invoke('snapshot')) });
  const start = useMutation({ mutationFn: async () => receiptSchema.parse(await invoke('run.start')),
    onSuccess: receipt => setRunId(receipt.runId), retry: false });
  const run = useQuery({ queryKey: ['factory-brief', userId, tenantId, runId],
    queryFn: async () => runSchema.parse(await invoke('run.get', runId!)), enabled: !!runId, retry: false });
  const error = status.error || snapshot.error || start.error || run.error;

  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5" /> Omniqora & SaaS Factory</CardTitle>
        <Badge variant="outline">Local authority · shadow integration</Badge>
      </div>
      <CardDescription>Omniqora → accountancy landlord → practice tenant → clients and users. Client records remain in this product.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      {status.isPending ? <p role="status">Checking bridge configuration…</p> : status.data && <div className="grid gap-4 md:grid-cols-2">
        <div><p className="text-sm font-medium">Factory binding</p><p className="text-sm text-muted-foreground">{status.data.configured ? `Configured for ${status.data.productKey}; verify the connection below.` : 'Not configured for this practice.'}</p></div>
        <div><p className="text-sm font-medium">Existing AI route</p><p className="text-sm text-muted-foreground">{status.data.legacyAiProvider}. Receipt OCR, categorisation and existing AI panels use this separate route.</p></div>
      </div>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error.message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => status.refetch()} disabled={status.isFetching}><RefreshCw className="mr-2 h-4 w-4" /> Reload configuration</Button>
        <Button onClick={() => snapshot.mutate()} disabled={!status.data?.configured || snapshot.isPending}>{snapshot.isPending ? 'Verifying…' : 'Verify Factory connection'}</Button>
      </div>
      {snapshot.data && !snapshot.error && <div className="rounded-lg border p-4 space-y-2">
        <p className="font-medium">{snapshot.data.active ? 'Snapshot verified' : 'Snapshot received; tenant or product inactive'}</p>
        <p className="text-xs text-muted-foreground">Checked {new Date(snapshot.data.checkedAt).toLocaleString('en-GB')}. This records that check only; it does not prove an AI worker or production filing is running.</p>
        <div className="flex flex-wrap gap-2">{snapshot.data.services.map(service => <Badge key={service.key} variant={service.enabled ? 'secondary' : 'outline'}>{service.key}: {service.enabled ? 'enabled' : 'disabled'}</Badge>)}</div>
      </div>}
      <div className="border-t pt-4 space-y-3">
        <h3 className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4" /> Omniqora practice brief</h3>
        <p className="text-sm text-muted-foreground">Sends today’s date, active-client count and overdue-task count to the configured Omniqora tenant. Requires an active Intelligence entitlement. Output is advisory and cannot post, approve or file anything.</p>
        <Button variant="outline" onClick={() => start.mutate()} disabled={!status.data?.configured || !canBrief || start.isPending || !!runId}>{start.isPending ? 'Requesting…' : 'Request aggregate practice brief'}</Button>
        {start.isError && <p className="text-xs text-muted-foreground">If the request timed out, check central run history before retrying; a job may already have been created.</p>}
        {runId && <div className="space-y-2 rounded-lg bg-muted/40 p-4">
          <p className="text-sm">Run: <span className="break-all font-mono text-xs">{runId}</span></p>
          <p className="text-sm">Status: {run.data?.run.status ?? 'Queued; result not yet verified'}</p>
          <Button variant="outline" size="sm" onClick={() => run.refetch()} disabled={run.isFetching}>Check result</Button>
          {run.data?.run.result != null && <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(run.data.run.result, null, 2)}</pre>}
          <p className="text-xs text-muted-foreground">A queued run is not a completed model response. Keep the run ID for the central audit trail.</p>
        </div>}
      </div>
    </CardContent>
  </Card>;
}
