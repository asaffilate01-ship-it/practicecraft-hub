const KEY = "portal_selected_client_id";

export function getSelectedClientId(): string | null {
  return localStorage.getItem(KEY);
}

export function setSelectedClientId(id: string) {
  localStorage.setItem(KEY, id);
}
