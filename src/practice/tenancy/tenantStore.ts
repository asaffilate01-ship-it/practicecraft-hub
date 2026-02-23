const KEY = "practice_selected_tenant_id";

export function getSelectedTenantId(): string {
  return localStorage.getItem(KEY) ?? "t-001";
}

export function setSelectedTenantId(id: string) {
  localStorage.setItem(KEY, id);
}
