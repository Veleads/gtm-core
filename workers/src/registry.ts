import { MockAccountSource, ProviderRegistry } from "@gtm/core";

/** Every provider adapter the workers can use, by slug. Real providers are added here. */
export function createRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  const mock = new MockAccountSource();
  registry.accountSources.set(mock.slug, mock);
  return registry;
}
