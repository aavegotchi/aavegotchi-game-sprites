## React + Phaser Example

```tsx
"use client";

import React, { useEffect, useRef } from "react";

interface AnimationConfig {
  key: string;
  row: number;
  startFrame: number;
  endFrame: number;
  frameRate: number;
  repeat: number;
}

interface SpriteSheetConfig {
  key: string;
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  animations: AnimationConfig[];
}

interface GotchiPhaserProps {
  gotchiId: string;
  serverBaseUrl: string; // e.g. "https://your-server"
  frameWidth?: number; // defaults to 100
  frameHeight?: number; // defaults to 100
  scale?: number; // display scale factor (e.g., 2)
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

    const animationKey = `${config.key}_${anim.key}`;
    if (scene.anims.exists(animationKey)) {
      scene.anims.remove(animationKey);
    }

    scene.anims.create({
      key: animationKey,
      frames: scene.anims.generateFrameNumbers(config.key, { start, end }),
      frameRate: anim.frameRate,
      repeat: anim.repeat,
    });
  }
}

function playDirectional(
  sprite: Phaser.GameObjects.Sprite,
  textureKey: string,
  action: string,
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

export function GotchiPhaserSprite({
  gotchiId,
  serverBaseUrl,
  frameWidth = 100,
  frameHeight = 100,
  scale = 2,
}: GotchiPhaserProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let isActive = true;

    async function init() {
      const PhaserModule = await import("phaser");

      if (!isActive || !containerRef.current) return;

      const textureKey = `gotchi_${gotchiId}`;
      const imagePath = `${serverBaseUrl.replace(
        /\/$/,
        ""
      )}/spritesheets/${gotchiId}.png`;

      const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
        key: "GotchiScene",
      };
      const scene = new PhaserModule.Scene(sceneConfig);

      scene.preload = function preload() {
        this.load.spritesheet(textureKey, imagePath, {
          frameWidth,
          frameHeight,
        });

        // Ensure nearest-neighbor filtering for crisp pixels
        this.load.once("complete", () => {
          const tex = this.textures.get(textureKey);
          if (tex?.source[0]) {
            tex.source[0].scaleMode = PhaserModule.ScaleModes.NEAREST;
          }
        });
      };

      scene.create = function create() {
        const spriteConfig: SpriteSheetConfig = {
          key: textureKey,
          imagePath,
          frameWidth,
          frameHeight,
          // Adjust rows/frames to match your generator sheet layout
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

        const sprite = this.add.sprite(160, 120, textureKey);
        sprite.setScale(scale);
        sprite.play(`${textureKey}_idle_down`);

        // Demo cycle
        this.time.addEvent({
          delay: 1000,
          callback: () => playDirectional(sprite, textureKey, "walk", "right"),
        });
        this.time.addEvent({
          delay: 2500,
          callback: () => playDirectional(sprite, textureKey, "walk", "left"),
        });
        this.time.addEvent({
          delay: 4000,
          callback: () =>
            playDirectional(sprite, textureKey, "attack", "right"),
        });
        this.time.addEvent({
          delay: 5500,
          callback: () => sprite.play(`${textureKey}_idle_down`),
        });
      };

      game = new PhaserModule.Game({
        type: PhaserModule.AUTO,
        parent: containerRef.current,
        width: 320,
        height: 240,
        backgroundColor: "transparent",
        pixelArt: true,
        scene,
      });
    }

    init();

    return () => {
      isActive = false;
      if (game) {
        game.destroy(true);
        game = null;
      }
    };
  }, [gotchiId, serverBaseUrl, frameWidth, frameHeight, scale]);

  return <div ref={containerRef} className="h-64 w-full" />;
}

// Example usage:
// <GotchiPhaserSprite gotchiId="1234" serverBaseUrl="https://your-server" frameWidth={100} frameHeight={100} scale={2} />
```
