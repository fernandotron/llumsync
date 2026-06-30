export interface UserPermissions {
  agenda?: string[];
  clientes?: string[];
  configuracion?: string[];
  contabilidad?: string[];
  estadisticas?: string[];
  otros?: string[];
}

export function hasPermission(user: any, section: keyof UserPermissions, option: string): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (!user.permissionsJson) return false;
  try {
    const permissions: UserPermissions = typeof user.permissionsJson === "string"
      ? JSON.parse(user.permissionsJson)
      : user.permissionsJson;
    const options = permissions[section];
    if (!options || !Array.isArray(options)) return false;
    
    // Support dynamic clinic names, e.g. "Facturas - Sede Activa"
    if (section === "contabilidad" && option.startsWith("Facturas - ")) {
      // If the option has a specific clinic name, let's search if they have that exact string
      if (options.includes(option)) return true;
      // Or check if they have "Facturas - Todo"
      if (options.includes("Facturas - Todo")) return true;
      return false;
    }
    
    return options.includes(option);
  } catch {
    return false;
  }
}

export function canDeleteAppointment(user: any): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (hasPermission(user, "agenda", "Sólo lectura")) return false;
  if (hasPermission(user, "agenda", "No eliminar citas")) return false;
  return true;
}

export function canCreateOrEditAppointment(user: any): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (hasPermission(user, "agenda", "Sólo lectura")) return false;
  return true;
}
