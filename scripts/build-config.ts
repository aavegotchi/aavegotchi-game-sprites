import fs from "node:fs";

interface ConfigProperty {
  key: string;
  folder: string;
  order?: number;
  next?: boolean;
}

interface ConditionKV {
  keys?: string[];
  values?: string[];
}

interface ConditionSet {
  keys_and_values?: ConditionKV[];
  provides?: unknown[];
  properties?: ConfigProperty[];
  order?: number;
}

interface OutputConfig {
  required_keys: string[];
  settings: { id_key: string };
  if_ids: number[];
  if_keys_and_values: ConditionSet[];
  basic: { provides: unknown[]; properties: ConfigProperty[] };
}

const baseBodies = [
  "aAAVE",
  "aDAI",
  "aWETH",
  "aLINK",
  "aUSDT",
  "aUSDC",
  "aTUSD",
  "aUNI",
  "aYFI",
  "amWMATIC",
  "amWETH",
  "amWBTC",
];

const rarityBuckets = [
  "uncommon_low",
  "uncommon_high",
  "rare_low",
  "rare_high",
  "mythical_low",
  "mythical_high",
];

function propsMythicHigh(cycle: string, base: string): ConfigProperty[] {
  return [
    { key: "Base Body", folder: `${cycle}/Base Body`, order: 0 },
    { key: "Wearable (Body)", folder: `${cycle}/Wearable (Body)`, order: 1 },
    { key: "Eye Color", folder: `${cycle}/mythic_high_${base}`, order: 2 },
    { key: "Wearable (Head)", folder: `${cycle}/Wearable (Head)`, order: 3 },
    {
      key: "Wearable (Helmet)",
      folder: `${cycle}/Wearable (Helmet)`,
      order: 3,
    },
    { key: "Wearable (Eyes)", folder: `${cycle}/Wearable (Eyes)`, order: 4 },
    { key: "Wearable (Face)", folder: `${cycle}/Wearable (Face)`, order: 5 },
    {
      key: "Wearable (Hands)",
      folder: `${cycle}/Wearable (Hands)`,
      next: true,
      order: 6,
    },
    {
      key: "Wearable (Hands)",
      folder: `${cycle}/Wearable (Hands) L`,
      order: 7,
    },
    { key: "Wearable (Pet)", folder: `${cycle}/Wearable (Pet)`, order: -1 },
  ];
}

function propsCommon(cycle: string, base: string): ConfigProperty[] {
  return [
    { key: "Base Body", folder: `${cycle}/Base Body`, order: 0 },
    { key: "Wearable (Body)", folder: `${cycle}/Wearable (Body)`, order: 1 },
    { key: "Eye Shape", folder: `${cycle}/common/${base}`, order: 2 },
    { key: "Wearable (Head)", folder: `${cycle}/Wearable (Head)`, order: 3 },
    {
      key: "Wearable (Helmet)",
      folder: `${cycle}/Wearable (Helmet)`,
      order: 3,
    },
    { key: "Wearable (Eyes)", folder: `${cycle}/Wearable (Eyes)`, order: 4 },
    { key: "Wearable (Face)", folder: `${cycle}/Wearable (Face)`, order: 5 },
    {
      key: "Wearable (Hands)",
      folder: `${cycle}/Wearable (Hands)`,
      next: true,
      order: 6,
    },
    {
      key: "Wearable (Hands)",
      folder: `${cycle}/Wearable (Hands) L`,
      order: 7,
    },
    { key: "Wearable (Pet)", folder: `${cycle}/Wearable (Pet)`, order: -1 },
  ];
}

function propsRarity(cycle: string, rarity: string): ConfigProperty[] {
  return [
    { key: "Base Body", folder: `${cycle}/Base Body`, order: 0 },
    { key: "Wearable (Body)", folder: `${cycle}/Wearable (Body)`, order: 1 },
    { key: "Eye Shape", folder: `${cycle}/${rarity}`, order: 2 },
    { key: "Wearable (Head)", folder: `${cycle}/Wearable (Head)`, order: 3 },
    {
      key: "Wearable (Helmet)",
      folder: `${cycle}/Wearable (Helmet)`,
      order: 3,
    },
    { key: "Wearable (Eyes)", folder: `${cycle}/Wearable (Eyes)`, order: 4 },
    { key: "Wearable (Face)", folder: `${cycle}/Wearable (Face)`, order: 5 },
    {
      key: "Wearable (Hands)",
      folder: `${cycle}/Wearable (Hands)`,
      next: true,
      order: 6,
    },
    {
      key: "Wearable (Hands)",
      folder: `${cycle}/Wearable (Hands) L`,
      order: 7,
    },
    { key: "Wearable (Pet)", folder: `${cycle}/Wearable (Pet)`, order: -1 },
  ];
}

