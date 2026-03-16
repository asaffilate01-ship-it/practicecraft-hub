import React, { useState, useEffect } from "react";
import { getSelectedClientId, setSelectedClientId } from "@/portal/clients/clientStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function ClientSwitcher() {
  const { user } = useAuth();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState(getSelectedClientId() ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Portal users see clients linked to them via portal_users
      const { data: portalLinks } = await supabase
        .from("portal_users")
        .select("client_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!portalLinks?.length) {
        setLoading(false);
        return;
      }

      const clientIds = portalLinks.map((l) => l.client_id).filter(Boolean) as string[];
      if (!clientIds.length) { setLoading(false); return; }

      const { data: clientRows } = await supabase
        .from("clients")
        .select("id, legal_name")
        .in("id", clientIds);

      const rows = (clientRows ?? []).map((c) => ({ id: c.id, name: c.legal_name }));
      setClients(rows);

      if (!selected && rows[0]?.id) {
        setSelected(rows[0].id);
        setSelectedClientId(rows[0].id);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading || clients.length <= 1) return null;

  return (
    <div className="px-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Client</div>
      <select
        className="w-full text-xs border rounded-md px-2 py-1.5 bg-background text-foreground"
        value={selected}
        onChange={(e) => {
          const id = e.target.value;
          setSelected(id);
          setSelectedClientId(id);
          window.location.reload();
        }}
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
