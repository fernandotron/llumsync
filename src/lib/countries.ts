export interface CountryConfig {
  code: string;
  name: string;
  currency: string;      // Currency symbol (e.g. "€", "$", "S/.")
  taxName: string;       // Tax label (e.g. "IVA", "IGV", "Tax")
  taxDefault: number;    // Default tax rate (e.g. 21, 16, 19)
  idName: string;        // ID label (e.g. "DNI/NIF", "RFC", "CC/NIT", "RUT", "DNI/RUC", "Cédula/RUC")
  phonePrefix: string;   // Phone prefix (e.g. "+34", "+52", "+57", "+54", "+56", "+51")
}

export const COUNTRIES: Record<string, CountryConfig> = {
  ES: { code: "ES", name: "España", currency: "€", taxName: "IVA", taxDefault: 21, idName: "DNI/NIF", phonePrefix: "+34" },
  MX: { code: "MX", name: "México", currency: "$", taxName: "IVA", taxDefault: 16, idName: "RFC", phonePrefix: "+52" },
  CO: { code: "CO", name: "Colombia", currency: "$", taxName: "IVA", taxDefault: 19, idName: "CC/NIT", phonePrefix: "+57" },
  AR: { code: "AR", name: "Argentina", currency: "$", taxName: "IVA", taxDefault: 21, idName: "DNI/CUIT", phonePrefix: "+54" },
  CL: { code: "CL", name: "Chile", currency: "$", taxName: "IVA", taxDefault: 19, idName: "RUT", phonePrefix: "+56" },
  PE: { code: "PE", name: "Perú", currency: "S/", taxName: "IGV", taxDefault: 18, idName: "DNI/RUC", phonePrefix: "+51" },
  US: { code: "US", name: "Estados Unidos", currency: "$", taxName: "Tax", taxDefault: 0, idName: "SSN/EIN", phonePrefix: "+1" },
  EC: { code: "EC", name: "Ecuador", currency: "$", taxName: "IVA", taxDefault: 15, idName: "Cédula/RUC", phonePrefix: "+593" }
};

export function getCountryConfig(countryCodeOrName?: string): CountryConfig {
  if (!countryCodeOrName) return COUNTRIES.ES;
  
  const clean = countryCodeOrName.trim().toUpperCase();
  if (COUNTRIES[clean]) {
    return COUNTRIES[clean];
  }
  
  // Find by name (case-insensitive and removing accents)
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const cleanNorm = normalize(clean);
  const byName = Object.values(COUNTRIES).find(
    (c) => normalize(c.name) === cleanNorm
  );
  if (byName) return byName;
  
  return COUNTRIES.ES; // Default fallback
}

export function formatCurrency(amount: number | null | undefined, countryCodeOrName?: string): string {
  const val = amount ?? 0;
  const config = getCountryConfig(countryCodeOrName);
  const formatted = val.toFixed(2);
  if (config.currency === "€") {
    return `${formatted} €`;
  }
  return `${config.currency}${formatted}`;
}
