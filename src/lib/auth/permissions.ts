export type ProfileRole = "platform_admin" | "owner" | "staff" | "customer";
export type BusinessRole = "owner" | "staff";

export type Permission =
  | "platform:manage"
  | "business:read"
  | "reservations:manage"
  | "schedule:manage"
  | "business:configure"
  | "business:financials"
  | "business:members";

const permissionsByRole: Record<ProfileRole, readonly Permission[]> = {
  customer: [],
  staff: ["business:read", "reservations:manage", "schedule:manage"],
  owner: [
    "business:read",
    "reservations:manage",
    "schedule:manage",
    "business:configure",
    "business:financials",
    "business:members",
  ],
  platform_admin: ["platform:manage"],
};

export function hasPermission(role: ProfileRole, permission: Permission) {
  return permissionsByRole[role].includes(permission);
}

export function destinationForRole(role: ProfileRole) {
  if (role === "platform_admin") return "/plataforma";
  if (role === "owner" || role === "staff") return "/admin";
  return "/canchas";
}
