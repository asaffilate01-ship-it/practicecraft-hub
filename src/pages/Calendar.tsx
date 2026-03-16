import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CalendarEvent = {
  id: string;
  title: string;
  event_type: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  assigned_to: string;
  color: string;
};

const EVENTS: CalendarEvent[] = [
  { id: "1", title: "VAT Return - Acme Ltd", event_type: "deadline", start_at: "2026-03-20T09:00", end_at: "2026-03-20T10:00", all_day: false, assigned_to: "Sarah Jones", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { id: "2", title: "Payroll Run - Beta Services", event_type: "task", start_at: "2026-03-22T14:00", end_at: "2026-03-22T15:00", all_day: false, assigned_to: "Mike Chen", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { id: "3", title: "Client Meeting - Gamma Holdings", event_type: "meeting", start_at: "2026-03-18T10:00", end_at: "2026-03-18T11:00", all_day: false, assigned_to: "Sarah Jones", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { id: "4", title: "CT600 Filing Deadline", event_type: "deadline", start_at: "2026-03-31T00:00", end_at: "2026-03-31T23:59", all_day: true, assigned_to: "All", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { id: "5", title: "Staff Training Day", event_type: "internal", start_at: "2026-03-25T09:00", end_at: "2026-03-25T17:00", all_day: true, assigned_to: "All", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { id: "6", title: "Year-End Prep - Delta Ltd", event_type: "task", start_at: "2026-03-19T09:00", end_at: "2026-03-19T12:00", all_day: false, assigned_to: "Mike Chen", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
];

const STAFF = [
  { name: "Sarah Jones", role: "Manager", hours_week: 37.5, hours_booked: 32, leave_days: 2 },
  { name: "Mike Chen", role: "Staff Accountant", hours_week: 37.5, hours_booked: 35, leave_days: 0 },
  { name: "Emma Wilson", role: "Payroll Officer", hours_week: 30, hours_booked: 28, leave_days: 1 },
  { name: "James Taylor", role: "Trainee", hours_week: 37.5, hours_booked: 20, leave_days: 0 },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // March 2026
  const [showAdd, setShowAdd] = useState(false);

  const monthName = currentDate.toLocaleString("en-GB", { month: "long", year: "numeric" });

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday=0
    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentDate]);

  const getEventsForDay = (day: number) => {
    const dateStr = `2026-03-${day.toString().padStart(2, "0")}`;
    return EVENTS.filter(e => e.start_at.startsWith(dateStr));
  };

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const today = new Date().getDate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar & Scheduling</h1>
          <p className="text-muted-foreground">Practice calendar, deadlines, staff availability</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Add Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input placeholder="Event title" /></div>
              <div>
                <Label>Type</Label>
                <Select defaultValue="meeting">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Client Meeting</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="datetime-local" /></div>
                <div><Label>End</Label><Input type="datetime-local" /></div>
              </div>
              <div>
                <Label>Assign To</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {STAFF.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                    <SelectItem value="all">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => { setShowAdd(false); toast.success("Event added"); }}>Create Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-1" />Calendar</TabsTrigger>
          <TabsTrigger value="availability"><Users className="h-4 w-4 mr-1" />Staff Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <CardTitle>{monthName}</CardTitle>
                <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {DAYS.map(d => (
                  <div key={d} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                ))}
                {calendarDays.map((day, idx) => {
                  const events = day ? getEventsForDay(day) : [];
                  const isToday = day === today && currentDate.getMonth() === new Date().getMonth();
                  return (
                    <div key={idx} className={cn(
                      "bg-card min-h-[80px] p-1 text-sm",
                      !day && "bg-muted/50",
                      isToday && "ring-2 ring-inset ring-primary"
                    )}>
                      {day && (
                        <>
                          <div className={cn("text-xs font-medium mb-1", isToday && "text-primary font-bold")}>{day}</div>
                          <div className="space-y-0.5">
                            {events.slice(0, 2).map(e => (
                              <div key={e.id} className={cn("text-[10px] px-1 py-0.5 rounded truncate", e.color)}>
                                {e.title}
                              </div>
                            ))}
                            {events.length > 2 && (
                              <div className="text-[10px] text-muted-foreground px-1">+{events.length - 2} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Staff Capacity Overview</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Weekly Hours</TableHead>
                    <TableHead className="text-right">Booked</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Utilisation</TableHead>
                    <TableHead className="text-right">Leave (days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STAFF.map(s => {
                    const available = s.hours_week - s.hours_booked;
                    const utilisation = Math.round((s.hours_booked / s.hours_week) * 100);
                    return (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.role}</TableCell>
                        <TableCell className="text-right">{s.hours_week}</TableCell>
                        <TableCell className="text-right">{s.hours_booked}</TableCell>
                        <TableCell className="text-right font-semibold">{available}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={utilisation >= 90 ? "destructive" : utilisation >= 70 ? "secondary" : "outline"}>
                            {utilisation}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{s.leave_days || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
