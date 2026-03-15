import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Clock, Plus, Play, Square, Timer, TrendingUp } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { WipReport } from "@/components/time/WipReport";
import { format } from "date-fns";

export default function TimeRecording() {
  const { session } = useAuth();
  const { tenantId } = usePermissions();
  const qc = useQueryClient();

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Form state
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [durationMinutes, setDurationMinutes] = useState("");
  const [clientId, setClientId] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [ratePence, setRatePence] = useState("");

  // Queries
  const entriesQ = useQuery({
    queryKey: ["time-entries", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, clients(legal_name)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const clientsQ = useQuery({
    queryKey: ["clients-list-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, legal_name")
        .eq("status", "active")
        .order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createMut = useMutation({
    mutationFn: async (entry: {
      description: string;
      date: string;
      duration_minutes: number;
      client_id: string | null;
      is_billable: boolean;
      rate_pence: number | null;
    }) => {
      const { error } = await supabase.from("time_entries").insert({
        tenant_id: tenantId!,
        user_id: session!.user.id,
        ...entry,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Time entry saved");
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      setDescription("");
      setDurationMinutes("");
      setClientId("");
      setRatePence("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Timer
  const startTimer = () => {
    setTimerRunning(true);
    setTimerStart(Date.now());
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (timerStart || Date.now())) / 1000));
    }, 1000);
    (window as any).__timerInterval = interval;
  };

  const stopTimer = () => {
    setTimerRunning(false);
    if ((window as any).__timerInterval) clearInterval((window as any).__timerInterval);
    const mins = Math.round(elapsed / 60);
    setDurationMinutes(String(mins || 1));
    setElapsed(0);
    setTimerStart(null);
  };

  const handleSubmit = () => {
    const mins = parseInt(durationMinutes);
    if (!mins || mins <= 0) return toast.error("Duration required");
    createMut.mutate({
      description,
      date,
      duration_minutes: mins,
      client_id: clientId || null,
      is_billable: isBillable,
      rate_pence: ratePence ? parseInt(ratePence) * 100 : null,
    });
  };

  // KPIs
  const entries = entriesQ.data || [];
  const todayEntries = entries.filter((e: any) => e.date === format(new Date(), "yyyy-MM-dd"));
  const todayMinutes = todayEntries.reduce((s: number, e: any) => s + e.duration_minutes, 0);
  const weekMinutes = entries
    .filter((e: any) => {
      const d = new Date(e.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return d >= weekAgo;
    })
    .reduce((s: number, e: any) => s + e.duration_minutes, 0);
  const billableMinutes = entries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + e.duration_minutes, 0);
  const totalMinutes = entries.reduce((s: number, e: any) => s + e.duration_minutes, 0);
  const billablePct = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Time Recording
        </h1>
        <p className="text-sm text-muted-foreground">Track billable and non-billable hours across clients and tasks.</p>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Time Entries</TabsTrigger>
          <TabsTrigger value="wip">WIP Report</TabsTrigger>
        </TabsList>

        <TabsContent value="wip" className="mt-4">
          <WipReport />
        </TabsContent>

        <TabsContent value="entries" className="mt-4 space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Today" value={formatDuration(todayMinutes)} icon={Clock} iconColor="bg-accent" />
        <KPICard title="This Week" value={formatDuration(weekMinutes)} icon={Timer} iconColor="bg-primary/10" />
        <KPICard title="Billable Rate" value={`${billablePct}%`} change={`${formatDuration(billableMinutes)} billable`} changeType={billablePct >= 70 ? "positive" : "neutral"} icon={TrendingUp} iconColor="bg-[hsl(var(--success))]/10" />
        <KPICard title="Total Entries" value={entries.length} icon={Plus} iconColor="bg-secondary" />
      </div>

      {/* Entry form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Time Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you work on?" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Client</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {(clientsQ.data || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Minutes</label>
              <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="30" />
            </div>
            <div className="flex gap-2">
              {!timerRunning ? (
                <Button variant="outline" size="sm" onClick={startTimer}>
                  <Play className="w-3 h-3 mr-1" /> Timer
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={stopTimer} className="text-destructive">
                  <Square className="w-3 h-3 mr-1" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
                </Button>
              )}
              <Button size="sm" onClick={handleSubmit} disabled={createMut.isPending}>Save</Button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isBillable} onCheckedChange={(v) => setIsBillable(!!v)} />
              Billable
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Rate (£/hr)</label>
              <Input className="w-20" type="number" value={ratePence} onChange={(e) => setRatePence(e.target.value)} placeholder="150" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</TableCell>
                  <TableCell className="text-sm">{e.description || "—"}</TableCell>
                  <TableCell className="text-sm">{e.clients?.legal_name || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{formatDuration(e.duration_minutes)}</TableCell>
                  <TableCell>
                    <Badge variant={e.is_billable ? "default" : "secondary"} className="text-xs">
                      {e.is_billable ? "Billable" : "Non-billable"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{e.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No time entries yet — use the form above to log your first entry.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
