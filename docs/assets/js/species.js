// docs/assets/js/species.js
window.BirdHub = window.BirdHub || {};
(function(){
  const cacheKey = (name) => `bh_taxon_${name.toLowerCase()}`;

  // Map iNat / IUCN-ish strings to a compact status code + nice label
  function normalizeStatus(taxon){
    const s = (taxon && taxon.conservation_status) || null;
    if (!s) return { code: "LC", label: "Least Concern" };

    // Try iucn code first, else the status_name
    const raw = String(s.iucn || s.status || s.status_name || "").toLowerCase();

    if (/cr|critically/.test(raw)) return { code: "CR", label: "Critically Endangered" };
    if (/en|endangered/.test(raw)) return { code: "EN", label: "Endangered" };
    if (/vu|vulnerable/.test(raw)) return { code: "VU", label: "Vulnerable" };
    if (/nt|near/.test(raw))      return { code: "NT", label: "Near Threatened" };
    if (/dd|deficient/.test(raw)) return { code: "DD", label: "Data Deficient" };
    if (/ex|extinct/.test(raw))   return { code: "EX", label: "Extinct" };
    return { code: "LC", label: "Least Concern" };
  }

async function enrichSpecies(commonName) {
  try {
    if (!commonName) return null;

    const key = cacheKey(commonName);
    const cached = localStorage.getItem(key);
    if (cached) { try { return JSON.parse(cached); } catch(_){} }

    const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(commonName)}&per_page=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const t = data.results && data.results[0];
    if (!t) return null;

    const info = {
      scientific_name: t.name,
      preferred_common_name: t.preferred_common_name || commonName,
      rank: t.rank,
      taxon_id: t.id,
      default_image: t.default_photo ? (t.default_photo.photo_url || t.default_photo.square_url) : null,
      ancestry: t.ancestors ? t.ancestors.map(a => ({ rank: a.rank, name: a.name })) : []
    };
    localStorage.setItem(key, JSON.stringify(info));
    return info;
  } catch (e) {
    console.warn('enrichSpecies hard-failed:', e);
    return null; // <- never throw
  }
}


  // async function enrichSpecies(commonName) {
  //   try {
  //     if (!commonName) return null;
  //     const key = cacheKey(commonName);
  //     const cached = localStorage.getItem(key);
  //     if (cached) { try { return JSON.parse(cached); } catch {} }

  //     // First: find the best matching taxon (only birds)
  //     const acUrl = `https://api.inaturalist.org/v1/taxa/autocomplete` +
  //       `?q=${encodeURIComponent(commonName)}` +
  //       `&per_page=1&iconic_taxa=Aves&is_active=true`;
  //     const acRes = await fetch(acUrl);
  //     if (!acRes.ok) return null;
  //     const ac = await acRes.json();
  //     const hit = ac.results && ac.results[0];
  //     if (!hit) return null;

  //     // Second: pull full details for order/family/status
  //     const taxUrl = `https://api.inaturalist.org/v1/taxa/${hit.id}`;
  //     const taxRes = await fetch(taxUrl);
  //     if (!taxRes.ok) return null;
  //     const taxData = await taxRes.json();
  //     const taxon = taxData.results && taxData.results[0];
  //     if (!taxon) return null;

  //     const anc = Array.isArray(taxon.ancestors) ? taxon.ancestors : [];
  //     const order  = anc.find(a => a.rank === 'order')  || {};
  //     const family = anc.find(a => a.rank === 'family') || {};
  //     const status = normalizeStatus(taxon);

  //     const info = {
  //       taxon_id: taxon.id,
  //       url: `https://www.inaturalist.org/taxa/${taxon.id}`,
  //       scientific_name: taxon.name,
  //       preferred_common_name: taxon.preferred_common_name || commonName,
  //       rank: taxon.rank,
  //       default_image: (taxon.default_photo && taxon.default_photo.square_url) || (hit.default_photo && hit.default_photo.square_url) || null,
  //       order:  { scientific: order.name || '',  common: order.preferred_common_name || '' },
  //       family: { scientific: family.name || '', common: family.preferred_common_name || '' },
  //       status  // { code, label }
  //     };

  //     localStorage.setItem(key, JSON.stringify(info));
  //     return info;
  //   } catch (e) {
  //     console.warn('enrichSpecies failed:', e);
  //     return null;
  //   }
  // }

  async function selectSexImage(taxonId, sex) {
    return { selected: null, male: null, female: null, default: null };
  }

  window.BirdHub.species = { enrichSpecies, selectSexImage };
})();
