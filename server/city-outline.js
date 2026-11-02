// src/lib/geocode.ts
function cityKey(city) {
  return city.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// src/lib/cityOutline.ts
function decimate(ring) {
  const round = (point) => [Number(point[0].toFixed(5)), Number(point[1].toFixed(5))];
  const out = [round(ring[0])];
  let last = ring[0];
  for (let index = 1; index < ring.length; index += 1) {
    const point = ring[index];
    const chord = Math.hypot(point[0] - last[0], point[1] - last[1]);
    if (index === ring.length - 1 || chord >= 3e-3) {
      out.push(round(point));
      last = point;
    }
  }
  if (out.length > 1 && (out[0][0] !== out.at(-1)?.[0] || out[0][1] !== out.at(-1)?.[1])) out.push(out[0]);
  return out;
}
function asGeometry(value) {
  if (!value || typeof value !== "object") return null;
  const row = value;
  if (row.type === "FeatureCollection") return asGeometry(row.features?.[0]?.geometry);
  if (row.type === "Feature") return asGeometry(row.geometry);
  if (row.type === "Polygon" || row.type === "MultiPolygon") return row;
  return null;
}
function outerRing(value) {
  const geometry = asGeometry(value);
  if (!geometry) return null;
  const candidates = geometry.type === "Polygon" ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates.map((poly) => poly[0]) : [];
  const ring = [...candidates].filter((item) => Array.isArray(item) && item.length >= 3).sort((a, b) => b.length - a.length)[0];
  if (!ring) return null;
  const shaped = decimate(ring.map(([lng, lat]) => [lng, lat]));
  return shaped.length >= 3 ? shaped : null;
}

// src/lib/cityOutlineLookup.ts
var USER_AGENT = "CRM-Espelho/1.0 (prospecting map; https://crm-new-rust.vercel.app)";
async function cityOutline(city) {
  const key = cityKey(city);
  if (!key) return null;
  const search = new URL("https://nominatim.openstreetmap.org/search");
  search.searchParams.set("q", `${city.trim()}, Brasil`);
  search.searchParams.set("format", "jsonv2");
  search.searchParams.set("polygon_geojson", "1");
  search.searchParams.set("polygon_threshold", "0.001");
  search.searchParams.set("limit", "5");
  search.searchParams.set("addressdetails", "1");
  search.searchParams.set("countrycodes", "br");
  search.searchParams.set("featuretype", "city");
  const response = await fetch(search, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(12e3)
  });
  if (!response.ok) throw new Error("nominatim");
  const rows = await response.json();
  const matches = rows.filter((row) => (row.addresstype === "municipality" || row.addresstype === "city") && row.category !== "place" && cityKey(row.name ?? "") === key && row.geojson);
  const hit = matches.find((row) => row.addresstype === "municipality") ?? matches[0];
  return hit ? outerRing(hit.geojson) : null;
}
export {
  cityOutline
};
