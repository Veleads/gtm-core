import type { AccountSourceAdapter } from "./adapters/account-source.ts";
import type { EnrichAdapter } from "./adapters/enrich.ts";
import type { SenderAdapter } from "./adapters/sender.ts";
import type { SignalsAdapter } from "./adapters/signals.ts";
import type { VerifyAdapter } from "./adapters/verify.ts";

/**
 * Maps provider slugs in config.yaml to adapter instances. Phase 2 registers real adapters
 * here; nothing else in the codebase should import a vendor module directly.
 */
export class ProviderRegistry {
  readonly accountSources = new Map<string, AccountSourceAdapter>();
  readonly enrichers = new Map<string, EnrichAdapter>();
  readonly verifiers = new Map<string, VerifyAdapter>();
  readonly signals = new Map<string, SignalsAdapter>();
  readonly senders = new Map<string, SenderAdapter>();

  private static get<T>(map: Map<string, T>, kind: string, slug: string): T {
    const adapter = map.get(slug);
    if (!adapter) throw new Error(`No ${kind} adapter registered for "${slug}". Known: ${[...map.keys()].join(", ") || "none"}`);
    return adapter;
  }

  accountSource(slug: string) { return ProviderRegistry.get(this.accountSources, "account source", slug); }
  enricher(slug: string) { return ProviderRegistry.get(this.enrichers, "enrich", slug); }
  verifier(slug: string) { return ProviderRegistry.get(this.verifiers, "verify", slug); }
  signalSource(slug: string) { return ProviderRegistry.get(this.signals, "signals", slug); }
  sender(slug: string) { return ProviderRegistry.get(this.senders, "sender", slug); }
}
