import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
const reviewSchema = z.object({id:z.string(),status:z.enum(['requested','approved','changes_requested']),evidence_reference:z.string(),requested_by:z.string(),requested_at:z.string(),reviewed_at:z.string().nullable(),review_note:z.string().nullable(),is_current:z.boolean()});
const checks = [
  ['inputs_checked','Hours, overtime and absence inputs checked'],
  ['changes_checked','Starters, leavers and pay changes checked'],
  ['independent_calculation_checked','Calculations checked against independent evidence'],
  ['funding_checked','Employer costs and funding requirements reviewed'],
] as const;
export function PreparationReview({runId}:{runId:string}) {
  const {tenantId,can}=usePermissions();
  const {user}=useAuth();
  const qc=useQueryClient();
  const key=['payroll-preparation-reviews',tenantId,user?.id,runId];
  const [confirmed,setConfirmed]=useState<Record<string,boolean>>({});
  const [evidence,setEvidence]=useState('');
  const [note,setNote]=useState('');
  const query=useQuery({queryKey:key,enabled:!!tenantId && can('payroll','view'),queryFn:async()=>{
    const {data,error}=await supabase.rpc('get_payroll_preparation_reviews',{p_run_id:runId});
    if(error)throw error;
    return z.array(reviewSchema).parse(data);
  }});
  const request=useMutation({mutationFn:async()=>{
    const {error}=await supabase.rpc('request_payroll_preparation_review',{p_run_id:runId,p_checks:confirmed,p_evidence_reference:evidence.trim()});
    if(error)throw error;
  },onSuccess:()=>{qc.invalidateQueries({queryKey:key});setConfirmed({});setEvidence('');toast.success('Preparation review requested');},onError:(e:Error)=>toast.error(e.message)});
  const decide=useMutation({mutationFn:async({id,decision}:{id:string;decision:'approved'|'changes_requested'})=>{
    const {error}=await supabase.rpc('decide_payroll_preparation_review',{p_review_id:id,p_decision:decision,p_note:note.trim()});
    if(error)throw error;
  },onSuccess:()=>{qc.invalidateQueries({queryKey:key});setNote('');toast.success('Review decision recorded');},onError:(e:Error)=>toast.error(e.message)});
  const pending=query.data?.find(r=>r.status==='requested');
  const reviewer=can('payroll','approve') && pending?.requested_by!==user?.id;
  return <Card><CardHeader><CardTitle>Preparation & independent review</CardTitle><p className="text-sm text-muted-foreground">Record the evidence, then have a different authorised colleague review it. This does not release payments or submit payroll.</p></CardHeader><CardContent className="space-y-5">
    {query.isLoading ? <p role="status">Loading review history…</p> : query.isError ? <div role="alert" className="rounded-lg border p-4">Preparation reviews are unavailable. The payroll review database migration must be installed and your account must have payroll access.<Button variant="outline" className="ml-2" onClick={()=>query.refetch()}>Retry</Button></div> : <>
      {pending ? <div className="rounded-xl border p-4 space-y-3"><div className="flex gap-2"><Badge variant="secondary">Awaiting independent review</Badge>{!pending.is_current && <Badge variant="destructive">Payroll changed</Badge>}</div><p className="text-sm">Evidence: {pending.evidence_reference}</p>{reviewer ? <><label className="block text-sm" htmlFor="review-note">Review decision and rationale</label><Input id="review-note" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Record the checks and any changes required"/><div className="flex flex-wrap gap-2"><Button disabled={decide.isPending || note.trim().length<5 || !pending.is_current} onClick={()=>decide.mutate({id:pending.id,decision:'approved'})}>Approve preparation</Button><Button variant="outline" disabled={decide.isPending || note.trim().length<5} onClick={()=>decide.mutate({id:pending.id,decision:'changes_requested'})}>Request changes</Button></div></> : <p className="text-sm text-muted-foreground">A different colleague with payroll approval permission must review this request.</p>}</div> : can('payroll','run') && <div className="grid lg:grid-cols-2 gap-5"><fieldset className="space-y-3"><legend className="font-medium text-sm mb-3">Preparation checklist</legend>{checks.map(([id,label])=><label key={id} className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={!!confirmed[id]} onChange={e=>setConfirmed({...confirmed,[id]:e.target.checked})}/>{label}</label>)}</fieldset><div className="space-y-3"><label htmlFor="payroll-evidence" className="text-sm font-medium">Independent calculation evidence reference</label><Input id="payroll-evidence" maxLength={1000} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Document reference or validation report ID"/><p className="text-xs text-muted-foreground">Reference evidence held in your secure document system. Do not enter passwords or credentials.</p><Button disabled={request.isPending || evidence.trim().length<5 || !checks.every(([id])=>confirmed[id])} onClick={()=>request.mutate()}>Request independent review</Button></div></div>}
      <div className="space-y-3"><h3 className="font-medium text-sm">Review history</h3>{query.data?.length===0 && <p className="text-sm text-muted-foreground">No review has been requested for this run.</p>}{query.data?.map(r=><div key={r.id} className="rounded-lg bg-muted/40 p-3 text-sm"><div className="flex flex-wrap items-center gap-2"><Badge variant={r.status==='changes_requested'?'destructive':'secondary'}>{r.status.replace(/_/g,' ')}</Badge>{!r.is_current && <Badge variant="outline">Superseded by payroll changes</Badge>}<time className="text-xs text-muted-foreground">{new Date(r.requested_at).toLocaleString('en-GB',{timeZone:'Europe/London'})}</time></div><p className="mt-2">{r.evidence_reference}</p>{r.review_note && <p className="mt-1 text-muted-foreground">{r.review_note}</p>}</div>)}</div>
    </>}
  </CardContent></Card>;
}
