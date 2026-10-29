import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, type GeoJSONSource, type Map as MapType } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface HeatZone {
  city: string;
  label: string;
  lng: number;
  lat: number;
  v: number;
  leads: number;
}

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const FALLBACK_STYLE = {
  version: 8 as const,
  sources: {
    carto: {
      type: 'raster' as const,
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  layers: [{ id: 'carto', type: 'raster' as const, source: 'carto' }],
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function heatPoints(zones: HeatZone[]) {
  const features: GeoJSON.Feature[] = [];
  zones.forEach((z, zi) => {
    const rng = mulberry32(zi * 9173 + 11);
    const n = 50 + Math.round(z.v * 280);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = rng() ** 0.62 * (0.018 - z.v * 0.008);
      features.push({
        type: 'Feature',
        properties: { weight: 0.35 + z.v * 0.85, city: z.city },
        geometry: { type: 'Point', coordinates: [z.lng + Math.cos(ang) * rad, z.lat + Math.sin(ang) * rad * 0.82] },
      });
    }
  });
  return { type: 'FeatureCollection' as const, features };
}

function labels(zones: HeatZone[]) {
  return {
    type: 'FeatureCollection' as const,
    features: zones.map((z) => ({
      type: 'Feature' as const,
      properties: { label: `${z.label} · ${z.leads}`, city: z.city },
      geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
    })),
  };
}

function nearestCity(zones: HeatZone[], lng: number, lat: number) {
  if (zones.length === 0) return null;
  let best = zones[0];
  let dist = Infinity;
  for (const z of zones) {
    const d = (z.lng - lng) ** 2 + (z.lat - lat) ** 2;
    if (d < dist) {
      dist = d;
      best = z;
    }
  }
  return best;
}

function addHeat(map: MapType, zones: HeatZone[]) {
  if (map.getSource('heat')) return;
  map.addSource('heat', { type: 'geojson', data: heatPoints(zones) });
  map.addSource('labels', { type: 'geojson', data: labels(zones) });
  map.addLayer({
    id: 'lead-heat',
    type: 'heatmap',
    source: 'heat',
    maxzoom: 16,
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 13, 2.6],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 20, 14, 48],
      'heatmap-opacity': 0.92,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.12, '#14532D',
        0.28, '#16A34A',
        0.45, '#4ADE80',
        0.62, '#FACC15',
        0.78, '#F97316',
        1, '#DC2626',
      ],
    },
  });
  map.addLayer({
    id: 'lead-labels',
    type: 'symbol',
    source: 'labels',
    layout: {
      'text-field': ['get', 'label'],
      'text-size': 12,
      'text-offset': [0, 1.1],
      'text-anchor': 'top',
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.4,
    },
  });
}

function createMap(el: HTMLDivElement, opts: { zoom: number; pitch: number; bearing: number }, zones: HeatZone[]) {
  const map = new MapLibreMap({
    container: el,
    style: STYLE,
    center: [-46.64, -23.56],
    zoom: opts.zoom,
    pitch: opts.pitch,
    bearing: opts.bearing,
    attributionControl: false,
  });
  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
  let fallback = false;
  let painted = false;
  const onLoad = () => {
    map.resize();
    addHeat(map, zones);
  };
  map.on('load', onLoad);
  map.on('idle', () => {
    painted = true;
  });
  const useRaster = () => {
    if (fallback) return;
    fallback = true;
    map.setStyle(FALLBACK_STYLE);
    map.once('style.load', onLoad);
  };
  map.on('error', () => {
    if (!painted) useRaster();
  });
  const timer = window.setTimeout(() => {
    if (!painted) useRaster();
  }, 2500);
  map.on('remove', () => window.clearTimeout(timer));
  return map;
}

