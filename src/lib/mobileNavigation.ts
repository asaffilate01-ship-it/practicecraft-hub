import { canUseModule, type StaffRole } from "@/practice/auth/staffSession";

export type MobileNavId = "home" | "clients" | "tasks" | "review" | "accounts";
export type MobileNavItem = {
  id: MobileNavId;
  label: string;
  to: string;
  permission?: readonly [string, string];
  featureKey?: string;
  moduleKey?: string;
};

const destinations: readonly MobileNavItem[] = [
  { id: "home", label: "Home", to: "/" },
  { id: "clients", label: "Clients", to: "/clients", permission: ["clients", "view"], featureKey: "clients", moduleKey: "clients" },
  { id: "tasks", label: "Tasks", to: "/tasks", permission: ["tasks", "view"], featureKey: "tasks", moduleKey: "tasks" },
  { id: "review", label: "Review", to: "/review-centre", permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
  { id: "accounts", label: "Accounts", to: "/accounts", permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
];

/** Mobile shortcuts apply the same permission, entitlement and role gates as desktop navigation. */
export function visibleMobileNavigation({ can, features, role }: {
  can: (module: string, action: string) => boolean;
  features: Readonly<Record<string, boolean>>;
  role: StaffRole;
}): MobileNavItem[] {
  return destinations.filter(item =>
    (!item.permission || can(item.permission[0], item.permission[1])) &&
    (!item.featureKey || features[item.featureKey] === true) &&
    (!item.moduleKey || canUseModule(role, item.moduleKey)),
  );
}
