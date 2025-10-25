import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  generateSpritesheet,
  type Gotchi,
  type Config,
} from "../dist/index.js";

function writePng(
  p: string,
  rgba: [number, number, number, number] = [255, 0, 0, 255]
) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const [r, g, b, a] = rgba;
  const img = sharp({
    create: {
      width: 8,
      height: 8,
      channels: 4,
      background: { r, g, b, alpha: a / 255 },
    },
  }).png();
  return img.toFile(p);
}

async function getCenterPixelHex(pngPath: string): Promise<string> {
  const buf = await sharp(pngPath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const data = buf.data as Buffer;
  const idx = (4 * 8 + 4) * 4; // center pixel for 8x8
  const r = data[idx],
    g = data[idx + 1],
    b = data[idx + 2];
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

describe("cycle selection", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gotchi-test-"));
  const basePath = tmp; // will contain Trait Files
  const outDir = path.join(tmp, "out");
  let testConfig: Config;

  beforeAll(async () => {
    fs.mkdirSync(outDir, { recursive: true });
    // minimal folder structure for two cycles: meleegunbody (green), wandbody (magenta)
    const cycles = [
      {
        name: "meleegunbody",
        color: [0, 255, 0, 255] as [number, number, number, number],
      }, // green
      {
        name: "wandbody",
        color: [255, 0, 255, 255] as [number, number, number, number],
      }, // magenta
    ];

    for (const c of cycles) {
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "Base Body",
          "aAAVE.png"
        ),
        c.color
      );
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "Wearable (Body)",
          "Marc Outfit.png"
        ),
        c.color
      );
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "rare_high",
          "uncommon_low_2.png"
        ),
        c.color
      );
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "Wearable (Head)",
          "Eagle Mask.png"
        ),
        c.color
      );
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "Wearable (Eyes)",
          "Sergey Eyes.png"
        ),
        c.color
      );
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "Wearable (Hands) R",
          "Energy Gun.png"
        ),
        c.color
      );
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "Wearable (Hands) L",
          "Energy Gun.png"
        ),
        c.color
      );
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "Wearable (Hands) R",
          "Witchy Wand.png"
        ),
        c.color
      );
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "Wearable (Hands) L",
          "Witchy Wand.png"
        ),
        c.color
      );
      await writePng(
        path.join(
          basePath,
          "Trait Files",
          "Sprites",
          c.name,
          "Wearable (Pet)",
          "Mythical Cacti.png"
        ),
        c.color
      );
    }

    // Purpose-built config: prefer gun cycle when Energy Gun present; otherwise wand when Witchy Wand present
    testConfig = {
      if_keys_and_values: [
        // meleegunbody other-rarity
        {
          keys_and_values: [
            { keys: ["Wearable (Hands)"], values: ["Energy Gun"] },
            { keys: ["Eye Color"], values: ["rare_high"] },
          ],
          properties: [
            { key: "Base Body", folder: "meleegunbody/Base Body", order: 0 },
            {
              key: "Wearable (Body)",
              folder: "meleegunbody/Wearable (Body)",
              order: 1,
            },
            { key: "Eye Shape", folder: "meleegunbody/rare_high", order: 2 },
            {
              key: "Wearable (Head)",
              folder: "meleegunbody/Wearable (Head)",
              order: 3,
            },
            {
              key: "Wearable (Eyes)",
              folder: "meleegunbody/Wearable (Eyes)",
              order: 4,
            },
            {
              key: "Wearable (Hands)",
              folder: "meleegunbody/Wearable (Hands)",
              order: 6,
            },
            {
              key: "Wearable (Pet)",
              folder: "meleegunbody/Wearable (Pet)",
              order: -1,
            },
          ],
        },
        // wandbody other-rarity
        {
          keys_and_values: [
            { keys: ["Wearable (Hands)"], values: ["Witchy Wand"] },
            { keys: ["Eye Color"], values: ["rare_high"] },
          ],
          properties: [
            { key: "Base Body", folder: "wandbody/Base Body", order: 0 },
            {
              key: "Wearable (Body)",
              folder: "wandbody/Wearable (Body)",
              order: 1,
            },
            { key: "Eye Shape", folder: "wandbody/rare_high", order: 2 },
            {
              key: "Wearable (Head)",
              folder: "wandbody/Wearable (Head)",
              order: 3,
            },
            {
              key: "Wearable (Eyes)",
              folder: "wandbody/Wearable (Eyes)",
              order: 4,
            },
            {
              key: "Wearable (Hands)",
              folder: "wandbody/Wearable (Hands)",
              order: 6,
            },
            {
              key: "Wearable (Pet)",
              folder: "wandbody/Wearable (Pet)",
              order: -1,
            },
          ],
        },
      ],
    } as unknown as Config;
  });

  afterAll(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {}
  });

  it("selects gun cycle when Energy Gun in hands", async () => {
    const gotchi: Gotchi = {
      id: 99901,
      collateral: "aAAVE",
      attributes: [
        { trait_type: "Base Body", value: "aAAVE" },
        { trait_type: "Eye Shape", value: "uncommon_low_2" },
        { trait_type: "Eye Color", value: "rare_high" },
        { trait_type: "Wearable (Body)", value: "Marc Outfit" },
        { trait_type: "Wearable (Eyes)", value: "Sergey Eyes" },
        { trait_type: "Wearable (Head)", value: "Eagle Mask" },
        { trait_type: "Wearable (Hands)", value: "Energy Gun" },
        { trait_type: "Wearable (Pet)", value: "Mythical Cacti" },
      ],
    };

    const { success } = await generateSpritesheet(
      gotchi,
      testConfig,
      basePath,
      outDir,
      false
    );
    expect(success).toBe(true);

    const hex = await getCenterPixelHex(path.join(outDir, `${gotchi.id}.png`));
    expect(hex).toBe("#00ff00"); // meleegunbody => green
  });

  it("selects wand cycle when Witchy Wand in hands and no gun", async () => {
    const gotchi: Gotchi = {
      id: 99902,
      collateral: "aAAVE",
      attributes: [
        { trait_type: "Base Body", value: "aAAVE" },
        { trait_type: "Eye Shape", value: "uncommon_low_2" },
        { trait_type: "Eye Color", value: "rare_high" },
        { trait_type: "Wearable (Body)", value: "Marc Outfit" },
        { trait_type: "Wearable (Eyes)", value: "Sergey Eyes" },
        { trait_type: "Wearable (Head)", value: "Eagle Mask" },
        { trait_type: "Wearable (Hands)", value: "Witchy Wand" },
        { trait_type: "Wearable (Pet)", value: "Mythical Cacti" },
      ],
    };

    const { success } = await generateSpritesheet(
      gotchi,
      testConfig,
      basePath,
      outDir,
      false
    );
    expect(success).toBe(true);

    const hex = await getCenterPixelHex(path.join(outDir, `${gotchi.id}.png`));
    expect(hex).toBe("#ff00ff"); // wandbody => magenta
  });
});

