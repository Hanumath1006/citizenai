import { Cloud, CloudRain, CloudSnow, Sun, CloudSun } from "lucide-react";
import type { WeatherSummary } from "@/lib/types";

function iconFor(condition: string | null) {
  const c = (condition ?? "").toLowerCase();
  if (c.includes("rain") || c.includes("drizzle")) return CloudRain;
  if (c.includes("snow")) return CloudSnow;
  if (c.includes("cloud")) return c.includes("few") ? CloudSun : Cloud;
  if (c.includes("clear") || c.includes("sun")) return Sun;
  return CloudSun;
}

export function WeatherBadge({ weather }: { weather: WeatherSummary }) {
  if (!weather.isAvailable) return null;
  const Icon = iconFor(weather.condition);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink-soft">
      <Icon className="h-4 w-4 text-accent" />
      {weather.condition}
      {weather.tempF != null && (
        <span className="font-semibold">{weather.tempF}°</span>
      )}
    </span>
  );
}
