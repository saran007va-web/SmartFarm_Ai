export const CROPS: any = {
  tomato: {
    name: "Tomato",
    emoji: "🍅",
    totalDays: 90,
    idealTemp: { min: 18, max: 29 },
    idealHumidity: { min: 40, max: 70 },
    waterRequirement: "medium",
    stages: [
      {
        name: "Seed Germination",
        startDay: 1,
        endDay: 10,
        color: "#a3e635",
        icon: "🌱",
        description: "Seeds sprout and first leaves emerge",
        tasks: {
          daily: [
            { time: "06:00", task: "Check soil moisture — keep evenly moist but not waterlogged" },
            { time: "18:00", task: "Light misting if topsoil feels dry to touch" },
          ],
          everyOtherDay: [
            { task: "Check for fungal signs (white patches, damping off)" },
          ],
          weekly: [
            { task: "Thin seedlings — keep 1 strong seedling per cell/spot" },
          ],
        },
        climateAdaptations: {
          hotDay: "Move seedling trays to partial shade; mist twice more",
          coldNight: "Cover trays with thin cloth or plastic sheet overnight",
          rain: "Protect seedlings from direct rain — move under shelter",
          drought: "Water twice daily with fine nozzle spray",
        },
      },
      {
        name: "Seedling Growth",
        startDay: 11,
        endDay: 25,
        color: "#22c55e",
        icon: "🌿",
        description: "True leaves develop, roots establish",
        tasks: {
          daily: [
            { time: "07:00", task: "Water at base — 200ml per seedling, avoid wetting leaves" },
            { time: "17:00", task: "Inspect leaves for yellowing or curling" },
          ],
          everyOtherDay: [
            { task: "Apply diluted DAP fertilizer (5g per litre water)" },
            { task: "Check for aphids under leaves — wipe off with neem water" },
          ],
          weekly: [
            { task: "Loosen topsoil carefully (1cm depth) to improve aeration" },
            { task: "Apply 5g neem cake around base to prevent soil pests" },
          ],
        },
        climateAdaptations: {
          hotDay: "Water in early morning only; mulch with dry leaves/straw",
          coldNight: "Reduce evening watering; no overhead irrigation",
          rain: "Stop irrigation; check drainage to avoid root rot",
          drought: "Shade net (50%) during 11am–3pm; water twice daily",
        },
      },
      {
        name: "Transplanting",
        startDay: 26,
        endDay: 30,
        color: "#f59e0b",
        icon: "⛏️",
        description: "Move seedlings to main field",
        tasks: {
          daily: [
            { time: "06:30", task: "Water transplanted seedlings immediately after planting" },
            { time: "08:00", task: "Check for wilting — press soil firmly around roots" },
            { time: "17:00", task: "Second light watering if weather is hot/windy" },
          ],
          everyOtherDay: [
            { task: "Apply root dip treatment (Trichoderma solution) to new transplants" },
          ],
          weekly: [
            { task: "Apply starter fertilizer: 10g NPK 6:12:6 per plant" },
          ],
        },
        climateAdaptations: {
          hotDay: "Transplant only in evening (after 4pm); shade for 3 days",
          coldNight: "Transplant in morning; avoid transplanting when frost expected",
          rain: "Delay transplanting if heavy rain forecast within 24 hours",
          drought: "Water every 6 hours for first 3 days after transplanting",
        },
      },
      {
        name: "Vegetative Growth",
        startDay: 31,
        endDay: 55,
        color: "#10b981",
        icon: "🌳",
        description: "Rapid stem and leaf growth, root system expands",
        tasks: {
          daily: [
            { time: "07:00", task: "Water 500ml–1L per plant depending on soil dryness" },
            { time: "09:00", task: "Inspect for pests: whitefly, leafminer, early blight" },
            { time: "17:30", task: "Scout for any new pest damage — record and act next morning" },
          ],
          everyOtherDay: [
            { task: "Stake plants with bamboo sticks as they grow taller" },
            { task: "Pinch off suckers growing between main stem and branch" },
          ],
          weekly: [
            { task: "Apply NPK 19:19:19 foliar spray (2g per litre)" },
            { task: "Earth up soil around base to support stem" },
            { task: "Weed control — manual removal or shallow hoe" },
          ],
        },
        climateAdaptations: {
          hotDay: "Drip irrigation preferred; mulch to retain moisture",
          coldNight: "Reduce evening irrigation; apply potash to improve frost tolerance",
          rain: "Stop irrigation; spray copper oxychloride to prevent blight",
          drought: "Increase watering frequency; apply mulch 5cm thick",
        },
      },
      {
        name: "Flowering",
        startDay: 56,
        endDay: 70,
        color: "#f472b6",
        icon: "🌸",
        description: "Flowers appear — critical period for fruit set",
        tasks: {
          daily: [
            { time: "07:00", task: "Water evenly — irregular watering causes blossom drop" },
            { time: "10:00", task: "Shake plants gently to aid pollination if no wind" },
            { time: "16:00", task: "Check flower count — note any flower drop" },
          ],
          everyOtherDay: [
            { task: "Apply boron spray (1g per litre) to prevent flower drop" },
            { task: "Spray neem oil (5ml/L) to repel thrips and mites" },
          ],
          weekly: [
            { task: "Apply 10g potassium sulphate per plant for fruit quality" },
            { task: "Remove diseased flowers or leaves immediately" },
          ],
        },
        climateAdaptations: {
          hotDay: "Spray water on foliage in morning to cool plants; avoid afternoon stress",
          coldNight: "Apply potassium nitrate foliar spray; protect with row covers",
          rain: "Spray fungicide after rain (Mancozeb 2.5g/L); re-stake if needed",
          drought: "Critical: do not let soil dry — flower drop is irreversible",
        },
      },
      {
        name: "Fruit Development",
        startDay: 71,
        endDay: 85,
        color: "#ef4444",
        icon: "🍅",
        description: "Fruits grow and ripen",
        tasks: {
          daily: [
            { time: "07:00", task: "Water deeply — 1–1.5L per plant; consistent moisture prevents cracking" },
            { time: "09:00", task: "Check fruit for cracking, blossom end rot, or pest damage" },
            { time: "17:00", task: "Assess ripening stage — note colour change" },
          ],
          everyOtherDay: [
            { task: "Apply calcium nitrate (1g/L) spray to prevent blossom end rot" },
            { task: "Remove any rotting fruit immediately from plant and field" },
          ],
          weekly: [
            { task: "Reduce nitrogen fertilizer; increase potassium (15g/plant)" },
            { task: "Spray Spinosad or neem for fruit borer control" },
          ],
        },
        climateAdaptations: {
          hotDay: "Shade net reduces sunscald on fruits; water in morning only",
          coldNight: "Harvest any near-ripe fruits before forecast cold night",
          rain: "Check for fungal rot; ensure good air circulation in canopy",
          drought: "Water stress at this stage causes bitter/cracked fruits — prioritize water",
        },
      },
      {
        name: "Harvest",
        startDay: 86,
        endDay: 90,
        color: "#dc2626",
        icon: "🧺",
        description: "Pick ripe fruits at correct maturity",
        tasks: {
          daily: [
            { time: "06:30", task: "Harvest ripe red/pink fruits in early morning when cool" },
            { time: "08:00", task: "Sort and grade harvested tomatoes; remove damaged ones" },
            { time: "17:00", task: "Second harvest round if heavy fruiting" },
          ],
          everyOtherDay: [
            { task: "Clean harvesting baskets and storage area" },
          ],
          weekly: [
            { task: "Plan transport/market logistics for harvested produce" },
          ],
        },
        climateAdaptations: {
          hotDay: "Harvest early morning only; store in cool shaded area",
          coldNight: "Harvest before frost; store at 13–15°C minimum",
          rain: "Harvest before heavy rain to prevent splitting on vine",
          drought: "No change to harvest timing — proceed normally",
        },
      },
    ],
  },

  onion: {
    name: "Onion",
    emoji: "🧅",
    totalDays: 120,
    idealTemp: { min: 13, max: 24 },
    idealHumidity: { min: 50, max: 70 },
    waterRequirement: "medium",
    stages: [
      {
        name: "Seed Sowing / Nursery",
        startDay: 1,
        endDay: 35,
        color: "#a78bfa",
        icon: "🌱",
        description: "Seeds germinate in nursery beds",
        tasks: {
          daily: [
            { time: "06:30", task: "Water nursery bed with rose can — keep moist" },
            { time: "17:00", task: "Check for damping-off disease; remove affected seedlings" },
          ],
          weekly: [
            { task: "Apply Thiram (2g/kg seed) if fungal signs appear" },
            { task: "Thin crowded seedlings to 2cm spacing" },
          ],
        },
        climateAdaptations: {
          hotDay: "Shade nursery 50%; increase watering to 2x daily",
          coldNight: "Cover nursery with thin mulch; avoid evening watering",
          rain: "Cover with plastic sheet; ensure drainage channels are clear",
          drought: "Water 3x daily; apply mulch over nursery bed",
        },
      },
      {
        name: "Transplanting & Establishment",
        startDay: 36,
        endDay: 50,
        color: "#8b5cf6",
        icon: "⛏️",
        description: "Seedlings moved to main field",
        tasks: {
          daily: [
            { time: "07:00", task: "Water transplanted seedlings — 300ml each" },
            { time: "10:00", task: "Check for gaps — replant any dead seedlings" },
          ],
          weekly: [
            { task: "Apply basal fertilizer: 25kg urea + 50kg SSP per acre" },
            { task: "Weed control — critical in first 30 days" },
          ],
        },
        climateAdaptations: {
          hotDay: "Transplant evening only; irrigate twice daily for a week",
          coldNight: "Transplant morning; apply light straw mulch",
          rain: "Delay if heavy rain; ensure furrows drain quickly",
          drought: "Irrigate every 3 days; apply mulch immediately after planting",
        },
      },
      {
        name: "Bulb Initiation",
        startDay: 51,
        endDay: 90,
        color: "#d946ef",
        icon: "🔵",
        description: "Bulbs begin forming underground",
        tasks: {
          daily: [
            { time: "07:00", task: "Irrigate furrows — 3–4cm water depth" },
            { time: "09:30", task: "Scout for thrips (most damaging pest for onion)" },
          ],
          everyOtherDay: [
            { task: "Spray Spinosad 0.3ml/L for thrips control" },
          ],
          weekly: [
            { task: "Apply 25kg urea per acre as top dressing" },
            { task: "Hilling: earth up soil around base to protect bulbs" },
            { task: "Remove flower stalks (bolters) immediately" },
          ],
        },
        climateAdaptations: {
          hotDay: "Irrigate more frequently; high heat causes small bulbs",
          coldNight: "Good for bulb development — no change needed",
          rain: "Reduce irrigation; spray mancozeb for purple blotch disease",
          drought: "Bulb size directly linked to water — do not miss irrigation",
        },
      },
      {
        name: "Bulb Maturation",
        startDay: 91,
        endDay: 110,
        color: "#f97316",
        icon: "🧅",
        description: "Bulbs swell and tops start falling",
        tasks: {
          daily: [
            { time: "07:30", task: "Reduce irrigation — stop when 50% of tops fall over" },
            { time: "16:00", task: "Monitor tops — yellowing/falling indicates readiness" },
          ],
          weekly: [
            { task: "Stop all nitrogen fertilizer; potassium only if needed" },
            { task: "Spray 0.2% calcium chloride for better keeping quality" },
          ],
        },
        climateAdaptations: {
          hotDay: "Good — accelerates maturation naturally",
          coldNight: "Slow maturation — delay harvest slightly",
          rain: "Do not harvest in wet soil — wait 2–3 dry days after rain",
          drought: "Perfect conditions for curing — no change",
        },
      },
      {
        name: "Harvest & Curing",
        startDay: 111,
        endDay: 120,
        color: "#b45309",
        icon: "🧺",
        description: "Uproot and dry bulbs in field",
        tasks: {
          daily: [
            { time: "07:00", task: "Harvest when 75% tops have fallen; uproot carefully" },
            { time: "09:00", task: "Spread bulbs in field rows for curing (3–5 days)" },
            { time: "16:00", task: "Turn bulbs for even sun exposure" },
          ],
          weekly: [
            { task: "After curing, top and tail bulbs; bag in mesh sacks" },
            { task: "Grade: A-grade (>60mm), B-grade (40–60mm)" },
          ],
        },
        climateAdaptations: {
          hotDay: "Ideal for field curing — 5 days is enough",
          coldNight: "Extend curing to 7 days; ensure no moisture accumulation",
          rain: "Move bulbs under shed; do not let wet bulbs sit on soil",
          drought: "Perfect curing weather — proceed normally",
        },
      },
    ],
  },

  rice: {
    name: "Rice (Paddy)",
    emoji: "🌾",
    totalDays: 130,
    idealTemp: { min: 20, max: 35 },
    idealHumidity: { min: 60, max: 85 },
    waterRequirement: "high",
    stages: [
      {
        name: "Nursery Preparation",
        startDay: 1,
        endDay: 25,
        color: "#86efac",
        icon: "🌱",
        description: "Seed germination and nursery raising",
        tasks: {
          daily: [
            { time: "07:00", task: "Maintain 2–3cm water level in nursery bed" },
            { time: "16:00", task: "Check for bird damage; use scaring devices if needed" },
          ],
          weekly: [
            { task: "Apply urea 10g/sqm to nursery at 10 days after sowing" },
            { task: "Spray Carbofuran 3G for stem borer prevention" },
          ],
        },
        climateAdaptations: {
          hotDay: "Increase water depth to 4cm; check for seedling wilting",
          coldNight: "Drain water at night; refill in morning",
          rain: "Natural rain helps — monitor for overflow drainage",
          drought: "Fill nursery channels twice daily from water source",
        },
      },
      {
        name: "Transplanting",
        startDay: 26,
        endDay: 35,
        color: "#4ade80",
        icon: "⛏️",
        description: "Pull and transplant 2–3 seedlings per hill",
        tasks: {
          daily: [
            { time: "06:00", task: "Prepare main field — puddle and level if not done" },
            { time: "07:00", task: "Transplant 2–3 seedlings/hill at 20x15cm spacing" },
            { time: "17:00", task: "Flood field to 3–4cm after transplanting" },
          ],
          weekly: [
            { task: "Apply basal fertilizer: 25kg DAP per acre before transplanting" },
            { task: "Gap filling — replant missing hills within 7 days" },
          ],
        },
        climateAdaptations: {
          hotDay: "Transplant early morning or after 4pm; maintain water level",
          coldNight: "Transplant morning; ensure field is flooded for warmth",
          rain: "Good for transplanting — take advantage",
          drought: "Prioritize water for field flooding; delay if no water available",
        },
      },
      // ... other rice stages truncated for brevity in this file
    ],
  },

  wheat: {
    name: "Wheat",
    emoji: "🌾",
    totalDays: 120,
    idealTemp: { min: 10, max: 25 },
    idealHumidity: { min: 40, max: 65 },
    waterRequirement: "medium",
    stages: [
      {
        name: "Sowing & Germination",
        startDay: 1,
        endDay: 12,
        color: "#fde68a",
        icon: "🌱",
        description: "Seeds sown directly in field",
        tasks: {
          daily: [
            { time: "07:00", task: "Check soil moisture — germination requires consistent moisture" },
            { time: "17:00", task: "Watch for crows/birds pulling seeds — install bird scarer" },
          ],
          weekly: [
            { task: "Pre-sowing irrigation (planking) if soil is dry" },
            { task: "Apply basal dose: 60kg DAP + 30kg Muriate of Potash/acre" },
          ],
        },
        climateAdaptations: {
          hotDay: "Sow deeper (6cm) to protect from heat; irrigate immediately",
          coldNight: "Good for wheat — germination improves in cool weather",
          rain: "Delay sowing if heavy rain; waterlogged germination is poor",
          drought: "Irrigate before sowing (pre-sowing irrigation essential)",
        },
      },
      // other wheat stages truncated
    ],
  },

  potato: {
    name: "Potato",
    emoji: "🥔",
    totalDays: 100,
    idealTemp: { min: 10, max: 22 },
    idealHumidity: { min: 50, max: 80 },
    waterRequirement: "medium",
    stages: [
      {
        name: "Seed Preparation & Planting",
        startDay: 1,
        endDay: 15,
        color: "#fcd34d",
        icon: "🌱",
        description: "Seed tubers planted in prepared beds",
        tasks: {
          daily: [
            { time: "07:00", task: "Check soil temperature — plant only when soil > 7°C" },
            { time: "16:00", task: "Water lightly if soil is dry — do not waterlog" },
          ],
          weekly: [
            { task: "Apply FYM 10 tonnes/acre + NPK 60:80:80 kg/acre as basal" },
            { task: "Treat seed tubers with Mancozeb 3g/L before planting" },
          ],
        },
        climateAdaptations: {
          hotDay: "Do not plant in hot weather — potatoes need cool soil to initiate",
          coldNight: "Perfect — cool nights encourage tuber initiation",
          rain: "Good if moderate; waterlogged seed will rot",
          drought: "Pre-planting irrigation essential for good emergence",
        },
      },
    ],
  },

  maize: {
    name: "Maize (Corn)",
    emoji: "🌽",
    totalDays: 95,
    idealTemp: { min: 18, max: 32 },
    idealHumidity: { min: 50, max: 80 },
    waterRequirement: "medium",
    stages: [
      {
        name: "Germination",
        startDay: 1,
        endDay: 10,
        color: "#fde68a",
        icon: "🌱",
        tasks: {
          daily: [
            { time: "07:00", task: "Check soil moisture — maize needs warm, moist soil" },
          ],
          weekly: [
            { task: "Basal dose: NPK 40:60:20 kg/acre at sowing" },
          ],
        },
        climateAdaptations: {
          hotDay: "Sow 5cm deep in hot conditions; irrigate to cool soil",
          coldNight: "Delay sowing if soil temp < 10°C — poor germination",
          rain: "Excellent — sow immediately after rain",
          drought: "Pre-sow irrigation mandatory",
        },
      },
    ],
  },
}

