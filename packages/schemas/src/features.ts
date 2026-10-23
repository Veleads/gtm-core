/**
 * Opt-in capabilities. New behaviour that changes what a client gets ships here, off by default,
 * and becomes the default only in the next major release. Clients enable it in client.yaml:
 *   features:
 *     some-feature: true
 */
export interface FeatureDefinition {
  description: string;
  /** Core version that introduced it. */
  since: string;
  default: boolean;
}

export const FEATURES: Record<string, FeatureDefinition> = {
  // "linkedin-channel": { description: "Push tier-A leads to a LinkedIn sender too", since: "0.2.0", default: false },
};

export function isFeatureEnabled(features: Record<string, boolean>, key: string): boolean {
  const def = FEATURES[key];
  if (!def) throw new Error(`Unknown feature "${key}"`);
  return features[key] ?? def.default;
}
