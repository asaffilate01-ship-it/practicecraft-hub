import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MOCK_THREADS = [
  { id: "t-1", subject: "VAT Return Q4 queries", unreadCount: 2, lastMessageAt: "2026-02-22T14:30:00Z" },
  { id: "t-2", subject: "Payroll setup for new employee", unreadCount: 0, lastMessageAt: "2026-02-20T09:15:00Z" },
  { id: "t-3", subject: "Missing receipts February", unreadCount: 1, lastMessageAt: "2026-02-18T11:00:00Z" },
];

export default function PortalMessagesPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with your practice team.</p>
        </div>
        <Button size="sm" onClick={() => alert("Wire create new thread")}>
          New message
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-7">Subject</div>
            <div className="col-span-2">Unread</div>
            <div className="col-span-3">Last message</div>
          </div>
          {MOCK_THREADS.map((t) => (
            <div key={t.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
              <div className="col-span-7 font-medium">
                <Link className="text-primary hover:underline" to={`/portal/messages/${t.id}`}>
                  {t.subject}
                </Link>
              </div>
              <div className="col-span-2">
                {t.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{t.unreadCount}</span>
                )}
              </div>
              <div className="col-span-3 text-xs text-muted-foreground">
                {new Date(t.lastMessageAt).toLocaleString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
