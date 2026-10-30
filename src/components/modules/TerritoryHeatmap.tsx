import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl, type GeoJSONSource, type Map as MapType } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface HeatZone {
  city: string;
  label: string;
  lng: number;
  lat: number;
  v: number;
  leads: number;
}

const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY ?? '';
const STYLE = CARTO_KEY
  ? {
      version: 8 as const,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        carto: {
          type: 'raster' as const,
          tiles: [`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`],
          tileSize: 256,
          attribution: '© OpenStreetMap © CARTO',
        },
      },
      layers: [{ id: 'carto', type: 'raster' as const, source: 'carto' }],
    }
  : 'https://tiles.openfreemap.org/styles/liberty';

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
    const n = 120 + Math.round(z.v * 180);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = rng() ** 0.45 * 0.006;
      features.push({
        type: 'Feature',
        properties: { weight: 0.85 + z.v * 0.9, city: z.city },
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

const dots = new WeakMap<MapType, Marker[]>();

function redDot() {
  const el = document.createElement('div');
  el.style.width = '72px';
  el.style.height = '72px';
  el.style.borderRadius = '999px';
  el.style.background = '#FF0000';
  el.style.border = '5px solid #FFFFFF';
  el.style.boxShadow = '0 0 0 8px rgba(255,0,0,0.45)';
  return el;
}

function syncDots(map: MapType, zones: HeatZone[]) {
  for (const marker of dots.get(map) ?? []) marker.remove();
  dots.set(
    map,
    withRio(zones).map((z) => new Marker({ element: redDot(), anchor: 'center' }).setLngLat([z.lng, z.lat]).addTo(map)),
  );
}

function addHeat(map: MapType, zones: HeatZone[]) {
  if (map.getLayer('lead-dot')) return;
  const drawn = withRio(zones);
  if (!map.getSource('heat')) map.addSource('heat', { type: 'geojson', data: heatPoints(drawn) });
  if (!map.getSource('labels')) map.addSource('labels', { type: 'geojson', data: labels(drawn) });
  map.addLayer({
    id: 'lead-dot',
    type: 'circle',
    source: 'labels',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 48, 14, 90],
      'circle-color': '#FF0000',
      'circle-opacity': 0.95,
      'circle-stroke-width': 6,
      'circle-stroke-color': '#FFFFFF',
    },
  });
  map.addLayer({
    id: 'lead-heat',
    type: 'heatmap',
    source: 'heat',
    maxzoom: 16,
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': 2.4,
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 40, 12, 90],
      'heatmap-opacity': 0.95,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(220,38,38,0)',
        0.01, '#DC2626',
        1, '#7F1D1D',
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

const RIO: [number, number] = [-43.1729, -22.9068];
const RIO_MARK: HeatZone = { city: 'Rio de Janeiro', label: 'Rio de Janeiro', lng: RIO[0], lat: RIO[1], v: 1, leads: 1 };

function withRio(zones: HeatZone[]) {
  if (zones.some((item) => /rio de janeiro/i.test(item.city))) return zones;
  return [RIO_MARK, ...zones];
}

function paintHeat(map: MapType, zones: HeatZone[]) {
  syncDots(map, zones);
  const heat = map.getSource('heat') as GeoJSONSource | undefined;
  const labelSource = map.getSource('labels') as GeoJSONSource | undefined;
  if (!heat || !labelSource || !map.getLayer('lead-dot')) {
    addHeat(map, zones);
    return;
  }
  const drawn = withRio(zones);
  heat.setData(heatPoints(drawn));
  labelSource.setData(labels(drawn));
}

function createMap(el: HTMLDivElement, opts: { center: [number, number]; zoom: number; pitch: number; bearing: number }, zones: HeatZone[]) {
  const map = new MapLibreMap({
    container: el,
    style: STYLE,
    center: opts.center,
    zoom: opts.zoom,
    pitch: opts.pitch,
    bearing: opts.bearing,
    attributionControl: false,
  });
  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
  syncDots(map, zones);
  map.on('load', () => {
    map.resize();
    paintHeat(map, zones);
  });
  return map;
}

function focusRio(map: MapType, zoom: number, pitch: number) {
  map.easeTo({ center: RIO, zoom, pitch, bearing: 0, duration: 700 });
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

    const overview = createMap(a, { center: RIO, zoom: 11, pitch: 20, bearing: 0 }, zonesRef.current);
    const street = createMap(b, { center: RIO, zoom: 14, pitch: 50, bearing: 18 }, zonesRef.current);
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
    for (const map of [overviewRef.current, streetRef.current]) {
      if (!map) continue;
      const draw = () => paintHeat(map, zones);
      if (map.isStyleLoaded()) draw();
      else map.once('load', draw);
    }
  }, [zones]);

  useEffect(() => {
    const overview = overviewRef.current;
    const street = streetRef.current;
    if (!overview || !street) return;
    const drawn = withRio(zones);
    const rio = drawn.find((item) => /rio de janeiro/i.test(item.city));
    const z = drawn.find((item) => item.city === selected) ?? rio ?? drawn[0];
    if (z) {
      overview.easeTo({ center: [z.lng, z.lat], zoom: 12, pitch: 25, duration: 700 });
      street.easeTo({ center: [z.lng, z.lat], zoom: 15, pitch: 55, bearing: 18, duration: 700 });
      return;
    }
    focusRio(overview, 11, 20);
    focusRio(street, 14, 50);
  }, [selected, zones]);

  useEffect(() => {
    if (q.trim().length < 3) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(`${q}, Brasil`)}&limit=5&lang=pt`;
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
      <style>{'.prospect-map.maplibregl-map{height:400px!important;width:100%!important}.prospect-map .maplibregl-canvas{max-width:none!important;width:100%!important;height:100%!important}'}</style>
      <div className="grid overflow-hidden rounded-xl border border-[#E5E7EB] lg:grid-cols-2">
        <div>
          <div className="border-b border-[#F3F4F6] px-3 py-1.5 text-[11px] text-[#6B7280]">Mapa de calor</div>
          <div ref={overviewEl} className="prospect-map w-full bg-[#E8EEE9]" style={{ height: 400 }} />
        </div>
        <div className="border-t border-[#E5E7EB] lg:border-l lg:border-t-0">
          <div className="border-b border-[#F3F4F6] px-3 py-1.5 text-[11px] text-[#6B7280]">Vista da rua (3D)</div>
          <div ref={streetEl} className="prospect-map w-full bg-[#E8EEE9]" style={{ height: 400 }} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B7280]">
        <span>{CARTO_KEY ? '© OpenStreetMap · © CARTO · clique no bairro' : 'OpenFreeMap · sem chave · clique no bairro'}</span>
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
