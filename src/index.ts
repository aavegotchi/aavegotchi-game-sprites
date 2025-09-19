import path from "path";
import { fileURLToPath } from "url";
export { generateSpritesheet } from "./generate_spritesheets.js";
export type {
  Gotchi,
  GotchiAttribute,
  Config,
  ConfigProperty,
  ConditionKV,
  ConditionSet,
  GenerationResult,
  GenerationDetails,
} from "./types.js";
export function getPackageBasePath(): string {
  const distDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(distDirectoryPath, "..");
}
