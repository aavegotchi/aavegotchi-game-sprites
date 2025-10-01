## Viewing in Phaser

Minimal Phaser 3 example: load a gotchi spritesheet and play animations.

```ts
// Minimal Phaser 3 example: load a gotchi spritesheet and play animations

interface AnimationConfig {
  key: string;
  row: number;
  startFrame: number;
  endFrame: number;
  frameRate: number;
  repeat: number; // -1 loops forever, 0 plays once
}

interface SpriteSheetConfig {
  key: string; // e.g. "gotchi_1234"
  imagePath: string; // e.g. "https://your-server/spritesheets/1234.png"
  frameWidth: number; // e.g. 100
  frameHeight: number; // e.g. 100
  animations: AnimationConfig[];
}

function createAnimationsFromConfig(
  scene: Phaser.Scene,
  config: SpriteSheetConfig
): void {
  const texture = scene.textures.get(config.key);
  const framesPerRow = Math.floor(texture.source[0].width / config.frameWidth);

  for (const anim of config.animations) {
    const start = anim.row * framesPerRow + anim.startFrame;
    const end = anim.row * framesPerRow + anim.endFrame;

    // Prefix animation keys with texture key to avoid collisions between characters
    const characterScopedKey = `${config.key}_${anim.key}`;
    if (scene.anims.exists(characterScopedKey)) {
      scene.anims.remove(characterScopedKey);
    }

    scene.anims.create({
      key: characterScopedKey,
      frames: scene.anims.generateFrameNumbers(config.key, { start, end }),
      frameRate: anim.frameRate,
      repeat: anim.repeat,
    });
  }
}

// Optional helper: flip left while reusing "right" animations
function playDirectional(
  sprite: Phaser.GameObjects.Sprite,
  textureKey: string,
  action: string, // "idle" | "walk" | "attack" | "throw"
  direction: "down" | "up" | "left" | "right"
) {
  if (direction === "left" || direction === "right") {
    const base = `${action}_right`;
    sprite.setFlipX(direction === "left");
    sprite.play(`${textureKey}_${base}`, true);
    return;
  }
  sprite.setFlipX(false);
  sprite.play(`${textureKey}_${action}_${direction}`, true);
}

export class GotchiPhaserExample extends Phaser.Scene {
  private textureKey: string;
  private sheetUrl: string;

  constructor() {
    super("GotchiPhaserExample");

    // Example gotchi; replace with your ID and server URL
    const gotchiId = "1234";
    const serverBaseUrl = "https://your-server";
    this.textureKey = `gotchi_${gotchiId}`;
    this.sheetUrl = `${serverBaseUrl.replace(
      /\/$/,
      ""
    )}/spritesheets/${gotchiId}.png`;
  }

  preload() {
    // Adjust frameWidth/frameHeight to match your generator output (commonly 64 or 100)
    this.load.spritesheet(this.textureKey, this.sheetUrl, {
      frameWidth: 100,
      frameHeight: 100,
    });
  }

  create() {
    // Nearest-neighbor filtering for crisp pixels
    const tex = this.textures.get(this.textureKey);
    if (tex?.source[0]) {
      tex.source[0].scaleMode = Phaser.ScaleModes.NEAREST;
    }

    // Example animation mapping; adjust rows/frames to your sheet layout
    const spriteConfig: SpriteSheetConfig = {
      key: this.textureKey,
      imagePath: this.sheetUrl,
      frameWidth: 100,
      frameHeight: 100,
      animations: [
        {
          key: "idle_down",
          row: 0,
          startFrame: 0,
          endFrame: 5,
          frameRate: 8,
          repeat: -1,
        },
        {
          key: "walk_down",
          row: 1,
          startFrame: 0,
          endFrame: 7,
          frameRate: 12,
          repeat: -1,
        },
        {
          key: "walk_right",
          row: 2,
          startFrame: 0,
          endFrame: 7,
          frameRate: 12,
          repeat: -1,
        },
        {
          key: "walk_up",
          row: 3,
          startFrame: 0,
          endFrame: 7,
          frameRate: 12,
          repeat: -1,
        },
        {
          key: "attack_right",
          row: 4,
          startFrame: 0,
          endFrame: 5,
          frameRate: 10,
          repeat: 0,
        },
        {
          key: "attack_down",
          row: 5,
          startFrame: 0,
          endFrame: 5,
          frameRate: 10,
          repeat: 0,
        },
        {
          key: "attack_up",
          row: 6,
          startFrame: 0,
          endFrame: 5,
          frameRate: 10,
          repeat: 0,
        },
        {
          key: "throw_right",
          row: 7,
          startFrame: 0,
          endFrame: 5,
          frameRate: 12,
          repeat: 0,
        },
      ],
    };

    createAnimationsFromConfig(this, spriteConfig);

    // Spawn the sprite and play idle
    const sprite = this.add.sprite(400, 300, this.textureKey);
    sprite.setScale(2);
    sprite.play(`${this.textureKey}_idle_down`);

    // Demo: cycle a few animations
    this.time.addEvent({
      delay: 1000,
      callback: () => playDirectional(sprite, this.textureKey, "walk", "right"),
    });
    this.time.addEvent({
      delay: 2500,
      callback: () => playDirectional(sprite, this.textureKey, "walk", "left"),
    });
    this.time.addEvent({
      delay: 4000,
      callback: () =>
        playDirectional(sprite, this.textureKey, "attack", "right"),
    });
    this.time.addEvent({
      delay: 5500,
      callback: () => sprite.play(`${this.textureKey}_idle_down`),
    });
  }
}
```
