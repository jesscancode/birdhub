
window.BirdHub = window.BirdHub || {};
(function(){
  const cacheKey = (name) => `bh_taxon_${name.toLowerCase()}`;

  async function enrichSpecies(commonName) {
    if (!commonName) return null;
    const key = cacheKey(commonName);
    const cached = localStorage.getItem(key);
    if (cached) { try { return JSON.parse(cached); } catch {} }
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
      default_image: t.default_photo ? t.default_photo.square_url : null,
      ancestry: t.ancestors ? t.ancestors.map(a => ({ rank: a.rank, name: a.name })) : []
    };
    localStorage.setItem(key, JSON.stringify(info));
    return info;
  }

  async function selectSexImage(taxonId, sex) {
    return { selected: null, male: null, female: null, default: null };
  }

  window.BirdHub.species = { enrichSpecies, selectSexImage };
})();
