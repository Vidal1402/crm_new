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
function leadCount(value) {
  if (value === void 0 || value === null || value === "") return 10;
  const number = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(number)) return 10;
  return Math.min(30, Math.max(1, Math.trunc(number)));
}
function placeQuery(niche, area, limit = 10) {
  const raw = niche.trim();
  if (raw.length < 3 || raw.length > 60) return null;
  const clause = areaClause(area);
  if (!clause) return null;
  const tag = nicheTag(raw);
  const filter = tag ? `["${tag.key}"="${tag.value}"]` : `["name"~"${escapeOverpass(raw)}",i]`;
  return `[out:json][timeout:12];
nwr${filter}${clause};
out center ${leadCount(limit)};`;
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
function emailOf(value) {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function profileUrl(value, host) {
  const raw = value.trim();
  if (!raw) return "";
  const linked = /^https?:\/\//i.test(raw) ? raw : raw.includes(`${host}/`) ? `https://${raw.replace(/^\/\//, "")}` : "";
  if (linked) {
    try {
      const url = new URL(linked);
      const name = url.hostname.replace(/^www\./, "");
      if (name !== host && !name.endsWith(`.${host}`)) return "";
      return url.toString();
    } catch {
      return "";
    }
  }
  if (host !== "instagram.com") return "";
  const handle = raw.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return "";
  return `https://www.instagram.com/${handle}`;
}
function publicHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length === 4 && parts.every((part) => part >= 0 && part <= 255)) {
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31) return false;
  }
  return true;
}
function siteOf(value) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!url.hostname.includes(".") || !publicHost(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}
function fillContacts(hit, tags) {
  const extra = contactFields(tags);
  return {
    ...hit,
    phone: hit.phone || extra.phone,
    email: hit.email || extra.email,
    instagram: hit.instagram || extra.instagram,
    linkedin: hit.linkedin || extra.linkedin,
    website: hit.website || extra.website
  };
}
function contactFields(tags) {
  return {
    phone: text(tags.phone) || text(tags["contact:phone"]) || text(tags["contact:mobile"]),
    email: emailOf(text(tags.email) || text(tags["contact:email"])),
    instagram: profileUrl(text(tags["contact:instagram"]) || text(tags.instagram), "instagram.com"),
    linkedin: profileUrl(text(tags["contact:linkedin"]) || text(tags.linkedin), "linkedin.com"),
    website: siteOf(text(tags.website) || text(tags["contact:website"]))
  };
}
function take(hits, fallbackCity, limit) {
  const seen = /* @__PURE__ */ new Set();
  const unique = hits.filter((hit) => {
    const key = `${cityName(hit.name)}|${hit.lat.toFixed(4)}|${hit.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const wanted = cityName(fallbackCity);
  const same = unique.filter((hit) => cityName(hit.city) === wanted);
  return (same.length > 0 ? same : unique).slice(0, leadCount(limit));
}
function readHomepageLinks(html) {
  const mailto = html.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const instagram = html.match(/https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|reel\/|reels\/|explore\/|stories\/)[A-Za-z0-9._]+/i);
  const linkedin = html.match(/https?:\/\/(?:[\w.-]+\.)?linkedin\.com\/(?:company|in|school)\/[A-Za-z0-9._%-]+/i);
  return {
    email: mailto ? emailOf(mailto[1]) : "",
    instagram: instagram ? profileUrl(instagram[0], "instagram.com") : "",
    linkedin: linkedin ? profileUrl(linkedin[0], "linkedin.com") : ""
  };
}
function parseOverpass(data, fallbackCity, limit = 10) {
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
      ...contactFields(tags),
      lat,
      lng
    });
  }
  return take(hits, fallbackCity, limit);
}
function parseNominatim(data, fallbackCity, limit = 10) {
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
      ...contactFields(tags),
      lat,
      lng
    });
  }
  return take(hits, fallbackCity, limit);
}
var SKIP_KEYS = /* @__PURE__ */ new Set(["highway", "boundary", "place", "waterway", "natural", "landuse"]);
function parsePhoton(data, fallbackCity, limit = 10) {
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
      ...contactFields(props),
      lat,
      lng,
      osmType: text(props.osm_type).slice(0, 1).toUpperCase(),
      osmId: typeof props.osm_id === "number" ? String(props.osm_id) : text(props.osm_id)
    });
  }
  return take(hits, fallbackCity, limit);
}

// src/lib/placeLookup.ts
var OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
var USER_AGENT = "CRM-Espelho/1.0 (prospecting map; https://crm-new-rust.vercel.app)";
async function overpassPlaces(query, city, limit, signal) {
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
      const places = parseOverpass(await response.json(), city, limit);
      if (places.length > 0) return places;
    } catch {
      continue;
    }
  }
  return [];
}
async function photonPlaces(niche, city, area, limit) {
  const search = new URL("https://photon.komoot.io/api/");
  search.searchParams.set("q", niche.trim());
  search.searchParams.set("lat", String(area.lat));
  search.searchParams.set("lon", String(area.lng));
  search.searchParams.set("limit", String(limit));
  const tag = nicheTag(niche);
  if (tag) search.searchParams.set("osm_tag", `${tag.key}:${tag.value}`);
  const response = await fetch(search, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8e3)
  });
  if (!response.ok) throw new Error("A busca de empresas n\xE3o respondeu.");
  return parsePhoton(await response.json(), city, limit);
}
async function nominatimPlaces(name, city, limit) {
  const search = new URL("https://nominatim.openstreetmap.org/search");
  search.searchParams.set("q", `${name.trim()}, ${city.trim()}, Brasil`);
  search.searchParams.set("format", "jsonv2");
  search.searchParams.set("limit", String(limit));
  search.searchParams.set("addressdetails", "1");
  search.searchParams.set("extratags", "1");
  search.searchParams.set("countrycodes", "br");
  const response = await fetch(search, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8e3)
  });
  if (!response.ok) throw new Error("A busca de empresas n\xE3o respondeu.");
  return parseNominatim(await response.json(), city, limit);
}
function osmCode(type) {
  const value = type.toLowerCase();
  if (value === "n" || value === "node") return "N";
  if (value === "w" || value === "way") return "W";
  if (value === "r" || value === "relation") return "R";
  return "";
}
async function attachOsmTags(hits) {
  const ids = hits.flatMap((hit) => {
    const code = osmCode(hit.osmType ?? "");
    return code && hit.osmId ? [`${code}${hit.osmId}`] : [];
  });
  if (ids.length === 0) return hits;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=${ids.join(",")}&format=jsonv2&extratags=1`, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8e3)
    });
    if (!response.ok) return hits;
    const rows = await response.json();
    const byId = new Map(rows.map((row) => [`${osmCode(String(row.osm_type ?? ""))}${row.osm_id}`, row.extratags ?? {}]));
    return hits.map((hit) => {
      const tags = byId.get(`${osmCode(hit.osmType ?? "")}${hit.osmId}`);
      return tags ? fillContacts(hit, tags) : hit;
    });
  } catch {
    return hits;
  }
}
async function readHomepage(hit) {
  if (hit.email && hit.instagram && hit.linkedin || !hit.website) return hit;
  try {
    const response = await fetch(hit.website, {
      headers: { Accept: "text/html", "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(4e3)
    });
    if (!response.ok) return hit;
    const html = (await response.text()).slice(0, 2e5);
    const found = readHomepageLinks(html);
    return {
      ...hit,
      email: hit.email || found.email,
      instagram: hit.instagram || found.instagram,
      linkedin: hit.linkedin || found.linkedin
    };
  } catch {
    return hit;
  }
}
function pickList(overpass, listed, named) {
  if (overpass.length >= 2) return overpass;
  if (listed.length >= 2) return listed;
  if (named.length >= 2) return named;
  return overpass.length ? overpass : listed.length ? listed : named;
}
async function findPlaces(niche, city, area, limit = 10) {
  const count = leadCount(limit);
  const query = placeQuery(niche, area, count);
  if (!query) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5e3);
  const overpass = overpassPlaces(query, city, count, controller.signal);
  let listed = [];
  try {
    listed = await photonPlaces(niche, city, area, count);
  } catch {
    listed = [];
  }
  const fromOverpass = await Promise.race([
    overpass,
    new Promise((resolve) => setTimeout(() => resolve([]), 1500))
  ]);
  clearTimeout(timer);
  controller.abort();
  let chosen = [];
  if (fromOverpass.length >= 2 || listed.length >= 2) chosen = pickList(fromOverpass, listed, []);
  else {
    try {
      const named = await nominatimPlaces(niche, city, count);
      chosen = pickList(fromOverpass, listed, named);
    } catch (error) {
      if (fromOverpass.length > 0 || listed.length > 0) chosen = pickList(fromOverpass, listed, []);
      else throw error;
    }
  }
  const tagged = await attachOsmTags(chosen.slice(0, count));
  return Promise.all(tagged.map((hit) => readHomepage(hit)));
}
export {
  findPlaces,
  nicheTag
};