function build(): OutputConfig {
  const cfg: OutputConfig = {
    required_keys: [],
    settings: { id_key: "id" },
    if_ids: [],
    if_keys_and_values: [],
    basic: {
      provides: [],
      properties: [
        { key: "Base Body", folder: "punchbody/Base Body", order: 0 },
        {
          key: "Wearable (Body)",
          folder: "punchbody/Wearable (Body)",
          order: 1,
        },
        { key: "Eye Shape", folder: "punchbody/uncommon_low", order: 7 },
        {
          key: "Wearable (Head)",
          folder: "punchbody/Wearable (Head)",
          order: 2,
        },
        {
          key: "Wearable (Eyes)",
          folder: "punchbody/Wearable (Eyes)",
          order: 3,
        },
        {
          key: "Wearable (Face)",
          folder: "punchbody/Wearable (Face)",
          order: 4,
        },
        {
          key: "Wearable (Hands) R",
          folder: "punchbody/Wearable (Hands) R",
          order: 5,
        },
        {
          key: "Wearable (Hands) L",
          folder: "punchbody/Wearable (Hands) L",
          order: 6,
        },
        { key: "Wearable (Pet)", folder: "punchbody/Wearable (Pet)", order: 7 },
      ],
    },
  };

  // meleebody: mythic_high with Base Body
  for (const base of baseBodies) {
    cfg.if_keys_and_values.push({
      keys_and_values: [
        { keys: ["Wearable (Hands)"], values: [] },
        { keys: ["Eye Shape"], values: ["mythic_high"] },
        { keys: ["Base Body"], values: [base] },
      ],
      provides: [],
      properties: propsMythicHigh("meleebody", base),
      order: 1,
    });
  }

  // meleebody: common with Base Body
  for (const base of baseBodies) {
    cfg.if_keys_and_values.push({
      keys_and_values: [
        { keys: ["Wearable (Hands)"], values: [] },
        { keys: ["Eye Color"], values: ["common"] },
        { keys: ["Base Body"], values: [base] },
      ],
      provides: [],
      properties: propsCommon("meleebody", base),
      order: 2,
    });
  }

  // meleebody: other rarities
  for (const rarity of rarityBuckets) {
    cfg.if_keys_and_values.push({
      keys_and_values: [
        { keys: ["Wearable (Hands)"], values: [] },
        { keys: ["Eye Color"], values: [rarity] },
      ],
      provides: [],
      properties: propsRarity("meleebody", rarity),
      order: 3,
    });
  }

  // punchbody: mythic_high with Base Body
  for (const base of baseBodies) {
    cfg.if_keys_and_values.push({
      keys_and_values: [
        { keys: ["Eye Shape"], values: ["mythic_high"] },
        { keys: ["Base Body"], values: [base] },
      ],
      provides: [],
      properties: propsMythicHigh("punchbody", base),
      order: 4,
    });
  }

  // punchbody: common with Base Body
  for (const base of baseBodies) {
    cfg.if_keys_and_values.push({
      keys_and_values: [
        { keys: ["Eye Color"], values: ["common"] },
        { keys: ["Base Body"], values: [base] },
      ],
      provides: [],
      properties: propsCommon("punchbody", base),
      order: 5,
    });
  }

  // punchbody: other rarities
  for (const rarity of rarityBuckets) {
    cfg.if_keys_and_values.push({
      keys_and_values: [{ keys: ["Eye Color"], values: [rarity] }],
      provides: [],
      properties: propsRarity("punchbody", rarity),
      order: 6,
    });
  }

  return cfg;
}

const config = build();
fs.writeFileSync("config.generated.json", JSON.stringify(config, null, 4));
console.log("Wrote config.generated.json");
