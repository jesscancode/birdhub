// ui.js
window.BirdHub = window.BirdHub || {};
(function () {
  const g = () => window.BirdHub.github;
  const p = () => window.BirdHub.parser;
  const s = () => window.BirdHub.species;

  function el(html) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  // ---------- HOME ----------
  async function initHome() {
    try {
      await g().loadConfig();
      const issues = await g().getIssues();
      const recent = document.getElementById("recent");
      if (!recent) return;

      const top = (issues || []).slice(0, 6);
      for (const it of top) {
        const rec = p().parseIssue(it);
        let sp = null;
        try { sp = await s().enrichSpecies(rec.common_name); } catch (e) { console.warn("enrichSpecies(home) failed:", e); }
        recent.appendChild(renderWingspanCard(rec, sp));
      }
    } catch (e) {
      console.warn("initHome failed:", e);
      const recent = document.getElementById("recent");
      if (recent) recent.innerHTML = `<div class="small">No recent sightings available.</div>`;
    }
  }

  // ---------- SIGHTINGS ----------
  async function initSightings() {
    try {
      await g().loadConfig();
      const issues = await g().getIssues();
      const list = document.getElementById("list");
      if (!list) return;

      for (const it of (issues || [])) {
        const rec = p().parseIssue(it);
        let sp = null;
        try { sp = await s().enrichSpecies(rec.common_name); } catch (e) { console.warn("enrichSpecies(sightings) failed:", e); }
        list.appendChild(renderWingspanCard(rec, sp));
      }
    } catch (e) {
      console.warn("initSightings failed:", e);
      const list = document.getElementById("list");
      if (list) list.innerHTML = `<div class="small">No sightings to show.</div>`;
    }
  }

  // ---------- SPECIES ----------
  async function initSpecies() {
    try {
      const issues = await g().getIssues();
      const map = new Map();
      for (const it of issues) {
        const rec = p().parseIssue(it);
        const key = (rec.common_name || "").toLowerCase();
        if (!key) continue;
        if (!map.has(key)) map.set(key, { name: rec.common_name, count: 0 });
        map.get(key).count++;
      }
      const species = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      const container = document.getElementById("speciesList");
      species.forEach(sp => {
        const card = el(
          `<div class="card"><h3>${escapeHtml(sp.name)}</h3><div class="small">${sp.count} sighting(s)</div></div>`
        );
        container.appendChild(card);
      });
    } catch (e) { console.warn(e); }
  }

  // ---------- STATS ----------
  async function initStats() {
    try {
      await g().loadConfig();
      const issues = await g().getIssues();
      const parsed = (issues || []).map(it => p().parseIssue(it));

      // Life list
      const life = new Set(parsed.map(r => (r.common_name || "").toLowerCase()).filter(Boolean));
      const lifeEl = document.getElementById("statLifeList");
      if (lifeEl) lifeEl.textContent = `${life.size} species`;

      // This month
      const now = new Date();
      const ym = now.toISOString().slice(0, 7);
      const monthCount = parsed.filter(r => (r.observed_at || "").slice(0, 7) === ym).length;
      const monthEl = document.getElementById("statMonth");
      if (monthEl) monthEl.textContent = `${monthCount} sighting${monthCount === 1 ? "" : "s"}`;

      // Big day (unique species per day)
      const byDayUniqueSpecies = new Map();
      parsed.forEach(r => {
        const d = (r.observed_at || "").slice(0, 10);
        const sp = (r.common_name || "").toLowerCase();
        if (d && sp) byDayUniqueSpecies.set(`${d}|${sp}`, true);
      });
      const dayCounts = {};
      for (const k of byDayUniqueSpecies.keys()) {
        const d = k.split("|")[0];
        dayCounts[d] = (dayCounts[d] || 0) + 1;
      }
      const big = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
      const bigEl = document.getElementById("statBigDay");
      if (bigEl) bigEl.textContent = big ? `${big[0]} · ${big[1]} species` : "—";
    } catch (e) {
      console.warn("initStats failed:", e);
      const lifeEl = document.getElementById("statLifeList");
      const monthEl = document.getElementById("statMonth");
      const bigEl = document.getElementById("statBigDay");
      if (lifeEl) lifeEl.textContent = "—";
      if (monthEl) monthEl.textContent = "—";
      if (bigEl) bigEl.textContent = "—";
    }
  }

  // ---------- helpers used by the card ----------
  function rarityPoints(obsCount) {
    if (obsCount <= 50) return 9;
    if (obsCount <= 200) return 8;
    if (obsCount <= 500) return 7;
    if (obsCount <= 1000) return 6;
    if (obsCount <= 5000) return 5;
    if (obsCount <= 10000) return 4;
    if (obsCount <= 50000) return 3;
    if (obsCount <= 100000) return 2;
    if (obsCount <= 500000) return 1;
    return 1;
  }

  function habitatIcons(hab) {
    const h = (hab || "").toLowerCase();
    const icons = [];
    if (/forest|wood/.test(h)) icons.push("🌲");
    if (/grass|savanna/.test(h)) icons.push("🌾");
    if (/wetland|marsh|reed|swamp|river|lake/.test(h)) icons.push("🪿");
    if (/coast|sea|ocean|shore|beach/.test(h)) icons.push("🌊");
    if (/urban|garden|park|city/.test(h)) icons.push("🏙️");
    if (/shrub|fynbos/.test(h)) icons.push("🌿");
    return icons.map(x => `<span class="ico" title="${escapeHtml(hab)}">${x}</span>`).join("");
  }

  function getStatus(sp) {
    if (!sp) return null;

    // object form: { code: "VU", label: "Vulnerable" }
    if (sp.status && (sp.status.code || sp.status.label)) {
      const code = (sp.status.code || "").toLowerCase();
      const label = sp.status.label || sp.status.code || "";
      return code ? { code, label } : null;
    }

    // string form: "Vulnerable", "Least Concern", etc.
    const txt = (sp.conservation_status || "").toLowerCase();
    if (!txt) return null;
    const map = {
      "least concern": "lc",
      "near threatened": "nt",
      "vulnerable": "vu",
      "endangered": "en",
      "critically endangered": "cr",
      "extinct": "ex",
      "data deficient": "dd"
    };
    const code = map[txt] || null;
    return code ? { code, label: sp.conservation_status } : null;
  }

  function formatDateTime(datetime) {
    if (!datetime) return "";
    const d = new Date(datetime);
    if (isNaN(d.getTime())) return datetime;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // ---------- Wingspan card renderer ----------
  function renderWingspanCard(rec, sp) {
    const commonName = rec.common_name || "Unknown";
    const scientificName = sp?.scientific_name || "";
    const orderCommon = sp?.order?.common || "";
    const orderSci = sp?.order?.scientific || "";
    const familyCommon = sp?.family?.common || "";
    const familySci = sp?.family?.scientific || "";
    const status = getStatus(sp);

    const thumb =
      rec.images?.[0] ||
      sp?.default_image_medium ||
      sp?.default_image_square ||
      sp?.default_image ||
      "./assets/images/logo.png";

    const behaviours = (rec.behaviour || "")
      .split(",").map(x => x.trim()).filter(Boolean)
      .map(b => `<span class="chip mini">${escapeHtml(b)}</span>`).join(" ");

    const firstEver = rec.first_ever ? `<span class="badge first-ever">First ever</span>` : "";
    const confidence = rec.confidence ? `<span class="badge confidence">${escapeHtml(rec.confidence)}</span>` : "";
    const when = formatDateTime(rec.observed_at);
    const points = rarityPoints(sp?.observations_count ?? sp?.obs_count ?? 0);
    const moreInfoUrl = sp?.taxon_id ? `https://www.inaturalist.org/taxa/${sp.taxon_id}` : `https://www.inaturalist.org/search?q=${encodeURIComponent(commonName)}`;
    const petName = rec.pet_name ? `<span class="badge pet-name">${escapeHtml(rec.pet_name)}</span>` : "";

    // Wingspan card specific data
    const habitat = rec.habitat || "";
    const habitatType = getHabitatType(habitat);
    const resourceCost = getResourceCost(habitat, sp);
    const gameEffect = getGameEffect(rec, sp);
    const fact = getFact(rec, sp);
    const size = getSize(sp);
    const nestType = getNestType(sp);
    const eggCount = getEggCount(sp);

    return el(`
      <div class="card wingspan">
        <div class="wg-top-section">
          <div class="wg-cost-section">
            <div class="wg-cost-diamond">
              ${resourceCost.find(item => item.isDiamond)?.symbol || "🌿"}
            </div>
            <div class="wg-cost-items">
              ${resourceCost.filter(item => !item.isDiamond).map(item => `<div class="wg-cost-item wg-cost-${item.type}" title="${item.label}">${item.symbol}</div>`).join("")}
            </div>
          </div>
          
          <div class="wg-name-banner">
            <h3 class="wg-name"><a href="${rec.url}" target="_blank" rel="noopener">${escapeHtml(commonName)}</a></h3>
            ${scientificName ? `<div class="wg-sci-banner">${escapeHtml(scientificName)}</div>` : ""}
          </div>
        </div>

        <div class="wg-left-stats">
          <div class="wg-points" title="Rarity score">
            ${points}
            <img src="./assets/icons/feather-icon.png" alt="feather" class="wg-feather-icon">
          </div>
          <div class="wg-stat-item" title="Nest type">${nestType}</div>
          <div class="wg-stat-item" title="Egg count">${eggCount}</div>
        </div>

        <div class="wg-img-container">
          <img class="wg-img" src="${thumb}" alt="" loading="lazy" decoding="async">
          ${size ? `<div class="wg-size">${size}</div>` : ""}
        </div>

        ${habitatType ? `<div class="wg-habitat">${habitatType}</div>` : ""}

        ${gameEffect ? `<div class="wg-effect">${gameEffect}</div>` : ""}

        ${fact ? `<div class="wg-fact">${fact}</div>` : ""}
      </div>
    `);
  }

  // Helper functions for Wingspan card data
  function getHabitatType(habitat) {
    if (!habitat) return null;
    const h = habitat.toLowerCase();
    if (/forest|wood/.test(h)) return "Forest";
    if (/grass|savanna/.test(h)) return "Grassland";
    if (/wetland|marsh|reed|swamp|river|lake/.test(h)) return "Wetland";
    if (/coast|sea|ocean|shore|beach/.test(h)) return "Wetland";
    if (/urban|garden|park|city/.test(h)) return "Grassland";
    if (/shrub|fynbos/.test(h)) return "Grassland";
    return "Grassland"; // default
  }

  function getResourceCost(habitat, sp) {
    const costs = [];
    
    // Get habitat emoji for the diamond
    const habitatEmoji = getHabitatEmoji(habitat);
    
    // Always add water (blue diamond) as base cost - this represents the bird's basic needs
    costs.push({ type: "fish", symbol: habitatEmoji, label: "Habitat", isDiamond: true });
    
    // Add habitat-specific costs based on Wingspan mechanics
    if (habitat) {
      const h = habitat.toLowerCase();
      if (/forest|wood|tree/.test(h)) {
        costs.push({ type: "forest", symbol: "🌲", label: "Forest" });
      } else if (/grass|savanna|meadow|urban|garden|park/.test(h)) {
        costs.push({ type: "grassland", symbol: "🌾", label: "Grassland" });
      } else if (/wetland|marsh|reed|swamp|river|lake/.test(h)) {
        costs.push({ type: "wetland", symbol: "🪿", label: "Wetland" });
      } else if (/coast|sea|ocean|shore|beach|cliff/.test(h)) {
        costs.push({ type: "fish", symbol: "🐟", label: "Coastal" });
      }
    }
    
    // Add rarity-based costs (rarer birds cost more)
    const obsCount = sp?.observations_count ?? sp?.obs_count ?? 0;
    if (obsCount <= 500) {
      costs.push({ type: "forest", symbol: "🌲", label: "Rare" });
    } else if (obsCount <= 2000) {
      costs.push({ type: "grassland", symbol: "🌾", label: "Uncommon" });
    }
    
    // Add diet-based costs
    if (sp?.diet) {
      const diet = sp.diet.toLowerCase();
      if (diet.includes("insectivore")) {
        costs.push({ type: "wetland", symbol: "🪿", label: "Insect" });
      } else if (diet.includes("piscivore")) {
        costs.push({ type: "fish", symbol: "🐟", label: "Fish" });
      }
    }
    
    return costs;
  }

  function getHabitatEmoji(habitat) {
    if (!habitat) return "🌿"; // Default
    
    const h = habitat.toLowerCase();
    if (/forest|wood|tree/.test(h)) return "🌲";
    if (/grass|savanna|meadow|urban|garden|park/.test(h)) return "🌾";
    if (/wetland|marsh|reed|swamp|river|lake/.test(h)) return "🪿";
    if (/coast|sea|ocean|shore|beach|cliff/.test(h)) return "🌊";
    if (/desert|arid|sand/.test(h)) return "🏜️";
    if (/mountain|alpine|rock/.test(h)) return "⛰️";
    
    return "🌿"; // Default
  }

  function getGameEffect(rec, sp) {
    const effects = [];
    
    // Special effects based on sighting data
    if (rec.first_ever) {
      effects.push("When played: Draw 2 new bonus cards and keep 1");
    } else if (rec.behaviour) {
      const b = rec.behaviour.toLowerCase();
      if (/sing|song|call/.test(b)) {
        effects.push("When activated: All players gain 1 🎵 from the supply");
      } else if (/nest|breed/.test(b)) {
        effects.push("When activated: Lay 1 egg on this bird");
      } else if (/hunt|forage/.test(b)) {
        effects.push("When activated: Gain 1 🐛 from the supply");
      } else if (/fish|dive/.test(b)) {
        effects.push("When activated: Gain 1 🐟 from the supply");
      }
    }
    
    // Effects based on diet
    if (sp?.diet) {
      const diet = sp.diet.toLowerCase();
      if (diet.includes("insectivore")) {
        effects.push("When played: Gain 1 🐛 from the supply");
      } else if (diet.includes("piscivore")) {
        effects.push("When played: Gain 1 🐟 from the supply");
      } else if (diet.includes("granivore")) {
        effects.push("When played: Gain 1 🌾 from the supply");
      } else if (diet.includes("nectar")) {
        effects.push("When played: Gain 1 🌸 from the supply");
      }
    }
    
    // Effects based on habitat
    if (rec.habitat) {
      const h = rec.habitat.toLowerCase();
      if (/forest|wood|tree/.test(h)) {
        effects.push("When played: Gain 1 🌲 from the supply");
      } else if (/wetland|marsh|reed|swamp|river|lake/.test(h)) {
        effects.push("When played: Gain 1 🪿 from the supply");
      } else if (/coast|sea|ocean|shore|beach|cliff/.test(h)) {
        effects.push("When played: Gain 1 🐟 from the supply");
      } else if (/grass|savanna|meadow/.test(h)) {
        effects.push("When played: Gain 1 🌾 from the supply");
      }
    }
    
    // Effects based on migration
    if (sp?.migration) {
      const migration = sp.migration.toLowerCase();
      if (migration.includes("migratory")) {
        effects.push("When activated: Move this bird to another habitat");
      } else if (migration.includes("resident")) {
        effects.push("When activated: This bird stays in place");
      }
    }
    
    // Default effect based on rarity
    if (!effects.length) {
      const obsCount = sp?.observations_count ?? sp?.obs_count ?? 0;
      if (obsCount <= 1000) {
        effects.push("When played: Gain 1 🌲 from the supply");
      } else {
        effects.push("When played: Gain 1 🐟 from the supply");
      }
    }
    
    return effects[0];
  }

  function getFact(rec, sp) {
    const facts = [];
    
    // Conservation status facts
    if (sp?.status) {
      const status = getStatus(sp);
      if (status?.code === "en" || status?.code === "cr") {
        facts.push("This species is threatened by habitat loss and climate change");
      } else if (status?.code === "vu" || status?.code === "nt") {
        facts.push("This species faces conservation challenges in some regions");
      }
    }
    
    // Diet-based facts
    if (sp?.diet) {
      const diet = sp.diet.toLowerCase();
      if (diet.includes("insectivore")) facts.push("This bird helps control insect populations");
      if (diet.includes("piscivore")) facts.push("This bird is an excellent fisher");
      if (diet.includes("nectar")) facts.push("This bird is an important pollinator");
    }
    
    // Migration facts
    if (sp?.migration) {
      const migration = sp.migration.toLowerCase();
      if (migration.includes("migratory")) facts.push("This bird travels long distances seasonally");
      if (migration.includes("resident")) facts.push("This bird stays in the same area year-round");
    }
    
    // Habitat-specific facts
    if (rec.habitat) {
      const h = rec.habitat.toLowerCase();
      if (/forest|wood/.test(h)) facts.push("Forest birds are excellent at finding insects in tree bark");
      if (/wetland|marsh|reed|swamp|river|lake/.test(h)) facts.push("Wetland birds have specialized bills for catching aquatic prey");
      if (/coast|sea|ocean|shore|beach/.test(h)) facts.push("Coastal birds are adapted to saltwater environments");
      if (/grass|savanna/.test(h)) facts.push("Grassland birds are adapted to open hunting grounds");
    }
    
    // Behavior facts
    if (rec.behaviour) {
      const b = rec.behaviour.toLowerCase();
      if (/sing|song|call/.test(b)) facts.push("This bird's vocalizations help establish territory");
      if (/nest|breed/.test(b)) facts.push("Nesting behavior varies by habitat and food availability");
      if (/hunt|forage/.test(b)) facts.push("This bird uses specialized hunting techniques");
    }
    
    // Size-based facts
    if (sp?.size) {
      const size = sp.size.toLowerCase();
      if (size === "small") facts.push("Small birds are agile and can access tight spaces");
      if (size === "large") facts.push("Large birds are powerful hunters and flyers");
    }
    
    return facts[0] || "Birds play crucial roles in ecosystem health and biodiversity";
  }

  function getSize(sp) {
    // Use the enhanced data from species enrichment
    if (sp?.size) return sp.size;
    
    // Fallback to observation count-based size
    const obsCount = sp?.observations_count ?? sp?.obs_count ?? 0;
    if (obsCount <= 1000) return "Small";
    if (obsCount <= 10000) return "Medium";
    return "Large";
  }

  function getNestType(sp) {
    // Use the enhanced data from species enrichment
    if (sp?.nest_type) return sp.nest_type;
    
    // Fallback based on family
    if (sp?.family?.scientific) {
      const family = sp.family.scientific.toLowerCase();
      if (/hirundinidae|apodidae/.test(family)) return "Cup";
      if (/picidae|paridae/.test(family)) return "Cavity";
      if (/ardeidae|ciconiidae/.test(family)) return "Platform";
    }
    
    return "Cup"; // Default fallback
  }

  function getEggCount(sp) {
    // Use the enhanced data from species enrichment
    if (sp?.egg_count) return sp.egg_count;
    
    // Fallback based on family
    if (sp?.family?.scientific) {
      const family = sp.family.scientific.toLowerCase();
      if (/columbidae|strigidae/.test(family)) return "1-2";
      if (/anseriformes|galliformes/.test(family)) return "6-12";
    }
    
    return "3-5"; // Default fallback
  }

  // expose
  window.BirdHub.initHome = initHome;
  window.BirdHub.initHome = initHome;
  window.BirdHub.initSightings = initSightings;
  window.BirdHub.initSpecies = initSpecies;
  window.BirdHub.initStats = initStats;
})();