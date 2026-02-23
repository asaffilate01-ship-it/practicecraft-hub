import React, { useState, useEffect } from "react";
import { getSelectedClientId, setSelectedClientId } from "@/portal/clients/clientStore";

// Mock accessible clients — later replaced with API call
const MOCK_CLIENTS = [
  { id: "pc-1", name: "Kitchen313 Group Ltd", entityType: "ltd", reference: "14500123" },
  { id: "pc-2", name: "EventPlanr Ltd", entityType: "ltd", reference: "14077891" },
  { id: "pc-3", name: "IQ Advisory (Sole Trader)", entityType: "sole_trader", reference: "UTR-***" },
];

export function ClientSwitcher() {
  const rows = MOCK_CLIENTS;
  const [selected, setSelected] = useState(getSelectedClientId() ?? rows[0]?.id ?? "");

  useEffect(() => {
    if (!selected && rows[0]?.id) setSelected(rows[0].id);
  }, [rows, selected]);

  if (rows.length <= 1) return null;

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
        {rows.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
