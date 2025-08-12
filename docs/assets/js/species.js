// docs/assets/js/species.js
window.BirdHub = window.BirdHub || {};
(function () {
  const CACHE_PREFIX = 'bh_taxon_';
  const cacheKey = (name) => `${CACHE_PREFIX}${(name || '').toLowerCase()}`;

  // pick a small-ish image url
  function pickImage(photo) {
    if (!photo) return null;
    return photo.small_url || photo.square_url || photo.medium_url || photo.url || null;
  }

  function extractOrder(ancestors) {
    if (!Array.isArray(ancestors)) return null;
    // iNat uses rank === "order" for bird orders
    const ord = ancestors.find(a => a.rank === 'order');
    if (!ord) return null;
    return {
      scientific: ord.name || '',
      common: ord.preferred_common_name || ord.english_common_name || ''
    };
  }

  async function enrichSpecies(commonName) {
    try {
      if (!commonName) return null;

      // Try cache first, but upgrade if it doesn't have 'order'
      const key = cacheKey(commonName);
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const obj = JSON.parse(cached);
          if (obj && obj.order) return obj; // already upgraded & complete
          // else fall through to refetch and overwrite
        } catch {}
      }

      // 1) Find best matching bird via autocomplete (fast)
      const url1 =
        `https://api.inaturalist.org/v1/taxa/autocomplete` +
        `?q=${encodeURIComponent(commonName)}` +
        `&per_page=1` +
        `&iconic_taxa=Aves` +          // only birds
        `&is_active=true`;             // ignore inactive taxa

      const r1 = await fetch(url1);
      if (!r1.ok) return null;
      const j1 = await r1.json();
      const pick = (j1.results || [])[0];
      if (!pick) return null;

      // 2) Fetch full taxon (NO fields filter, so we get full ancestors)
      const url2 = `https://api.inaturalist.org/v1/taxa/${pick.id}`;
      const r2 = await fetch(url2);
      if (!r2.ok) return null;
      const j2 = await r2.json();
      const full = (j2.results || [])[0];
      if (!full) return null;

      const order = extractOrder(full.ancestors || []);
      const photo = full.default_photo || pick.default_photo || null;

      const info = {
        taxon_id: full.id,
        scientific_name: full.name,
        preferred_common_name: full.preferred_common_name || commonName,
        rank: full.rank,
        default_image: pickImage(photo),
        ancestry: (full.ancestors || []).map(a => ({
          rank: a.rank,
          name: a.name,
          common: a.preferred_common_name || a.english_common_name || ''
        })),
        order // { scientific, common } or null
      };

      localStorage.setItem(key, JSON.stringify(info));
      return info;
    } catch (e) {
      console.warn('enrichSpecies failed:', e);
      return null; // never throw
    }
  }

  async function selectSexImage() {
    return { selected: null, male: null, female: null, default: null };
  }

  window.BirdHub.species = { enrichSpecies, selectSexImage };
})();
