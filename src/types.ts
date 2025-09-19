export interface GotchiAttribute {
  trait_type: string;
  value: string;
}

export interface Gotchi {
  id: number;
  collateral?: string;
  attributes: GotchiAttribute[];
}

export interface ConfigProperty {
  key: string;
  folder: string;
  order?: number;
  next?: boolean;
}

export interface ConditionKV {
  keys?: string[];
  values?: string[];
}

export interface ConditionSet {
  keys_and_values?: ConditionKV[];
  provides?: unknown[];
  properties?: ConfigProperty[];
  order?: number;
}

export interface ConfigSettings {
  id_key?: string;
}

export interface Config {
  required_keys?: string[];
  settings?: ConfigSettings;
  if_ids?: number[];
  if_keys_and_values?: ConditionSet[];
}

export interface GenerationDetails {
  layersUsed?: string[];
  missingImages?: string[];
  loadErrors?: string[];
}

export interface GenerationResult {
  success: boolean;
  error?: string;
  details?: GenerationDetails;
}
