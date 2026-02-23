import React, { createContext, useContext, useState, useCallback } from "react";

interface ClientContextType {
  selectedClientId: string | null;
  selectedClientName: string | null;
  selectClient: (id: string, name: string) => void;
  clearClient: () => void;
}

const ClientContext = createContext<ClientContextType>({
  selectedClientId: null,
  selectedClientName: null,
  selectClient: () => {},
  clearClient: () => {},
});

export function useClientContext() {
  return useContext(ClientContext);
}

export function ClientContextProvider({ children }: { children: React.ReactNode }) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    () => sessionStorage.getItem("selected_client_id")
  );
  const [selectedClientName, setSelectedClientName] = useState<string | null>(
    () => sessionStorage.getItem("selected_client_name")
  );

  const selectClient = useCallback((id: string, name: string) => {
    setSelectedClientId(id);
    setSelectedClientName(name);
    sessionStorage.setItem("selected_client_id", id);
    sessionStorage.setItem("selected_client_name", name);
  }, []);

  const clearClient = useCallback(() => {
    setSelectedClientId(null);
    setSelectedClientName(null);
    sessionStorage.removeItem("selected_client_id");
    sessionStorage.removeItem("selected_client_name");
  }, []);

  return (
    <ClientContext.Provider value={{ selectedClientId, selectedClientName, selectClient, clearClient }}>
      {children}
    </ClientContext.Provider>
  );
}
