import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  Config,
  ConditionSet,
  Gotchi,
  GotchiAttribute,
  GenerationResult,
} from "./types.js";

function loadConfig(configPath: string): Config {
  const data = fs.readFileSync(configPath, "utf8");
  return JSON.parse(data) as Config;
}

function loadGotchis(jsonPath: string): Gotchi[] {
  const data = fs.readFileSync(jsonPath, "utf8");
  return JSON.parse(data) as Gotchi[];
}

function normalizeAttributes(
  originalAttributes: GotchiAttribute[]
): GotchiAttribute[] {
  const normalized: GotchiAttribute[] = [];
  let hasPet = originalAttributes.some(
    (attr) => attr.trait_type === "Wearable (Pet)" && attr.value.trim() !== ""
  );

  for (const attr of originalAttributes) {
    if (attr.trait_type === "Wearable (Body)" && attr.value === "Foxy Tail") {
      if (hasPet) {
        // Skip mis-slotted Foxy Tail if a proper pet is already present
        continue;
      }
      normalized.push({ trait_type: "Wearable (Pet)", value: attr.value });
      hasPet = true;
      continue;
    }
    normalized.push(attr);
  }

  return normalized;
}

function matchCondition(
  gotchiAttributes: GotchiAttribute[],
  conditionSet: ConditionSet
): boolean {
  const maticMapping: Record<string, string> = {
    amUSDT: "aUSDT",
    amAAVE: "aAAVE",
    amDAI: "aDAI",
    amUSDC: "aUSDC",
  };

  for (const condition of conditionSet.keys_and_values || []) {
    const keys = condition.keys || [];
    const values = condition.values || [];

    for (const key of keys) {
      if (values.length > 0) {
        const attrValues = gotchiAttributes
          .filter((attr) => attr.trait_type === key)
          .map((attr) => maticMapping[attr.value] || attr.value);

        if (!attrValues.some((val) => values.includes(val))) return false;
      } else {
        const hasKey = gotchiAttributes.some((attr) => attr.trait_type === key);
        if (!hasKey) return false;
      }
    }
  }
  return true;
}

function findMatchingConfig(
  gotchiAttributes: GotchiAttribute[],
  config: Config
): ConditionSet | null {
  for (const conditionSet of config.if_keys_and_values || []) {
    if (matchCondition(gotchiAttributes, conditionSet)) return conditionSet;
  }
  return null;
}

function getImagePath(
  basePath: string,
  folder: string,
  traitValue: string
): string | null {
  const maticMapping: Record<string, string> = {
    amUSDT: "aUSDT",
    amAAVE: "aAAVE",
    amDAI: "aDAI",
    amUSDC: "aUSDC",
  };

  const mappedValue = maticMapping[traitValue] || traitValue;
  const traitsBase = path.join(basePath, "Trait Files", "Sprites");
  const searchPath = path.join(traitsBase, ...folder.split("/"));

  const possibleExtensions = [".png", ".PNG", ".jpg", ".JPG", ".jpeg", ".JPEG"];

  for (const ext of possibleExtensions) {
    const imagePath = path.join(searchPath, `${mappedValue}${ext}`);
    if (fs.existsSync(imagePath)) return imagePath;
  }

  if (fs.existsSync(searchPath) && fs.statSync(searchPath).isDirectory()) {
    const files = fs.readdirSync(searchPath);
    for (const file of files) {
      const fileName = path.parse(file).name;
      if (fileName.toLowerCase() === mappedValue.toLowerCase()) {
        return path.join(searchPath, file);
      }
    }
  }

  return null;
}

function mapHandToProjectile(value: string): string {
  // Alias table for any hand->projectile name differences. Defaults to identity.
  const aliases: Record<string, string> = {
    // "Common Wizard Staff": "Common Wizard Staff",
    // Add overrides here if wearable name differs from projectile filename
  };
  return aliases[value] ?? value;
}

function getCollateralTint(
  baseBody: string
): { r: number; g: number; b: number } | null {
  // Minimal mapping: only apply where generic rarity art is visibly wrong (e.g., aAAVE turns blue)
  const table: Record<string, { r: number; g: number; b: number }> = {
    aAAVE: { r: 220, g: 120, b: 255 },
  };
  return table[baseBody] ?? null;
}

const TOTAL_ROWS = 6;

