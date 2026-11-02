// src/lib/geocode.ts
function cityKey(city) {
  return city.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// src/lib/cityOutline.ts
function cityKey2(city) {
  return city.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
var UF = /* @__PURE__ */ new Set(["ac", "al", "am", "ap", "ba", "ce", "df", "es", "go", "ma", "mg", "ms", "mt", "pa", "pb", "pe", "pi", "pr", "rj", "rn", "ro", "rr", "rs", "sc", "se", "sp", "to"]);
function splitCity(city) {
  const trimmed = city.trim();
  const match = trimmed.match(/^(.*?)(?:\s*[,\-/]\s*)([A-Za-z]{2})$/);
  if (match && UF.has(match[2].toLowerCase())) return { name: match[1].trim(), uf: match[2].toUpperCase() };
  return { name: trimmed, uf: "" };
}
function matchMunicipalities(rows, city) {
  const { name, uf } = splitCity(city);
  const key = cityKey2(name);
  if (!key) return [];
  return rows.filter((row) => cityKey2(row.nome) === key && (!uf || row.uf === uf));
}
function decimate(ring) {
  const step = Math.max(1, Math.ceil(ring.length / 80));
  const out = ring.filter((_, index) => index % step === 0).map(([lng, lat]) => [Number(lng.toFixed(4)), Number(lat.toFixed(4))]);
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
var LIST = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";
var catalog = null;
function municipalities() {
  if (!catalog) {
    catalog = fetch(LIST, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(12e3)
    }).then(async (response) => {
      if (!response.ok) throw new Error("ibge");
      const rows = await response.json();
      return rows.flatMap((row) => {
        const uf = row.microrregiao?.mesorregiao?.UF?.sigla;
        return row.id && row.nome && uf ? [{ id: row.id, nome: row.nome, uf }] : [];
      });
    }).catch((error) => {
      catalog = null;
      throw error;
    });
  }
  return catalog;
}
async function preferredState(city) {
  const search = new URL("https://nominatim.openstreetmap.org/search");
  search.searchParams.set("q", `${city.trim()}, Brasil`);
  search.searchParams.set("format", "jsonv2");
  search.searchParams.set("addressdetails", "1");
  search.searchParams.set("limit", "5");
  search.searchParams.set("countrycodes", "br");
  search.searchParams.set("featuretype", "city");
  const response = await fetch(search, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8e3)
  });
  if (!response.ok) return "";
  const rows = await response.json();
  const key = cityKey(city);
  const hit = rows.find((row) => (row.addresstype === "municipality" || row.addresstype === "city") && cityKey(row.name ?? "") === key);
  return hit?.address?.["ISO3166-2-lvl4"]?.slice(-2).toUpperCase() ?? "";
}
async function cityOutline(city) {
  const matches = matchMunicipalities(await municipalities(), city);
  let municipality = matches.length === 1 ? matches[0] : null;
  if (!municipality && matches.length > 1) {
    const uf = await preferredState(city);
    municipality = matches.find((row) => row.uf === uf) ?? null;
  }
  if (!municipality) return null;
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${municipality.id}?formato=application/vnd.geo+json&qualidade=minima`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(12e3)
  });
  if (!response.ok) throw new Error("malha");
  return outerRing(await response.json());
}
export {
  cityOutline
};
