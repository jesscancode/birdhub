// docs/assets/js/species.js
window.BirdHub = window.BirdHub || {};
(function(){
  const cacheKey = (name) => `bh_taxon_${name.toLowerCase()}`;

  // Map iNat conservation status to code+label we use on the card
  function statusFrom(t) {
    // iNat may expose either `conservation_status` (object) or `statuses[]`
    const s = t.conservation_status || (Array.isArray(t.statuses) && t.statuses[0]) || null;
    if (!s) return null;
    // Common codes we’ll color: LC/NT/VU/EN/CR/EX/DD
    const code = (s.status || s.status_name || '').toUpperCase();
    const label = s.iucn ? s.iucn.toUpperCase() : (s.status_name || s.status || '').replace(/_/g, ' ');
    return { code, label: label || code };
  }

  async function enrichSpecies(commonName) {
    try {
      if (!commonName) return null;
      const key = cacheKey(commonName);
      const cached = localStorage.getItem(key);
      if (cached) { try { return JSON.parse(cached); } catch (_) {} }

      // Step 1: autocomplete to get a taxon id
      const aurl = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(commonName)}&per_page=1&iconic_taxa=Aves&is_active=true`;
      const ares = await fetch(aurl);
      if (!ares.ok) return null;
      const ajson = await ares.json();
      const t0 = ajson.results && ajson.results[0];
      if (!t0) return null;

      // Step 2: fetch full taxon for ancestry + stats
      const tid = t0.id;
      const turl = `https://api.inaturalist.org/v1/taxa/${tid}`;
      const tres = await fetch(turl);
      if (!tres.ok) return null;
      const tjson = await tres.json();
      const t = tjson.results && tjson.results[0];
      if (!t) return null;

      // Pull order & family from ancestors
      let order = null, family = null;
      (t.ancestors || []).forEach(a => {
        if (a.rank === 'order') order = { scientific: a.name, common: a.preferred_common_name || '' };
        if (a.rank === 'family') family = { scientific: a.name, common: a.preferred_common_name || '' };
      });

      const photo = t.default_photo || t0.default_photo || null;

      const info = {
        taxon_id: t.id,
        scientific_name: t.name,
        preferred_common_name: t.preferred_common_name || commonName,
        default_image: photo ? (photo.square_url || photo.medium_url || photo.url) : null,
        default_image_medium: photo ? (photo.medium_url || photo.square_url || photo.url) : null,
        observations_count: t.observations_count || 0,
        wikipedia_url: t.wikipedia_url || null,
        status: statusFrom(t),   // {code, label} or null
        order,                   // {common, scientific} or null
        family                   // {common, scientific} or null
      };

      localStorage.setItem(key, JSON.stringify(info));
      return info;
    } catch (e) {
      console.warn('enrichSpecies failed:', e);
      return null;
    }
  }

  async function selectSexImage(){ return { selected:null, male:null, female:null, default:null }; }

  window.BirdHub.species = { enrichSpecies, selectSexImage };
})();
