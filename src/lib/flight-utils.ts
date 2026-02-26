const MAX_ALTITUDE_METERS = 13000;

type RGB = [number, number, number];

const ALTITUDE_STOPS: { t: number; color: RGB }[] = [
  { t: 0.0, color: [72, 210, 160] },
  { t: 0.1, color: [100, 200, 120] },
  { t: 0.2, color: [160, 195, 80] },
  { t: 0.3, color: [210, 180, 60] },
  { t: 0.4, color: [235, 150, 60] },
  { t: 0.52, color: [240, 110, 80] },
  { t: 0.64, color: [220, 85, 130] },
  { t: 0.76, color: [180, 90, 190] },
  { t: 0.88, color: [120, 110, 220] },
  { t: 1.0, color: [100, 170, 240] },
];

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function altitudeToColor(
  altitude: number | null,
): [number, number, number, number] {
  if (altitude === null || !Number.isFinite(altitude)) return [100, 100, 100, 200];

  const normalized = Math.min(Math.max(altitude / MAX_ALTITUDE_METERS, 0), 1);
  const t = Math.pow(normalized, 0.4);

  for (let i = 0; i < ALTITUDE_STOPS.length - 1; i++) {
    const a = ALTITUDE_STOPS[i];
    const b = ALTITUDE_STOPS[i + 1];
    if (t >= a.t && t <= b.t) {
      const segT = (t - a.t) / (b.t - a.t);
      const [r, g, bl] = lerpColor(a.color, b.color, segT);
      return [r, g, bl, 210];
    }
  }

  const last = ALTITUDE_STOPS[ALTITUDE_STOPS.length - 1];
  return [last.color[0], last.color[1], last.color[2], 210];
}

export function altitudeToElevation(altitude: number | null): number {
  if (altitude === null || !Number.isFinite(altitude)) return 0;
  return Math.max(altitude * 5, 200);
}

export function metersToFeet(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return "—";
  return `${Math.round(meters * 3.28084).toLocaleString()} ft`;
}

export function msToKnots(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  return `${Math.round(ms * 1.94384)} kts`;
}

export function formatCallsign(callsign: string | null): string {
  if (!callsign) return "N/A";
  return callsign.trim().toUpperCase();
}

export function headingToCardinal(degrees: number | null): string {
  if (degrees === null || !Number.isFinite(degrees)) return "—";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = ((Math.round(degrees / 45) % 8) + 8) % 8;
  return directions[index];
}

/**
 * Returns true for ADS-B emitter category A7 (rotorcraft / helicopters),
 * or if the callsign/registration matches known Brazilian police/military
 * helicopter patterns. Used as a fallback when the API omits the category.
 */
export function isRotorcraft(
  category: number | null,
  callsign?: string | null
): boolean {
  if (category === 7) return true;

  if (callsign) {
    const clean = callsign.trim().toUpperCase();

    // Brazilian state police and military helicopter callsigns:
    // AGUIA (SP), FALCAO (MG), GAVIAO (RS), HARPIA (ES/RJ),
    // GRIFO (SC), CONDOR (CE/BA), PELICANO (PE/AM), FÊNIX/FENIX (DF)
    const knownCallsigns =
      /^(AGUIA|FALCAO|GAVIAO|HARPIA|GRIFO|CONDOR|PELICANO|FENIX|FENIX|ARARA|GARUDA)\d*/i;

    // Brazilian civil helicopter registration blocks:
    // PS-H/J/L/M/O/P/U/X, PP-E/G/H/J/L/M/P/U/X, PR-G/H/J/L/M/O/U, PT-H/Y
    const civilReg =
      /^P[PRST]-[EGHJLMNOPUXYZ]/i;

    // Emergency / service callsigns
    const serviceCallsign =
      /^(RESGATE|BOMBEIRO|UTI\s?AER|SAMU\s?AER)/i;

    if (knownCallsigns.test(clean) || civilReg.test(clean) || serviceCallsign.test(clean)) {
      return true;
    }
  }

  return false;
}
