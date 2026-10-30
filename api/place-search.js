// src/lib/places.ts
function escapeOverpass(text2) {
  return text2.replace(/[.*+?^${}()|[\]\\"]/g, "\\$&");
}
var NICHES = {
  padaria: { key: "shop", value: "bakery" },
  restaurante: { key: "amenity", value: "restaurant" },
  farmacia: { key: "amenity", value: "pharmacy" },
  dentista: { key: "amenity", value: "dentist" },
  academia: { key: "leisure", value: "fitness_centre" },
  mercado: { key: "shop", value: "supermarket" },
  "pet shop": { key: "shop", value: "pet" },
  oficina: { key: "shop", value: "car_repair" },
  salao: { key: "shop", value: "hairdresser" }
};
function nicheKey(niche) {
  return niche.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function nicheTag(niche) {
  return NICHES[nicheKey(niche)] ?? null;
}
function areaClause(area) {
  if (!Number.isFinite(area.lat) || !Number.isFinite(area.lng)) return null;
  if (area.lat < -90 || area.lat > 90 || area.lng < -180 || area.lng > 180) return null;
  const { south, west, north, east } = area;
  const boxed = [south, west, north, east].every((value) => Number.isFinite(value));
  if (boxed && north > south && east > west && north - south <= 0.2 && east - west <= 0.2) {
    return `(${south},${west},${north},${east})`;
  }
  return `(around:12000,${area.lat},${area.lng})`;
}
function placeQuery(niche, area) {
  const raw = niche.trim();
  if (raw.length < 3 || raw.length > 60) return null;
  const clause = areaClause(area);
  if (!clause) return null;
  const tag = nicheTag(raw);
  const filter = tag ? `["${tag.key}"="${tag.value}"]` : `["name"~"${escapeOverpass(raw)}",i]`;
  return `[out:json][timeout:12];
nwr${filter}${clause};
out center 15;`;
}
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
function coord(value) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}
function cityName(value) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function take(hits, fallbackCity) {
  const seen = /* @__PURE__ */ new Set();
  const unique = hits.filter((hit) => {
    const key = `${cityName(hit.name)}|${hit.lat.toFixed(4)}|${hit.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const wanted = cityName(fallbackCity);
  const same = unique.filter((hit) => cityName(hit.city) === wanted);
  return (same.length > 0 ? same : unique).slice(0, 15);
}
function parseOverpass(data, fallbackCity) {
  const elements = data?.elements;
  if (!Array.isArray(elements)) return [];
  const hits = [];
  for (const element of elements) {
    const row = element;
    const tags = row.tags ?? {};
    const name = text(tags.name);
    const lat = coord(row.lat) ?? coord(row.center?.lat);
    const lng = coord(row.lon) ?? coord(row.center?.lon);
    if (!name || lat === null || lng === null) continue;
    const street = [text(tags["addr:street"]), text(tags["addr:housenumber"])].filter(Boolean).join(", ");
    hits.push({
      name,
      city: text(tags["addr:city"]) || fallbackCity.trim(),
      address: street,
      phone: text(tags.phone) || text(tags["contact:phone"]) || text(tags["contact:mobile"]),
      lat,
      lng
    });
  }
  return take(hits, fallbackCity);
}
function parseNominatim(data, fallbackCity) {
  if (!Array.isArray(data)) return [];
  const hits = [];
  for (const element of data) {
    const row = element;
    const address = row.address ?? {};
    const name = text(row.name) || text(address.amenity);
    const lat = coord(row.lat);
    const lng = coord(row.lon);
    if (!name || lat === null || lng === null) continue;
    const tags = row.extratags ?? {};
    hits.push({
      name,
      city: text(address.city) || text(address.town) || text(address.municipality) || fallbackCity.trim(),
      address: [text(address.road), text(address.house_number)].filter(Boolean).join(", "),
      phone: text(tags.phone) || text(tags["contact:phone"]),
      lat,
      lng
    });
  }
  return take(hits, fallbackCity);
}
var SKIP_KEYS = /* @__PURE__ */ new Set(["highway", "boundary", "place", "waterway", "natural", "landuse"]);
function parsePhoton(data, fallbackCity) {
  const features = data?.features;
  if (!Array.isArray(features)) return [];
  const hits = [];
  for (const feature of features) {
    const row = feature;
    const props = row.properties ?? {};
    if (SKIP_KEYS.has(text(props.osm_key))) continue;
    const name = text(props.name);
    const coordinates = row.geometry?.coordinates ?? [];
    const lng = coord(coordinates[0]);
    const lat = coord(coordinates[1]);
    if (!name || lat === null || lng === null) continue;
    hits.push({
      name,
      city: text(props.city) || fallbackCity.trim(),
      address: [text(props.street), text(props.housenumber)].filter(Boolean).join(", "),
      phone: text(props.phone) || text(props["contact:phone"]),
      lat,
      lng
    });
  }
  return take(hits, fallbackCity);
}

// src/lib/placeLookup.ts
var OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
var USER_AGENT = "CRM-Espelho/1.0 (prospecting map; https://crm-new-rust.vercel.app)";
async function overpassPlaces(query, city, signal) {
  for (const url of OVERPASS) {
    if (signal.aborted) return [];
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": USER_AGENT
        },
        body: `data=${encodeURIComponent(query)}`,
        signal
      });
      if (!response.ok) continue;
      const places = parseOverpass(await response.json(), city);
      if (places.length > 0) return places;
    } catch {
      continue;
    }
  }
  return [];
}
async function photonPlaces(niche, city, area) {
  const search = new URL("https://photon.komoot.io/api/");
  search.searchParams.set("q", niche.trim());
  search.searchParams.set("lat", String(area.lat));
  search.searchParams.set("lon", String(area.lng));
  search.searchParams.set("limit", "15");
  const tag = nicheTag(niche);
  if (tag) search.searchParams.set("osm_tag", `${tag.key}:${tag.value}`);
  const response = await fetch(search, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8e3)
  });
  if (!response.ok) throw new Error("A busca de empresas n\xE3o respondeu.");
  return parsePhoton(await response.json(), city);
}
async function nominatimPlaces(name, city) {
  const search = new URL("https://nominatim.openstreetmap.org/search");
  search.searchParams.set("q", `${name.trim()}, ${city.trim()}, Brasil`);
  search.searchParams.set("format", "jsonv2");
  search.searchParams.set("limit", "15");
  search.searchParams.set("addressdetails", "1");
  search.searchParams.set("extratags", "1");
  search.searchParams.set("countrycodes", "br");
  const response = await fetch(search, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8e3)
  });
  if (!response.ok) throw new Error("A busca de empresas n\xE3o respondeu.");
  return parseNominatim(await response.json(), city);
}
function pickList(overpass, listed, named) {
  if (overpass.length >= 2) return overpass;
  if (listed.length >= 2) return listed;
  if (named.length >= 2) return named;
  return overpass.length ? overpass : listed.length ? listed : named;
}
async function findPlaces(niche, city, area) {
  const query = placeQuery(niche, area);
  if (!query) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5e3);
  const overpass = overpassPlaces(query, city, controller.signal);
  let listed = [];
  try {
    listed = await photonPlaces(niche, city, area);
  } catch {
    listed = [];
  }
  const fromOverpass = await Promise.race([
    overpass,
    new Promise((resolve) => setTimeout(() => resolve([]), 1500))
  ]);
  clearTimeout(timer);
  controller.abort();
  if (fromOverpass.length >= 2 || listed.length >= 2) return pickList(fromOverpass, listed, []);
  try {
    const named = await nominatimPlaces(niche, city);
    return pickList(fromOverpass, listed, named);
  } catch (error) {
    if (fromOverpass.length > 0 || listed.length > 0) return pickList(fromOverpass, listed, []);
    throw error;
  }
}
export {
  findPlaces,
  nicheTag
};
