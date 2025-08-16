# iNaturalist API to Wingspan Card Mapping

This document outlines how data from the iNaturalist API maps to the various elements of Wingspan game cards.

## Card Header Section

### Bird Name
- **iNaturalist Source**: `taxon.preferred_common_name` or `taxon.name`
- **Wingspan Element**: Top banner with bird name
- **Example**: "Atlantic Puffin", "Roseate Spoonbill"

### Scientific Name
- **iNaturalist Source**: `taxon.name`
- **Wingspan Element**: Subtitle below bird name
- **Example**: "Fratercula arctica", "Platalea ajaja"

## Resource Cost Section

### Water Cost (Blue Diamond)
- **iNaturalist Source**: Always present (base cost)
- **Wingspan Element**: Blue diamond icon with wavy lines
- **Symbol**: 🌊

### Additional Resource Costs
- **iNaturalist Source**: `taxon.habitat`, `taxon.wikipedia_summary`, `taxon.description`
- **Wingspan Element**: Colored resource cubes
- **Mappings**:
  - **Forest** (🌲): `habitat` contains "forest", "wood", "tree"
  - **Grassland** (🌾): `habitat` contains "grass", "savanna", "meadow"
  - **Wetland** (🪿): `habitat` contains "wetland", "marsh", "swamp", "river", "lake"
  - **Coastal** (🐟): `habitat` contains "coast", "sea", "ocean", "shore"
  - **Rare Species** (🌲): `observations_count` ≤ 1000

## Left Side Stats Column

### Rarity Points (Top)
- **iNaturalist Source**: `taxon.observations_count`
- **Wingspan Element**: Golden circle with point value
- **Scoring**:
  - ≤50 obs: 10 points
  - ≤200 obs: 9 points
  - ≤500 obs: 8 points
  - ≤1000 obs: 7 points
  - ≤5000 obs: 6 points
  - ≤10000 obs: 5 points
  - ≤50000 obs: 4 points
  - ≤100000 obs: 3 points
  - ≤500000 obs: 2 points
  - >500000 obs: 1 point

### Nest Type (Middle)
- **iNaturalist Source**: `taxon.wikipedia_summary`, `taxon.description`, `taxon.family`
- **Wingspan Element**: Gray circle with nest type
- **Mappings**:
  - **Cup**: `family` = "Hirundinidae", "Apodidae", or description contains "cup"
  - **Cavity**: `family` = "Picidae", "Paridae", or description contains "cavity", "hole"
  - **Platform**: `family` = "Ardeidae", "Ciconiidae", or description contains "platform", "stick"
  - **Ground**: Description contains "ground", "soil", "grass"
  - **Burrow**: Description contains "burrow", "tunnel"
  - **Colonial**: Description contains "colonial", "colony"

### Egg Count (Bottom)
- **iNaturalist Source**: `taxon.wikipedia_summary`, `taxon.description`, `taxon.family`
- **Wingspan Element**: Gray circle with egg count
- **Mappings**:
  - **1-2**: `family` = "Columbidae", "Strigidae"
  - **3-6**: `family` = "Passeriformes" (most songbirds)
  - **6-12**: `family` = "Anseriformes", "Galliformes"
  - **Default**: "3-5" for most species

## Main Image Area

### Bird Photo
- **iNaturalist Source**: `taxon.default_photo`, `observation.images[0]`
- **Wingspan Element**: Central bird illustration
- **Fallback**: BirdHub logo if no image available

### Size Indicator
- **iNaturalist Source**: `taxon.wikipedia_summary`, `taxon.description`, `taxon.family`
- **Wingspan Element**: Text below image with wing icons
- **Mappings**:
  - **Small**: `family` = "Trochilidae", "Paridae", "Fringillidae"
  - **Large**: `family` = "Accipitridae", "Falconidae", "Strigidae"
  - **Medium**: Default fallback

## Habitat Type Indicator

### Habitat Classification
- **iNaturalist Source**: `observation.habitat`, `taxon.habitat`
- **Wingspan Element**: Green badge below image
- **Mappings**:
  - **Forest**: Contains "forest", "wood", "tree"
  - **Grassland**: Contains "grass", "savanna", "meadow", "urban", "garden"
  - **Wetland**: Contains "wetland", "marsh", "swamp", "river", "lake", "coast", "sea"

## Game Effect Text

### Effect Generation
- **iNaturalist Source**: `observation.behaviour`, `observation.habitat`, `taxon.diet`, `taxon.migration`
- **Wingspan Element**: Orange band with game effect
- **Mappings**:
  - **First Ever Sighting**: "When played: Draw 2 new bonus cards and keep 1"
  - **Singing Behavior**: "When activated: All players gain 1 🎵 from the supply"
  - **Nesting Behavior**: "When activated: Lay 1 egg on this bird"
  - **Insectivore Diet**: "When played: Gain 1 🐛 from the supply"
  - **Piscivore Diet**: "When played: Gain 1 🐟 from the supply"
  - **Migratory**: "When activated: Move this bird to another habitat"

## Fact Text

### Fact Generation
- **iNaturalist Source**: `taxon.conservation_status`, `taxon.wikipedia_summary`, `observation.habitat`, `observation.behaviour`
- **Wingspan Element**: Gray band at bottom with fact
- **Mappings**:
  - **Endangered Species**: "This species is threatened by habitat loss and climate change"
  - **Forest Birds**: "Forest birds are excellent at finding insects in tree bark"
  - **Wetland Birds**: "Wetland birds have specialized bills for catching aquatic prey"
  - **Coastal Birds**: "Coastal birds are adapted to saltwater environments"
  - **Singing Behavior**: "This bird's vocalizations help establish territory"
  - **Small Size**: "Small birds are agile and can access tight spaces"
  - **Large Size**: "Large birds are powerful hunters and flyers"

## Additional Data Sources

### Conservation Status
- **iNaturalist Source**: `taxon.conservation_status.status`, `taxon.statuses[]`
- **Wingspan Use**: Affects fact generation and rarity scoring

### Family and Order Information
- **iNaturalist Source**: `taxon.ancestors[]` (rank = "family" or "order")
- **Wingspan Use**: Default values for nest type, egg count, and size

### Wikipedia Data
- **iNaturalist Source**: `taxon.wikipedia_summary`, `taxon.wikipedia_url`
- **Wingspan Use**: Enhanced fact generation and behavioral insights

## Data Enhancement Strategy

1. **Primary Data**: Use direct iNaturalist API responses
2. **Secondary Data**: Parse Wikipedia summaries and descriptions
3. **Fallback Data**: Use taxonomic family/order characteristics
4. **Default Values**: Provide sensible defaults for missing data

## API Endpoints Used

- **Autocomplete**: `/taxa/autocomplete` - Get taxon ID from common name
- **Taxon Details**: `/taxa/{id}` - Get full taxon information including ancestors
- **Observations**: From GitHub issues (parsed observation data)

## Caching Strategy

- **Local Storage**: Cache enriched species data to reduce API calls
- **Cache Key**: `bh_taxon_{common_name.toLowerCase()}`
- **Cache Duration**: Until manually cleared or browser data cleared
