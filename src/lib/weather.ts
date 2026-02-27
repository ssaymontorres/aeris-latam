/**
 * Weather utilities for Aeris LATAM.
 * Fetches data from aviationweather.gov (ADDS).
 */

export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR" | "N/A";

export interface MetarData {
    icao: string;
    raw: string;
    temp?: number;
    dewp?: number;
    windSpeed?: number;
    windDir?: number;
    visib?: number;
    altim?: number;
    category: FlightCategory;
    timestamp: string;
}

/**
 * Maps aviationweather.gov categories to our FlightCategory type.
 */
function mapCategory(cat: string | undefined): FlightCategory {
    switch (cat?.toUpperCase()) {
        case "VFR": return "VFR";
        case "MVFR": return "MVFR";
        case "IFR": return "IFR";
        case "LIFR": return "LIFR";
        default: return "N/A";
    }
}

/**
 * Fetches METAR for a specific airport.
 */
export async function fetchMetar(icao: string): Promise<MetarData | null> {
    try {
        const url = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`;
        const resp = await fetch(url);
        if (!resp.ok) return null;

        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) return null;

        const report = data[0];
        return {
            icao: report.icaoId,
            raw: report.rawOb,
            temp: report.temp,
            dewp: report.dewp,
            windSpeed: report.wspd,
            windDir: report.wdir,
            visib: report.visib,
            altim: report.altim,
            category: mapCategory(report.flightRules),
            timestamp: report.metarType === "SPECI" ? report.receiptTime : report.reportTime,
        };
    } catch (err) {
        console.error(`[Weather] Failed to fetch METAR for ${icao}:`, err);
        return null;
    }
}

/**
 * Simple heuristic to guess ICAO from IATA for Mercosul/Major airports.
 */
export function iataToIcao(iata: string, country: string): string {
    const code = iata.toUpperCase();
    const countryCode = country.toUpperCase();

    if (countryCode === "BR") return `SB${code === "SDU" ? "RJ" : code === "CGH" ? "SP" : code}`;
    if (countryCode === "AR") return `SA${code}`;
    if (countryCode === "CL") return `SC${code}`;
    if (countryCode === "UY") return `SU${code}`;
    if (countryCode === "PY") return `SG${code}`;

    // Fallback? Some APIs allow IATA, but official ones prefer ICAO.
    return code;
}

/**
 * Returns color associated with a flight category.
 */
export function getCategoryColor(category: FlightCategory): string {
    switch (category) {
        case "VFR": return "#22c55e"; // Green
        case "MVFR": return "#3b82f6"; // Blue
        case "IFR": return "#ef4444"; // Red
        case "LIFR": return "#a855f7"; // Purple
        default: return "#94a3b8"; // Slate
    }
}
