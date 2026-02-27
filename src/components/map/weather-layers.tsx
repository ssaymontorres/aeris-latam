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
                    // Using 256px tiles, Universal Blue scheme (4), smooth (1), snow (1) options
                    setTileUrl(`${host}${latest.path}/256/{z}/{x}/{y}/4/1_1.png`);
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
            if (!tileUrl) return;

            if (!m.getSource(SOURCE_ID)) {
                m.addSource(SOURCE_ID, {
                    type: "raster",
                    tiles: [tileUrl],
                    tileSize: 256,
                });
            }

            if (!m.getLayer(LAYER_ID)) {
                const layers = m.getStyle().layers;
                let beforeId: string | undefined;

                if (layers) {
                    for (const l of layers) {
                        if (l.type === "symbol" || l.id.includes("label") || l.id.includes("airport") || l.id.includes("aircraft")) {
                            beforeId = l.id;
                            break;
                        }
                    }
                }

                m.addLayer({
                    id: LAYER_ID,
                    type: "raster",
                    source: SOURCE_ID,
                    layout: {
                        visibility: showRadar ? "visible" : "none",
                    },
                    paint: {
                        "raster-opacity": 0.55, // Slightly lower for more "glass" look
                        "raster-fade-duration": 500,
                        "raster-brightness-max": 0.8,
                        "raster-contrast": 0.1,
                    },
                }, beforeId);
            } else {
                m.setLayoutProperty(LAYER_ID, "visibility", showRadar ? "visible" : "none");

                // Update tiles if URL changed
                const source = m.getSource(SOURCE_ID) as any;
                if (source && source.tiles && source.tiles[0] !== tileUrl) {
                    const style = m.getStyle();
                    if (style.sources[SOURCE_ID]) {
                        (m.getSource(SOURCE_ID) as any).setTiles([tileUrl]);
                    }
                }
            }
        }

        updateLayer();
        m.on("style.load", updateLayer);

        return () => {
            m.off("style.load", updateLayer);
            // We keep the source/layer for stability unless unmounting
        };
    }, [map, isLoaded, showRadar, tileUrl]);

    return null;
}
