// docs/assets/js/species.js
window.BirdHub = window.BirdHub || {};
(function(){
  const cacheKey = (name) => `bh_taxon_${name.toLowerCase()}`;

  // Map iNat conservation status to code+label we use on the card
  function statusFrom(t) {
    // iNat may expose either `conservation_status` (object) or `statuses[]`
    const s = t.conservation_status || (Array.isArray(t.statuses) && t.statuses[0]) || null;
    if (!s) return null;
    
    // Safely handle different status field structures
    let code = '';
    let label = '';
    
    // Try to get the status code
    if (s.status && typeof s.status === 'string') {
      code = s.status.toUpperCase();
    } else if (s.status_name && typeof s.status_name === 'string') {
      code = s.status_name.toUpperCase();
    } else if (s.iucn && typeof s.iucn === 'string') {
      code = s.iucn.toUpperCase();
    }
    
    // Try to get the label
    if (s.iucn && typeof s.iucn === 'string') {
      label = s.iucn.toUpperCase();
    } else if (s.status_name && typeof s.status_name === 'string') {
      label = s.status_name.replace(/_/g, ' ');
    } else if (s.status && typeof s.status === 'string') {
      label = s.status.replace(/_/g, ' ');
    }
    
    // Fallback if we couldn't get either
    if (!code && label) code = label;
    if (!label && code) label = code;
    
    return code ? { code, label } : null;
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
        default_image_square: photo ? (photo.square_url || photo.medium_url || photo.url) : null,
        observations_count: t.observations_count || 0,
        wikipedia_url: t.wikipedia_url || null,
        status: statusFrom(t),   // {code, label} or null
        order,                   // {common, scientific} or null
        family,                  // {common, scientific} or null
        // New fields for Wingspan cards
        habitat: t.habitat || null,
        size: getSizeFromTaxon(t),
        nest_type: getNestTypeFromTaxon(t),
        egg_count: getEggCountFromTaxon(t),
        diet: getDietFromTaxon(t),
        migration: getMigrationFromTaxon(t)
      };

      localStorage.setItem(key, JSON.stringify(info));
      return info;
    } catch (e) {
      console.warn('enrichSpecies failed:', e);
      return null;
    }
  }

  // Helper functions for Wingspan card data
  function getSizeFromTaxon(t) {
    // Try to extract size from taxon description or Wikipedia summary
    const desc = (t.wikipedia_summary || t.description || '').toLowerCase();
    
    // Look for size indicators in the description
    if (/large|big|huge/.test(desc)) return "Large";
    if (/small|tiny|little/.test(desc)) return "Small";
    if (/medium|moderate/.test(desc)) return "Medium";
    
    // Default based on family/order characteristics
    if (t.family && /accipitridae|falconidae|strigidae/.test(t.family.toLowerCase())) return "Large";
    if (t.family && /trochilidae|paridae|fringillidae/.test(t.family.toLowerCase())) return "Small";
    
    return "Medium"; // Default fallback
  }

  function getNestTypeFromTaxon(t) {
    const desc = (t.wikipedia_summary || t.description || '').toLowerCase();
    
    // Look for nesting behavior in description
    if (/cup|bowl|saucer/.test(desc)) return "Cup";
    if (/cavity|hole|tree hole/.test(desc)) return "Cavity";
    if (/platform|stick|branch/.test(desc)) return "Platform";
    if (/ground|soil|grass/.test(desc)) return "Ground";
    if (/burrow|tunnel/.test(desc)) return "Burrow";
    if (/colonial|colony/.test(desc)) return "Colonial";
    
    // Default based on family characteristics
    if (t.family && /hirundinidae|apodidae/.test(t.family.toLowerCase())) return "Cup";
    if (t.family && /picidae|paridae/.test(t.family.toLowerCase())) return "Cavity";
    if (t.family && /ardeidae|ciconiidae/.test(t.family.toLowerCase())) return "Platform";
    
    return "Cup"; // Most common nest type
  }

  function getEggCountFromTaxon(t) {
    const desc = (t.wikipedia_summary || t.description || '').toLowerCase();
    
    // Look for clutch size information
    const clutchMatch = desc.match(/(\d+)[-\s](\d+)\s*egg/);
    if (clutchMatch) return `${clutchMatch[1]}-${clutchMatch[2]}`;
    
    const singleMatch = desc.match(/(\d+)\s*egg/);
    if (singleMatch) return singleMatch[1];
    
    // Default based on family characteristics
    if (t.family && /columbidae|strigidae/.test(t.family.toLowerCase())) return "1-2";
    if (t.family && /passeriformes|passerine/.test(t.family.toLowerCase())) return "3-6";
    if (t.family && /anseriformes|galliformes/.test(t.family.toLowerCase())) return "6-12";
    
    return "3-5"; // Typical passerine clutch size
  }

  function getDietFromTaxon(t) {
    const desc = (t.wikipedia_summary || t.description || '').toLowerCase();
    
    if (/insect|bug|beetle|fly|moth/.test(desc)) return "Insectivore";
    if (/seed|grain|berry|fruit|nectar/.test(desc)) return "Granivore/Frugivore";
    if (/fish|aquatic|marine/.test(desc)) return "Piscivore";
    if (/carnivore|predator|hunt/.test(desc)) return "Carnivore";
    if (/omnivore|varied|mixed/.test(desc)) return "Omnivore";
    
    // Default based on family
    if (t.family && /accipitridae|falconidae/.test(t.family.toLowerCase())) return "Carnivore";
    if (t.family && /fringillidae|emberizidae/.test(t.family.toLowerCase())) return "Granivore";
    if (t.family && /hirundinidae|apodidae/.test(t.family.toLowerCase())) return "Insectivore";
    
    return "Omnivore"; // Default fallback
  }

  function getMigrationFromTaxon(t) {
    const desc = (t.wikipedia_summary || t.description || '').toLowerCase();
    
    if (/migratory|migration|winter|summer/.test(desc)) return "Migratory";
    if (/resident|permanent|year-round/.test(desc)) return "Resident";
    if (/partial|some|occasional/.test(desc)) return "Partial Migrant";
    
    // Default based on family/geography
    if (t.family && /hirundinidae|apodidae/.test(t.family.toLowerCase())) return "Migratory";
    if (t.family && /passeriformes/.test(t.family.toLowerCase())) return "Partial Migrant";
    
    return "Resident"; // Default fallback
  }

  async function selectSexImage(){ return { selected:null, male:null, female:null, default:null }; }

  window.BirdHub.species = { enrichSpecies, selectSexImage };
})();