function getProjectileOffsets(name: string): { x: number; y: number } {
  // Base offsets to align projectile with hand; positive x => right, positive y => down
  const base = { x: 24, y: 30 };
  const overrides: Record<string, { x: number; y: number }> = {
    // Example: "Witchy Wand": { x: 14, y: 20 },
  };
  return overrides[name] ?? base;
}

async function generateSpritesheet(
  gotchi: Gotchi,
  config: Config,
  basePath: string,
  outputFolder: string,
  verbose = false
): Promise<GenerationResult> {
  const attributes = normalizeAttributes(gotchi.attributes);
  const matchingConfig = findMatchingConfig(attributes, config);

  if (!matchingConfig) {
    return {
      success: false,
      error: "No matching configuration found",
      details: {
        // Add a helpful detail for debugging
        layersUsed: attributes.map((a) => `${a.trait_type}: ${a.value}`),
      },
    };
  }

  const layerOrder = [
    "Base Body",
    "Eye Shape",
    "Eye Color",
    "Wearable (Body)",
    "Wearable (Face)",
    "Wearable (Eyes)",
    "Wearable (Head)",
    "Wearable (Hands) L",
    "Wearable (Hands) R",
    "Wearable (Pet)",
    "Projectile",
  ];

  const propertyMap: Record<string, { key: string; folder: string }> = {};
  for (const prop of matchingConfig.properties || []) {
    propertyMap[prop.key] = prop;
  }

  // Ensure Eye Color overlay is available even when not specified by the config.
  // Many legacy configs encoded color inside Eye Shape under common/<base>, but we now
  // resolve Eye Shape by rarity folders. To preserve correct coloring, provide a
  // default Eye Color folder that contains per-base color overlays keyed by rarity.
  if (!propertyMap["Eye Color"]) {
    const eyeShapeAttr = attributes.find((a) => a.trait_type === "Eye Shape");
    const eyeShapeValue = eyeShapeAttr?.value ?? "";
    // Only auto-add Eye Color for 'common*' eye shapes. Non-common eye shapes already
    // encode color in their sprites and adding Eye Color would double-tint them.
    const shouldAddEyeColor = /^common/.test(eyeShapeValue);
    if (shouldAddEyeColor) {
      const maticMappingLocal: Record<string, string> = {
        amUSDT: "aUSDT",
        amAAVE: "aAAVE",
        amDAI: "aDAI",
        amUSDC: "aUSDC",
      };
      const baseBodyAttr = attributes.find((a) => a.trait_type === "Base Body");
      const baseBody = baseBodyAttr
        ? maticMappingLocal[baseBodyAttr.value] || baseBodyAttr.value
        : undefined;
      // Derive cycle from Base Body folder when available, otherwise fall back to Eye Shape
      const baseFolderForCycle =
        propertyMap["Base Body"]?.folder || propertyMap["Eye Shape"]?.folder;
      const cycle = baseFolderForCycle
        ? baseFolderForCycle.split("/")[0]
        : "punchbody";
      if (baseBody) {
        propertyMap["Eye Color"] = {
          key: "Eye Color",
          folder: `${cycle}/mythic_high_${baseBody}`,
        } as { key: string; folder: string };
      }
    }
  }

  let compositeImage: sharp.Sharp | null = null;
  const layersUsed: string[] = [];
  const layerBuffers: sharp.OverlayOptions[] = [];
  const missingImages: string[] = [];
  const loadErrors: string[] = [];
  const projectilePaths: string[] = [];

  const handWearables = attributes.filter(
    (attr) => attr.trait_type === "Wearable (Hands)"
  );

  // Decide which hand(s) should render when only a single hand item is present.
  // If both hands are present, map first to L and second to R. If only one is present,
  // prefer the side that actually has an asset; if both sides exist, default to R.
  let selectedLeft: GotchiAttribute | null = null;
  let selectedRight: GotchiAttribute | null = null;
  const handsPropForSelection = propertyMap["Wearable (Hands)"];
  if (handsPropForSelection) {
    const baseFolderParts = handsPropForSelection.folder.split("/");
    const folderBase = baseFolderParts
      .slice(0, baseFolderParts.length - 1)
      .join("/");
    const folderLForSelection = `${folderBase}/Wearable (Hands) L`;
    const folderRForSelection = `${folderBase}/Wearable (Hands) R`;

    if (handWearables.length >= 2) {
      selectedLeft = handWearables[0];
      selectedRight = handWearables[1];
    } else if (handWearables.length === 1) {
      const single = handWearables[0];
      const imageR = getImagePath(basePath, folderRForSelection, single.value);
      const imageL = getImagePath(basePath, folderLForSelection, single.value);
      if (imageR && !imageL) selectedRight = single;
      else if (!imageR && imageL) selectedLeft = single;
      else selectedRight = single; // both/neither found: default to right hand
    }
  }

  for (const traitKey of layerOrder) {
    let prop = propertyMap[traitKey];
    let matchingAttributes: (GotchiAttribute | undefined)[] = [];
    let folder: string | null = null;
    let eyeShapeTint: { r: number; g: number; b: number } | null = null;

    if (traitKey === "Wearable (Hands) L") {
      prop = propertyMap["Wearable (Hands)"];
      if (prop && selectedLeft) {
        matchingAttributes = [selectedLeft];
        const baseFolderParts = prop.folder.split("/");
        baseFolderParts[baseFolderParts.length - 1] = "Wearable (Hands) L";
        folder = baseFolderParts.join("/");
        if (verbose)
          console.log(
            `  Processing left hand: ${selectedLeft.value} from ${folder}`
          );
      }
    } else if (traitKey === "Wearable (Hands) R") {
      prop = propertyMap["Wearable (Hands)"];
      if (prop && selectedRight) {
        matchingAttributes = [selectedRight];
        const baseFolderParts = prop.folder.split("/");
        baseFolderParts[baseFolderParts.length - 1] = "Wearable (Hands) R";
        folder = baseFolderParts.join("/");
        if (verbose)
          console.log(
            `  Processing right hand: ${selectedRight.value} from ${folder}`
          );
      }
    } else if (traitKey === "Projectile") {
      // Special-case: composite projectile overlays based on selected hand item(s)
      const projectileFolder = "projectiles"; // under Trait Files/Sprites
      const handCandidates: string[] = [];
      if (selectedRight) handCandidates.push(selectedRight.value);
      if (selectedLeft) handCandidates.push(selectedLeft.value);

      // Try right first, then left; composite both if available
      for (const handName of handCandidates) {
        const projectileName = mapHandToProjectile(handName);
        const imagePath = getImagePath(
          basePath,
          projectileFolder,
          projectileName
        );
        if (imagePath) {
          try {
            // Do not composite; record path for viewer overlay
            projectilePaths.push(imagePath);
            layersUsed.push(`ProjectileRef: ${projectileName}`);
            if (verbose)
              console.log(
                `    Found projectile ref: ${projectileName} at ${imagePath}`
              );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            loadErrors.push(`Projectile/${projectileName}: ${message}`);
            if (verbose)
              console.log(
                `    Error loading: Projectile/${projectileName}: ${message}`
              );
          }
        } else {
          missingImages.push(
            `Projectile/${projectileName} in ${projectileFolder}`
          );
          if (verbose)
            console.log(
              `    Missing image: Projectile/${projectileName} in ${projectileFolder}`
            );
        }
      }
      continue;
    } else {
      if (prop) {
        matchingAttributes = attributes.filter(
          (attr) => attr.trait_type === traitKey
        );
        folder = prop.folder;

        // Special handling for Eye Shape: determine the correct folder based on the Eye Shape value
        if (
          traitKey === "Eye Shape" &&
          matchingAttributes.length > 0 &&
          matchingAttributes[0]
        ) {
          const eyeShapeValue = matchingAttributes[0].value;
          // Extract rarity from Eye Shape value (e.g., "rare_high_3" -> "rare_high")
          const rarityMatch = eyeShapeValue.match(
            /^(uncommon_low|uncommon_high|rare_low|rare_high|mythical_low|mythical_high|mythic_low|mythic_high|common)/
          );
          if (rarityMatch) {
            const rawRarity = rarityMatch[1];
            // Normalize mythic_* -> mythical_* to match directory names
            const normalizedRarity = rawRarity.startsWith("mythic_")
              ? rawRarity.replace(/^mythic_/, "mythical_")
              : rawRarity;

            // Extract the cycle name from the prop folder (e.g., "meleebody/common/amWETH" -> "meleebody")
            const folderParts = prop.folder.split("/");
            const cycle = folderParts[0];
            const baseFromProp = folderParts.includes("common")
              ? folderParts[folderParts.length - 1]
              : null;

            // For 'common', assets live under cycle/common/<token>/common_?.png
            // Keep the configured folder (which includes the token) instead of dropping it.
            if (normalizedRarity === "common") {
              folder = prop.folder;
            } else {
              // Prefer collateral-specific art if it exists under common/<base>
              const maticMappingLocal: Record<string, string> = {
                amUSDT: "aUSDT",
                amAAVE: "aAAVE",
                amDAI: "aDAI",
                amUSDC: "aUSDC",
              };
              const baseBodyAttr = attributes.find(
                (a) => a.trait_type === "Base Body"
              );
              const baseBody = baseBodyAttr
                ? maticMappingLocal[baseBodyAttr.value] || baseBodyAttr.value
                : baseFromProp;

              let chosenFolder = `${cycle}/${normalizedRarity}`;
              if (baseBody) {
                const preferred = `${cycle}/common/${baseBody}`;
                const preferredPath = getImagePath(
                  basePath,
                  preferred,
                  eyeShapeValue
                );
                if (preferredPath) {
                  chosenFolder = preferred;
                } else {
                  // No collateral-specific asset: use rarity folder and tint to base color if known
                  const tint = getCollateralTint(baseBody);
                  if (tint) eyeShapeTint = tint;
                }
              }
              folder = chosenFolder;
            }
          }
        }
      }
    }

    if (!prop || matchingAttributes.length === 0 || !folder) continue;

    for (const attr of matchingAttributes) {
      if (!attr) continue;
      const traitValue = attr.value;
      const imagePath = getImagePath(basePath, folder, traitValue);

      if (imagePath) {
        try {
          let imageBuffer = await sharp(imagePath).png().toBuffer();
          if (traitKey === "Eye Shape" && eyeShapeTint) {
            if (verbose)
              console.log(
                `    Tinting Eye Shape to base color rgb(${eyeShapeTint.r},${eyeShapeTint.g},${eyeShapeTint.b})`
              );
            imageBuffer = await sharp(imageBuffer)
              .tint(eyeShapeTint)
              .png()
              .toBuffer();
          }
          const metadata = await sharp(imageBuffer).metadata();

          if (!compositeImage) {
            compositeImage = sharp({
              create: {
                width: metadata.width as number,
                height: metadata.height as number,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              },
            });
          }

          layerBuffers.push({ input: imageBuffer });
          const layerLabel =
            traitKey.includes("Hands") && traitKey !== "Wearable (Hands)"
              ? `${traitKey}: ${traitValue}`
              : `${attr.trait_type}: ${traitValue}`;
          layersUsed.push(layerLabel);
          if (verbose)
            console.log(`    Found and added: ${layerLabel} from ${imagePath}`);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          loadErrors.push(`${traitKey}/${traitValue}: ${message}`);
          if (verbose)
            console.log(
              `    Error loading: ${traitKey}/${traitValue}: ${message}`
            );
        }
      } else if (traitValue) {
        missingImages.push(`${traitKey}/${traitValue} in ${folder}`);
        if (verbose)
          console.log(
            `    Missing image: ${traitKey}/${traitValue} in ${folder}`
          );
      }
    }
  }

  if (compositeImage && layerBuffers.length > 0) {
    try {
      const outputPath = path.join(outputFolder, `${gotchi.id}.png`);
      await compositeImage.composite(layerBuffers).png().toFile(outputPath);
      return {
        success: true,
        details: {
          layersUsed,
          missingImages,
          loadErrors,
          projectiles: projectilePaths,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to save spritesheet: ${message}`,
        details: {
          layersUsed,
          missingImages,
          loadErrors,
          projectiles: projectilePaths,
        },
      };
    }
  } else {
    return {
      success: false,
      error: "No layers found to composite",
      details: {
        layersUsed,
        missingImages,
        loadErrors,
        projectiles: projectilePaths,
      },
    };
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(
      "Usage: node generate_spritesheets.js <input_json_file> [options]"
    );
    console.log(
      'Example: node generate_spritesheets.js "processedAavegotchis.json"'
    );
    console.log("Options:");
    console.log("  --limit <n>      Process only first n gotchis");
    console.log(
      "  --ids <id1,id2>  Process only specific IDs (comma-separated)"
    );
    console.log("  --start <n>      Start processing from gotchi at index n");
    console.log(
      "  --batch <n>      Number of gotchis to process in parallel (default: 10)"
    );
    console.log("  --verbose        Show detailed layer information");
    console.log("");
    console.log("Example with all gotchis in batches of 20:");
    console.log(
      '  node generate_spritesheets.js "processedAavegotchis.json" --batch 20'
    );
    process.exit(1);
  }

  const inputJson = args[0];
  const configFile = "config.json";
  const outputFolder = "website/spritesheets";
  const basePath = ".";

  let limit: number | null = null;
  let specificIds: number[] | null = null;
  let startIndex = 0;
  let verbose = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--ids" && args[i + 1]) {
      specificIds = args[i + 1]
        .split(",")
        .map((id) => parseInt(id))
        .filter((n) => !Number.isNaN(n));
      i++;
    } else if (args[i] === "--start" && args[i + 1]) {
      startIndex = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--verbose") {
      verbose = true;
    }
  }

  if (!fs.existsSync(inputJson)) {
    console.log(`Error: Input file '${inputJson}' not found`);
    process.exit(1);
  }

  if (!fs.existsSync(configFile)) {
    console.log(`Error: Config file '${configFile}' not found`);
    process.exit(1);
  }

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  console.log(`Loading configuration from ${configFile}...`);
  const config = loadConfig(configFile);

  console.log(`Loading gotchis from ${inputJson}...`);
  let gotchis = loadGotchis(inputJson);

  if (specificIds) {
    gotchis = gotchis.filter((g) => specificIds!.includes(g.id));
    console.log(`Filtering to ${gotchis.length} specific gotchis`);
  }

  if (startIndex > 0) {
    gotchis = gotchis.slice(startIndex);
    console.log(`Starting from index ${startIndex}`);
  }

  if (limit) {
    gotchis = gotchis.slice(0, limit);
    console.log(`Limiting to ${gotchis.length} gotchis`);
  }

  const batchSize = args.includes("--batch")
    ? parseInt(args[args.indexOf("--batch") + 1]) || 10
    : 10;

  console.log(
    `Processing ${gotchis.length} gotchis in batches of ${batchSize}...`
  );
  console.log("-".repeat(50));

  let successCount = 0;
  let failCount = 0;
  const failedGotchis: Array<{
    id: number;
    attributes: GotchiAttribute[];
    error: string;
    details?: unknown;
  }> = [];
  const allMissingLayers: Array<{
    gotchiId: number;
    missingLayer: string;
    attributes: GotchiAttribute[];
  }> = [];

  const idToProjectiles: Record<number, string[]> = {};
  const uniqueProjectileFiles = new Set<string>();

  for (let i = 0; i < gotchis.length; i += batchSize) {
    const batch = gotchis.slice(i, Math.min(i + batchSize, gotchis.length));
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(gotchis.length / batchSize);

    console.log(
      `\nProcessing batch ${batchNum}/${totalBatches} (${batch.length} gotchis)...`
    );

    const batchResults = await Promise.all(
      batch.map(async (gotchi, index) => {
        try {
          const result = await generateSpritesheet(
            gotchi,
            config,
            basePath,
            outputFolder,
            verbose
          );

          if (
            result.details?.missingImages &&
            result.details.missingImages.length > 0
          ) {
            result.details.missingImages.forEach((missing) => {
              allMissingLayers.push({
                gotchiId: gotchi.id,
                missingLayer: missing,
                attributes: gotchi.attributes,
              });
            });
          }

          if (!result.success) {
            console.log(`  ✗ Failed gotchi ${gotchi.id}: ${result.error}`);
            return {
              success: false as const,
              gotchi,
              error: result.error ?? "Unknown error",
              details: result.details,
            };
          }

          if (verbose && result.details) {
            console.log(
              `  ✓ Completed gotchi ${
                gotchi.id
              } - Layers: ${result.details.layersUsed?.join(", ")}`
            );
          } else {
            console.log(
              `  ✓ Completed gotchi ${gotchi.id} (${i + index + 1}/${
                gotchis.length
              })`
            );
          }
          return { success: true as const, gotchi, details: result.details };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.log(`  ✗ Error processing gotchi ${gotchi.id}: ${message}`);
          return {
            success: false as const,
            gotchi,
            error: `Unexpected error: ${message}`,
          };
        }
      })
    );

    batchResults.forEach((result) => {
      if (result.success) {
        successCount++;
        const proj =
          result.details && Array.isArray(result.details.projectiles)
            ? result.details.projectiles
            : [];
        if (proj && proj.length > 0) {
          const rels = proj.map((abs: string) => {
            const base = path.parse(abs).base;
            uniqueProjectileFiles.add(base);
            return `projectiles/${base}`;
          });
          idToProjectiles[result.gotchi.id] = rels;
        }
      } else {
        failCount++;
        failedGotchis.push({
          id: result.gotchi.id,
          attributes: result.gotchi.attributes,
          error: result.error,
          details: result.details || {},
        });
      }
    });

    console.log(
      `Batch ${batchNum} complete: ${
        batchResults.filter((r) => r.success).length
      } succeeded, ${batchResults.filter((r) => !r.success).length} failed`
    );
  }

  console.log("\n" + "=".repeat(50));
  console.log("Processing complete!");
  console.log(`Successfully generated: ${successCount} spritesheets`);
  console.log(`Failed: ${failCount}`);
  console.log(`Output saved to: ${outputFolder}/`);

  if (failedGotchis.length > 0) {
    const failedLogPath = "failed_gotchis.json";
    fs.writeFileSync(failedLogPath, JSON.stringify(failedGotchis, null, 2));
    console.log(`\nFailed gotchis logged to: ${failedLogPath}`);
    console.log("Failed IDs:", failedGotchis.map((g) => g.id).join(", "));
  }

  if (allMissingLayers.length > 0) {
    const missingByItem: Record<
      string,
      { layer: string; count: number; gotchiIds: number[] }
    > = {};
    allMissingLayers.forEach((item) => {
      if (!missingByItem[item.missingLayer]) {
        missingByItem[item.missingLayer] = {
          layer: item.missingLayer,
          count: 0,
          gotchiIds: [],
        };
      }
      missingByItem[item.missingLayer].count++;
      missingByItem[item.missingLayer].gotchiIds.push(item.gotchiId);
    });

    const missingLayersSummary = Object.values(missingByItem).sort(
      (a, b) => b.count - a.count
    );

    const missingLayersLog = {
      totalMissing: allMissingLayers.length,
      uniqueMissingLayers: missingLayersSummary.length,
      summary: missingLayersSummary,
      detailed: allMissingLayers,
    };

    const missingLogPath = "missing_layers.json";
    fs.writeFileSync(missingLogPath, JSON.stringify(missingLayersLog, null, 2));
    console.log(`\nMissing layers logged to: ${missingLogPath}`);
    console.log(`Total missing layer instances: ${allMissingLayers.length}`);
    console.log(`Unique missing layers: ${missingLayersSummary.length}`);

    console.log("\nTop missing layers:");
    missingLayersSummary.slice(0, 5).forEach((item) => {
      console.log(`  - ${item.layer} (${item.count} gotchis)`);
    });
  }

  try {
    // Ensure unique projectile assets are available under website/projectiles
    const websiteRoot = path.dirname(outputFolder); // website/
    const projectilesOutDir = path.join(websiteRoot, "projectiles");
    if (!fs.existsSync(projectilesOutDir))
      fs.mkdirSync(projectilesOutDir, { recursive: true });
    uniqueProjectileFiles.forEach((fileName) => {
      // Source under Trait Files/Sprites/projectiles
      const srcPath = path.join(
        "Trait Files",
        "Sprites",
        "projectiles",
        fileName
      );
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(projectilesOutDir, fileName);
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch {}
      }
    });

    const outputFiles = fs.readdirSync(outputFolder);
    const spriteList = outputFiles
      .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
      .map((fileName) => path.parse(fileName).name)
      .filter((baseName) => /^\d+$/.test(baseName))
      .map((baseName) => {
        const id = parseInt(baseName, 10);
        return {
          id,
          path: `spritesheets/${baseName}.png`,
          projectiles: idToProjectiles[id] || [],
        };
      })
      .sort((a, b) => a.id - b.id);

    const listPath = path.join(outputFolder, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(spriteList, null, 2));
    console.log(`\nSprite list written to: ${listPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`\nWarning: Failed to write sprite list: ${message}`);
  }
}

// Execute only when run directly via tsx/node
if (import.meta.url === `file://${process.argv[1]}`) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

export { generateSpritesheet };
