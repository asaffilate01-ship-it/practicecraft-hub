import { PERMISSION_CATALOG } from "./permissionCatalog";

export type PermissionsJSON = Record<string, Record<string, boolean>>;

/**
 * Build a fully-populated permission object with all values defaulting to false.
 */
export function buildBlankPermissions(): PermissionsJSON {
  const out: PermissionsJSON = {};
  for (const [module, actions] of Object.entries(PERMISSION_CATALOG)) {
    out[module] = {};
    for (const a of actions) out[module][a] = false;
  }
  return out;
}

/**
 * Merge partial permission updates into a full permission model.
 */
export function mergePermissions(
  base: PermissionsJSON,
  patch: Partial<PermissionsJSON>
): PermissionsJSON {
  const out: PermissionsJSON = structuredClone(base);
  for (const [module, actionMap] of Object.entries(patch)) {
    out[module] ??= {};
    for (const [action, value] of Object.entries(actionMap ?? {})) {
      out[module][action] = Boolean(value);
    }
  }
  return out;
}

/**
 * Check if a permission object has a specific module.action enabled.
 */
export function can(
  permissions: PermissionsJSON | null | undefined,
  module: string,
  action: string
): boolean {
  return Boolean(permissions?.[module]?.[action]);
}

/**
 * Validate a permissions JSON object against the catalog.
 * Returns errors for unknown modules, unknown actions, or non-boolean values.
 */
export function validatePermissions(p: unknown): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof p !== "object" || p === null) {
    return { ok: false, errors: ["permissions must be an object"] };
  }

  for (const [module, actionMap] of Object.entries(p as Record<string, unknown>)) {
    if (!PERMISSION_CATALOG[module]) {
      errors.push(`unknown module: ${module}`);
      continue;
    }
    if (typeof actionMap !== "object" || actionMap === null) {
      errors.push(`module ${module} must be an object`);
      continue;
    }
    for (const [action, value] of Object.entries(actionMap as Record<string, unknown>)) {
      if (!PERMISSION_CATALOG[module]?.includes(action)) {
        errors.push(`unknown action: ${module}.${action}`);
      }
      if (typeof value !== "boolean") {
        errors.push(`non-boolean value: ${module}.${action}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Apply implied permission rules to ensure consistency.
 * - submit → prepare + view
 * - prepare → view
 * - edit/delete → view
 */
export function normalizePermissions(p: PermissionsJSON): PermissionsJSON {
  const out = structuredClone(p);

  const imply = (
    module: string,
    action: string,
    implied: Array<[string, string]>
  ) => {
    if (out?.[module]?.[action]) {
      for (const [m, a] of implied) {
        out[m] ??= {};
        out[m][a] = true;
      }
    }
  };

  // submit => prepare + view
  for (const mod of ["vat", "payroll", "accounts", "secretarial"]) {
    imply(mod, "submit", [
      [mod, "prepare"],
      [mod, "view"],
    ]);
    imply(mod, "prepare", [[mod, "view"]]);
  }

  // edit/delete => view
  for (const mod of [
    "clients",
    "tasks",
    "documents",
    "ledger",
    "billing",
    "integrations",
    "settings",
    "aml",
  ]) {
    imply(mod, "edit", [[mod, "view"]]);
    imply(mod, "delete", [[mod, "view"]]);
  }

  // approve => view
  for (const mod of ["tasks", "aml"]) {
    imply(mod, "approve", [[mod, "view"]]);
  }

  // export => view
  for (const mod of Object.keys(PERMISSION_CATALOG)) {
    if (PERMISSION_CATALOG[mod].includes("export")) {
      imply(mod, "export", [[mod, "view"]]);
    }
  }

  return out;
}

/**
 * Toggle all actions in a module on or off.
 */
export function toggleModule(
  permissions: PermissionsJSON,
  module: string,
  enabled: boolean
): PermissionsJSON {
  const out = structuredClone(permissions);
  const actions = PERMISSION_CATALOG[module];
  if (!actions) return out;
  out[module] = {};
  for (const a of actions) out[module][a] = enabled;
  return out;
}

/**
 * Check if all actions in a module are enabled.
 */
export function isModuleFullyEnabled(
  permissions: PermissionsJSON,
  module: string
): boolean {
  const actions = PERMISSION_CATALOG[module];
  if (!actions) return false;
  return actions.every((a) => permissions?.[module]?.[a] === true);
}
