import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MOCK_MESSAGES: Record<string, any[]> = {
  "t-1": [
    { id: "m1", from: "practice", body: "Hi, could you send the Q4 sales figures?", at: "2026-02-20T10:00:00Z" },
    { id: "m2", from: "client", body: "Sure, I'll upload the spreadsheet today.", at: "2026-02-20T11:30:00Z" },
    { id: "m3", from: "practice", body: "Thanks! Also, any zero-rated exports this quarter?", at: "2026-02-22T14:30:00Z" },
  ],
  "t-2": [
    { id: "m4", from: "client", body: "We're hiring a new developer starting March.", at: "2026-02-19T09:00:00Z" },
    { id: "m5", from: "practice", body: "Great, I'll need their P45 or starter checklist. Can you upload when ready?", at: "2026-02-20T09:15:00Z" },
  ],
  "t-3": [
    { id: "m6", from: "practice", body: "We're missing receipts for 3 transactions in February. Please upload them.", at: "2026-02-18T11:00:00Z" },
  ],
};

export default function PortalMessageThreadPage() {
  const { threadId = "" } = useParams();
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState(MOCK_MESSAGES[threadId] ?? []);

  const handleSend = () => {
    if (!text.trim()) return;
    setMsgs((prev) => [...prev, { id: `m-${Date.now()}`, from: "client", body: text, at: new Date().toISOString() }]);
    setText("");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Thread</h1>
        <p className="text-sm text-muted-foreground">{threadId}</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {msgs.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
          {msgs.map((m) => (
            <div key={m.id} className={cn("max-w-xl", m.from === "client" && "ml-auto text-right")}>
              <div className="text-xs text-muted-foreground">
                {new Date(m.at).toLocaleString()} • {m.from}
              </div>
              <div
                className={cn(
                  "mt-1 inline-block px-3 py-2 rounded-lg text-sm",
                  m.from === "client"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {m.body}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">Reply</div>
          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message..." />
          <div className="mt-2 flex justify-end">
            <Button disabled={!text.trim()} onClick={handleSend}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
