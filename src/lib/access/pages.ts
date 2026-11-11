import type { Role } from "./permissions";

/** Which roles each signed-in page is for, following the permission table in docs/REQUIREMENTS.md §7. */
export const PAGE_ROLES = {
  "/dashboard": ["guard", "admin"],
  "/gate": ["guard"],
  "/passes": ["resident", "guard", "admin"],
  "/log": ["resident", "admin"],
  "/profile": ["resident", "guard", "admin"],
} as const satisfies Record<string, readonly Role[]>;

export type AppPage = keyof typeof PAGE_ROLES;

export const pageAllows = (page: AppPage, role: Role) =>
  (PAGE_ROLES[page] as readonly Role[]).includes(role);

/** Where a person lands after signing in: the page their job starts on. */
export function homeFor(role: Role): AppPage {
  if (role === "guard") return "/gate";
  if (role === "admin") return "/dashboard";
  return "/passes";
}

export const ROLE_NAMES: Record<Role, string> = {
  resident: "Resident",
  guard: "Guard",
  admin: "Estate admin",
};
