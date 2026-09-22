export type SiteStatus = "ON-AIR" | "AT-RISK" | "OFF-AIR";

export interface Site {
  id: string;
  city: string;
  venue: string;
  x: number;
  y: number;
  status: SiteStatus;
  power: string;
  battery: number;
}

const cities = ["Riyadh", "Jeddah", "Dammam", "Makkah", "Madinah", "Abha"];

export const sites: Site[] = Array.from({ length: 24 }, (_, index) => ({
  id: `COW-ND${String(index + 1).padStart(3, "0")}`,
  city: cities[index % cities.length],
  venue: index % 3 === 0 ? "Celebration Zone" : index % 3 === 1 ? "Public Park" : "Event Corridor",
  x: 12 + ((index * 17) % 76),
  y: 14 + ((index * 23) % 70),
  status: index === 7 ? "OFF-AIR" : index === 3 || index === 15 ? "AT-RISK" : "ON-AIR",
  power: index % 2 ? "SEC + Generator" : "Generator + BBU",
  battery: 78 + ((index * 7) % 43),
}));

export const incidents = [
  { site: "COW-ND004", alarm: "Generator fuel level below threshold", owner: "Field Team", age: "00:18:42", severity: "High" },
  { site: "COW-ND008", alarm: "Site unreachable", owner: "Control Room", age: "00:07:15", severity: "Critical" },
  { site: "COW-ND016", alarm: "Battery backup below 90 minutes", owner: "Power Team", age: "00:04:51", severity: "Medium" },
];