describe("single-hand selection", () => {
  function makeConfig(cycle: string): Config {
    return {
      if_keys_and_values: [
        {
          properties: [
            { key: "Base Body", folder: `${cycle}/Base Body`, order: 0 },
            {
              key: "Wearable (Hands)",
              folder: `${cycle}/Wearable (Hands)`,
              order: 6,
            },
          ],
        },
      ],
    } as unknown as Config;
  }

  it("renders right-only when single item has only R asset", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gotchi-single-R-"));
    const basePath = tmp;
    const outDir = path.join(tmp, "out");
    fs.mkdirSync(outDir, { recursive: true });

    const cycle = "handtestR";
    await writePng(
      path.join(
        basePath,
        "Trait Files",
        "Sprites",
        cycle,
        "Base Body",
        "aAAVE.png"
      ),
      [10, 10, 10, 255]
    );
    await writePng(
      path.join(
        basePath,
        "Trait Files",
        "Sprites",
        cycle,
        "Wearable (Hands) R",
        "TestItem.png"
      ),
      [200, 0, 0, 255]
    );

    const config = makeConfig(cycle);
    const gotchi: Gotchi = {
      id: 99101,
      attributes: [
        { trait_type: "Base Body", value: "aAAVE" },
        { trait_type: "Wearable (Hands)", value: "TestItem" },
      ],
    } as unknown as Gotchi;

    const result = await generateSpritesheet(
      gotchi,
      config,
      basePath,
      outDir,
      false
    );
    expect(result.success).toBe(true);
    const layers = result.details?.layersUsed ?? [];
    expect(layers.some((l) => l.startsWith("Wearable (Hands) R:"))).toBe(true);
    expect(layers.some((l) => l.startsWith("Wearable (Hands) L:"))).toBe(false);
  });

  it("renders left-only when single item has only L asset", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gotchi-single-L-"));
    const basePath = tmp;
    const outDir = path.join(tmp, "out");
    fs.mkdirSync(outDir, { recursive: true });

    const cycle = "handtestL";
    await writePng(
      path.join(
        basePath,
        "Trait Files",
        "Sprites",
        cycle,
        "Base Body",
        "aAAVE.png"
      ),
      [10, 10, 10, 255]
    );
    await writePng(
      path.join(
        basePath,
        "Trait Files",
        "Sprites",
        cycle,
        "Wearable (Hands) L",
        "TestItem.png"
      ),
      [0, 200, 0, 255]
    );

    const config = makeConfig(cycle);
    const gotchi: Gotchi = {
      id: 99102,
      attributes: [
        { trait_type: "Base Body", value: "aAAVE" },
        { trait_type: "Wearable (Hands)", value: "TestItem" },
      ],
    } as unknown as Gotchi;

    const result = await generateSpritesheet(
      gotchi,
      config,
      basePath,
      outDir,
      false
    );
    expect(result.success).toBe(true);
    const layers = result.details?.layersUsed ?? [];
    expect(layers.some((l) => l.startsWith("Wearable (Hands) L:"))).toBe(true);
    expect(layers.some((l) => l.startsWith("Wearable (Hands) R:"))).toBe(false);
  });
});

describe("real assets - wandbody on id 3", () => {
  const tmpReal = fs.mkdtempSync(path.join(os.tmpdir(), "gotchi-real-"));
  const outDirReal = path.join(tmpReal, "out");

  beforeAll(() => {
    fs.mkdirSync(outDirReal, { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpReal, { recursive: true, force: true });
    } catch {}
  });

  it("renders with wandbody for gotchi id 3", async () => {
    const config: Config = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "config.json"), "utf8")
    );
    const gotchis: Array<{
      id: number;
      attributes: Array<{ trait_type: string; value: string }>;
      collateral?: string;
    }> = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "processedAavegotchis.json"),
        "utf8"
      )
    );
    const gotchi = gotchis.find((g) => g.id === 3)!;
    expect(gotchi).toBeTruthy();

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
      // also call through to not hide test output
      originalLog.apply(console, args as never);
    };
    try {
      const { success } = await generateSpritesheet(
        gotchi as unknown as Gotchi,
        config,
        process.cwd(),
        outDirReal,
        true
      );
      expect(success).toBe(true);
    } finally {
      console.log = originalLog;
    }

    // Assert that at least one layer loaded from a wandbody folder
    const wandLogs = logs.filter((l) =>
      l.includes("Trait Files/Sprites/wandbody/")
    );
    expect(wandLogs.length).toBeGreaterThan(0);
  });
});
