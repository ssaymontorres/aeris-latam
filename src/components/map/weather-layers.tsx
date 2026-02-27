"use client";

import { useEffect, useState } from "react";
import { useMap } from "./map";

const SOURCE_ID = "weather-radar-source";
const LAYER_ID = "weather-radar-layer";

export function WeatherLayers({ showRadar }: { showRadar: boolean }) {
    const { map, isLoaded } = useMap();
    const [tileUrl, setTileUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!showRadar) return;

        async function fetchRadarInfo() {
            try {
                const resp = await fetch("https://api.rainviewer.com/public/weather-maps.json");
                const data = await resp.json();

                if (data.radar?.past?.length > 0) {
                    const latest = data.radar.past[data.radar.past.length - 1];
                    const host = data.host || "https://tilecache.rainviewer.com";
                    // Using 256px tiles, original colors (1), and smooth (1), snow (1) options
                    setTileUrl(`${host}${latest.path}/256/{z}/{x}/{y}/1/1_1.png`);
                }
            } catch (err) {
                console.error("[Weather] Failed to fetch radar info:", err);
            }
        }

        fetchRadarInfo();
        const interval = setInterval(fetchRadarInfo, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [showRadar]);

    useEffect(() => {
        if (!map || !isLoaded) return;

        const m = map;

        function updateLayer() {
            if (!showRadar || !tileUrl) {
                if (m.getLayer(LAYER_ID)) m.removeLayer(LAYER_ID);
                if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID);
                return;
            }

            if (!m.getSource(SOURCE_ID)) {
                m.addSource(SOURCE_ID, {
                    type: "raster",
                    tiles: [tileUrl],
                    tileSize: 256,
                });
            } else {
                // To refresh tiles if URL changed
                const source = m.getSource(SOURCE_ID) as any;
                if (source.tiles && source.tiles[0] !== tileUrl) {
                    m.removeLayer(LAYER_ID);
                    m.removeSource(SOURCE_ID);
                    m.addSource(SOURCE_ID, {
                        type: "raster",
                        tiles: [tileUrl],
                        tileSize: 256,
                    });
                }
            }

            if (!m.getLayer(LAYER_ID)) {
                // Find a layer to insert underneath, or just add it
                // We want it above terrain/land but below aircraft and labels
                const layers = m.getStyle().layers;
                let beforeId: string | undefined;

                // Try to find a good injection point (e.g., before labels)
                if (layers) {
                    for (const l of layers) {
                        if (l.type === "symbol" || l.id.includes("label") || l.id.includes("airport")) {
                            beforeId = l.id;
                            break;
                        }
                    }
                }

                m.addLayer({
                    id: LAYER_ID,
                    type: "raster",
                    source: SOURCE_ID,
                    paint: {
                        "raster-opacity": 0.65,
                        "raster-fade-duration": 300,
                    },
                }, beforeId);
            }
        }

        updateLayer();
        m.on("style.load", updateLayer);

        return () => {
            m.off("style.load", updateLayer);
            if (m.getLayer(LAYER_ID)) m.removeLayer(LAYER_ID);
            if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID);
        };
    }, [map, isLoaded, showRadar, tileUrl]);

    return null;
}