export function TerritoryHeatmap({
  selected,
  onSelect,
  zones = [],
}: {
  selected: string | null;
  onSelect: (city: string | null) => void;
  zones?: HeatZone[];
}) {
  const overviewEl = useRef<HTMLDivElement>(null);
  const streetEl = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<MapType | null>(null);
  const streetRef = useRef<MapType | null>(null);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selected);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const zonesRef = useRef(zones);
  zonesRef.current = zones;
  onSelectRef.current = onSelect;
  selectedRef.current = selected;

  useEffect(() => {
    const a = overviewEl.current;
    const b = streetEl.current;
    if (!a || !b) return;

    const overview = createMap(a, { zoom: 10.4, pitch: 58, bearing: -28 }, zonesRef.current);
    const street = createMap(b, { zoom: 16.8, pitch: 72, bearing: 24 }, zonesRef.current);
    overviewRef.current = overview;
    streetRef.current = street;

    const pick = (lng: number, lat: number) => {
      const z = nearestCity(zonesRef.current, lng, lat);
      if (!z) return;
      onSelectRef.current(selectedRef.current === z.city ? null : z.city);
    };
    overview.on('click', (e) => pick(e.lngLat.lng, e.lngLat.lat));
    street.on('click', (e) => pick(e.lngLat.lng, e.lngLat.lat));

    const ro = new ResizeObserver(() => {
      overview.resize();
      street.resize();
    });
    ro.observe(a);
    ro.observe(b);

    return () => {
      ro.disconnect();
      overview.remove();
      street.remove();
      overviewRef.current = null;
      streetRef.current = null;
    };
  }, []);

  useEffect(() => {
    const data = heatPoints(zones);
    const labelData = labels(zones);
    for (const map of [overviewRef.current, streetRef.current]) {
      (map?.getSource('heat') as GeoJSONSource | undefined)?.setData(data);
      (map?.getSource('labels') as GeoJSONSource | undefined)?.setData(labelData);
    }
  }, [zones]);

  useEffect(() => {
    const overview = overviewRef.current;
    const street = streetRef.current;
    if (!overview || !street) return;
    const z = zones.find((item) => item.city === selected);
    if (z) {
      overview.easeTo({ center: [z.lng, z.lat], zoom: 13, pitch: 62, duration: 700 });
      street.easeTo({ center: [z.lng, z.lat], zoom: 17.2, pitch: 75, bearing: 32, duration: 700 });
    } else {
      overview.easeTo({ center: [-46.64, -23.56], zoom: 10.4, pitch: 58, bearing: -28, duration: 700 });
    }
  }, [selected, zones]);

  useEffect(() => {
    if (q.trim().length < 3) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=pt&lat=-23.55&lon=-46.63`;
      void fetch(url)
        .then((r) => r.json())
        .then((data: { features?: { properties?: { name?: string; city?: string; street?: string }; geometry: { coordinates: number[] } }[] }) => {
          setHits(
            (data.features ?? []).map((f) => ({
              label: [f.properties?.name, f.properties?.street, f.properties?.city].filter(Boolean).join(' · ') || 'Local',
              lng: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1],
            })),
          );
        })
        .catch(() => setHits([]));
    }, 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const flySearch = (lat: number, lng: number, label: string) => {
    overviewRef.current?.easeTo({ center: [lng, lat], zoom: 14, duration: 800 });
    streetRef.current?.easeTo({ center: [lng, lat], zoom: 17.2, pitch: 75, duration: 800 });
    setQ(label);
    setHits([]);
    const zone = nearestCity(zonesRef.current, lng, lat);
    if (zone) onSelectRef.current(zone.city);
  };

  return (
    <div>
      <div className="relative mb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar endereço ou bairro (Photon / OSM, grátis)"
          className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
        />
        {hits.length > 0 ? (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-sm shadow-sm">
            {hits.map((h) => (
              <li key={`${h.lat}-${h.lng}`}>
                <button type="button" className="w-full px-3 py-2 text-left hover:bg-[#F3F4F6]" onClick={() => flySearch(h.lat, h.lng, h.label)}>
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <style>{'.territory-map .maplibregl-canvas{max-width:none!important}'}</style>
      <div className="territory-map grid overflow-hidden rounded-xl border border-[#E5E7EB] lg:grid-cols-2">
        <div>
          <div className="border-b border-[#F3F4F6] px-3 py-1.5 text-[11px] text-[#6B7280]">Mapa de calor</div>
          <div ref={overviewEl} className="h-[400px] w-full bg-[#E8EEE9]" />
        </div>
        <div className="border-t border-[#E5E7EB] lg:border-l lg:border-t-0">
          <div className="border-b border-[#F3F4F6] px-3 py-1.5 text-[11px] text-[#6B7280]">Vista da rua (3D)</div>
          <div ref={streetEl} className="h-[400px] w-full bg-[#E8EEE9]" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B7280]">
        <span>OpenStreetMap · sem chave · clique no bairro</span>
        <div className="flex items-center gap-1">
          <span>baixa</span>
          <span className="h-2 w-4 rounded-sm bg-[#14532D]" />
          <span className="h-2 w-4 rounded-sm bg-[#16A34A]" />
          <span className="h-2 w-4 rounded-sm bg-[#FACC15]" />
          <span className="h-2 w-4 rounded-sm bg-[#F97316]" />
          <span className="h-2 w-4 rounded-sm bg-[#DC2626]" />
          <span>alta</span>
        </div>
      </div>
    </div>
  );
}

export function heatZoneLabel(city: string) {
  return city;
}