export const CROP_LIST = Object.entries(CROPS).map(([key, val]: any) => ({ key, name: val.name, emoji: val.emoji, totalDays: val.totalDays }))

export function getStageForDay(cropKey: string, dayNumber: number) {
  const crop = (CROPS as any)[cropKey]
  if (!crop) return null
  return crop.stages.find((s: any) => dayNumber >= s.startDay && dayNumber <= s.endDay) || null
}

export function getTasksForDay(cropKey: string, dayNumber: number, weatherCondition: string | null = null) {
  const stage = getStageForDay(cropKey, dayNumber)
  if (!stage) return { stage: null, tasks: [], adaptation: null }

  const tasks: any[] = []
  const dayInStage = dayNumber - stage.startDay + 1

  if (stage.tasks.daily) {
    stage.tasks.daily.forEach((t: any) => tasks.push({ ...t, frequency: 'daily', priority: 'high' }))
  }
  if (stage.tasks.everyOtherDay && dayInStage % 2 === 0) {
    stage.tasks.everyOtherDay.forEach((t: any) => tasks.push({ ...t, time: '08:30', frequency: 'every 2 days', priority: 'medium' }))
  }
  if (stage.tasks.weekly && dayInStage % 7 === 1) {
    stage.tasks.weekly.forEach((t: any) => tasks.push({ ...t, time: '09:00', frequency: 'weekly', priority: 'low' }))
  }

  let adaptation = null
  if (weatherCondition && stage.climateAdaptations) {
    adaptation = (stage.climateAdaptations as any)[weatherCondition] || null
  }

  return { stage, tasks, adaptation }
}

export default CROPS
