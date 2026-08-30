import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CalendarEvent = { id: string; title: string; event_type: string; start_at: string; end_at: string; client_id: string | null; assigned_user_id: string | null };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const eventColors: Record<string, string> = { deadline: "bg-red-100 text-red-700", task: "bg-blue-100 text-blue-700", meeting: "bg-emerald-100 text-emerald-700", internal: "bg-purple-100 text-purple-700", leave: "bg-amber-100 text-amber-700" };
const emptyForm = () => ({ title: "", event_type: "meeting", start_at: "", end_at: "", client_id: "none", assigned_user_id: "none" });

export default function Calendar() {
  const queryClient = useQueryClient();
  const { tenantId } = usePermissions();
  const { user } = useAuth();
  const { selectedClientId } = useClientContext();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const monthStart = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
  const monthEnd = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), [currentDate]);

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", tenantId, currentDate.getFullYear(), currentDate.getMonth(), selectedClientId],
    queryFn: async () => {
      let query = supabase.from("calendar_events").select("id,title,event_type,start_at,end_at,client_id,assigned_user_id").gte("start_at", monthStart.toISOString()).lt("start_at", monthEnd.toISOString()).order("start_at");
      if (selectedClientId) query = query.eq("client_id", selectedClientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as CalendarEvent[];
    },
    enabled: !!tenantId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["calendar-clients", tenantId],
    queryFn: async () => { const { data, error } = await supabase.from("clients").select("id,legal_name").eq("status", "active").order("legal_name"); if (error) throw error; return data; },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["calendar-staff", tenantId],
    queryFn: async () => { const { data, error } = await supabase.from("profiles").select("id,full_name").order("full_name"); if (error) throw error; return data; },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      if (!tenantId || !form.title.trim() || !form.start_at || !form.end_at) throw new Error("Add a title, start and end time");
      if (new Date(form.end_at) <= new Date(form.start_at)) throw new Error("End time must be after start time");
      const { error } = await supabase.from("calendar_events").insert({
        tenant_id: tenantId, title: form.title.trim(), event_type: form.event_type, start_at: new Date(form.start_at).toISOString(), end_at: new Date(form.end_at).toISOString(),
        client_id: form.client_id === "none" ? selectedClientId : form.client_id, assigned_user_id: form.assigned_user_id === "none" ? null : form.assigned_user_id, created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["calendar-events"] }); setForm(emptyForm()); setShowAdd(false); toast.success("Calendar event saved"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const calendarDays = useMemo(() => {
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const days: (number | null)[] = Array.from({ length: (monthStart.getDay() + 6) % 7 }, () => null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) days.push(day);
    while (days.length % 7) days.push(null);
    return days;
  }, [currentDate, monthStart]);

  const eventsForDay = (day: number) => events.filter((event) => { const date = new Date(event.start_at); return date.getFullYear() === currentDate.getFullYear() && date.getMonth() === currentDate.getMonth() && date.getDate() === day; });
  const monthName = currentDate.toLocaleString("en-GB", { month: "long", year: "numeric" });
  const today = new Date();

  const addDialog = <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Add event</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add calendar event</DialogTitle></DialogHeader><div className="space-y-3">
    <div><Label>Title</Label><Input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} /></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label>Type</Label><Select value={form.event_type} onValueChange={(value) => setForm((item) => ({ ...item, event_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["meeting", "deadline", "task", "internal", "leave"].map((type) => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent></Select></div><div><Label>Client</Label><Select value={form.client_id === "none" && selectedClientId ? selectedClientId : form.client_id} onValueChange={(value) => setForm((item) => ({ ...item, client_id: value }))}><SelectTrigger><SelectValue placeholder="Practice-wide" /></SelectTrigger><SelectContent><SelectItem value="none">Practice-wide</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.legal_name}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label>Start</Label><Input type="datetime-local" value={form.start_at} onChange={(event) => setForm((value) => ({ ...value, start_at: event.target.value }))} /></div><div><Label>End</Label><Input type="datetime-local" value={form.end_at} onChange={(event) => setForm((value) => ({ ...value, end_at: event.target.value }))} /></div></div>
    <div><Label>Assign to</Label><Select value={form.assigned_user_id} onValueChange={(value) => setForm((item) => ({ ...item, assigned_user_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{staff.map((member) => <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>)}</SelectContent></Select></div>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={() => createEvent.mutate()} disabled={createEvent.isPending}>{createEvent.isPending ? "Saving…" : "Create event"}</Button></div>
  </div></DialogContent></Dialog>;

  return <div className="space-y-6"><WorkspacePageHeader eyebrow="Practice planning" title="Calendar & Scheduling" icon={CalendarDays} description="Persistent practice events, client deadlines and staff assignments." actions={addDialog} />
    <Tabs defaultValue="calendar"><TabsList className="w-max min-w-full justify-start"><TabsTrigger value="calendar"><CalendarDays className="mr-1 h-4 w-4" /> Calendar</TabsTrigger><TabsTrigger value="agenda"><Clock className="mr-1 h-4 w-4" /> Agenda</TabsTrigger><TabsTrigger value="team"><Users className="mr-1 h-4 w-4" /> Team</TabsTrigger></TabsList>
      <TabsContent value="calendar"><Card className="workspace-panel"><CardHeader><div className="flex items-center justify-between"><Button variant="ghost" size="icon" onClick={() => setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button><CardTitle>{monthName}</CardTitle><Button variant="ghost" size="icon" onClick={() => setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button></div></CardHeader><CardContent>
        <div className="space-y-2 md:hidden">{events.length ? events.map((event) => <div key={event.id} className="flex gap-3 rounded-xl border p-3"><div className="w-12 shrink-0 text-center"><p className="text-xl font-semibold">{new Date(event.start_at).getDate()}</p><p className="text-[10px] uppercase text-muted-foreground">{new Date(event.start_at).toLocaleDateString("en-GB", { month: "short" })}</p></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p><Badge variant="outline" className={cn("mt-2 capitalize", eventColors[event.event_type])}>{event.event_type}</Badge></div></div>) : <p className="py-12 text-center text-sm text-muted-foreground">No events in {monthName}.</p>}</div>
        <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-xl bg-border md:grid">{DAYS.map((day) => <div key={day} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}{calendarDays.map((day, index) => { const dayEvents = day ? eventsForDay(day) : []; const isToday = !!day && today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth() && today.getDate() === day; return <div key={index} className={cn("min-h-28 bg-card p-2", !day && "bg-muted/40", isToday && "ring-2 ring-inset ring-primary")}>{day && <><p className={cn("text-xs font-medium", isToday && "font-bold text-primary")}>{day}</p><div className="mt-1 space-y-1">{dayEvents.slice(0, 3).map((event) => <div key={event.id} className={cn("truncate rounded px-1.5 py-1 text-[10px]", eventColors[event.event_type] ?? "bg-muted")}>{event.title}</div>)}{dayEvents.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</p>}</div></>}</div>; })}</div>
      </CardContent></Card></TabsContent>
      <TabsContent value="agenda"><Card className="workspace-panel"><CardContent className="divide-y p-0">{events.length ? events.map((event) => <div key={event.id} className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><CalendarDays className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate font-medium">{event.title}</p><p className="text-xs text-muted-foreground">{new Date(event.start_at).toLocaleString("en-GB")} – {new Date(event.end_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p></div><Badge variant="outline" className="capitalize">{event.event_type}</Badge></div>) : <p className="py-16 text-center text-sm text-muted-foreground">No events found.</p>}</CardContent></Card></TabsContent>
      <TabsContent value="team"><Card className="workspace-panel"><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{staff.map((member) => <div key={member.id} className="rounded-xl border p-4"><p className="font-semibold">{member.full_name}</p><p className="mt-2 text-sm text-muted-foreground">{events.filter((event) => event.assigned_user_id === member.id).length} events this month</p></div>)}</CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
