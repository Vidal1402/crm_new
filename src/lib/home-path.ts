import { appFlavor, homePathFor } from './app-flavor';

export function homePath(isSuperAdmin: boolean): string {
  return homePathFor(appFlavor(), isSuperAdmin);
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'super_admin';
}