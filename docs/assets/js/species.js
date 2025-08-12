// assets/js/species.js
window.BirdHub = window.BirdHub || {};
(function(){
  const cacheKey = (name) => `bh_taxon_${name.toLowerCase()}`;

  async function enrichSpecies(commonName) {
    try {
      if (!commonName) return null;
      const key = cacheKey(commonName);
      const cached = localStorage.getItem(key);
      if (cached) { try { return JSON.parse(cached); } catch(_){} }

      const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(commonName)}&per_page=1&iconic_taxa=Aves&is_active=true`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const t = data.results && data.results[0];
      if (!t) return null;

      // 🔎 find the order ancestor (e.g., Accipitriformes)
      const orderAnc = (t.ancestors || []).find(a => a.rank === 'order');

      const info = {
        scientific_name: t.name,
        preferred_common_name: t.preferred_common_name || commonName,
        rank: t.rank,
        taxon_id: t.id,
        default_image: t.default_photo ? (t.default_photo.small_url || t.default_photo.square_url) : null,
        // keep some ancestry detail (now with common names if present)
        ancestry: (t.ancestors || []).map(a => ({
          rank: a.rank,
          name: a.name,
          common: a.preferred_common_name || a.english_common_name || ''
        })),
        // 🆕 order info
        order: orderAnc ? {
          scientific: orderAnc.name || '',
          common: orderAnc.preferred_common_name || orderAnc.english_common_name || ''
        } : null
      };

      localStorage.setItem(key, JSON.stringify(info));
      return info;
    } catch(e){
      console.warn('enrichSpecies failed:', e);
      return null;
    }
  }

  async function selectSexImage(){ return { selected:null, male:null, female:null, default:null }; }

  window.BirdHub.species = { enrichSpecies, selectSexImage };
})();
