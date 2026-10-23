import type { Lead } from "@gtm/schemas";
import type { AdapterResult, ProviderAdapter, RunContext } from "../types.ts";

export interface SequenceStep {
  step: number;
  delayDays: number;
  variant: string;
  subject: string | null;
  body: string;
}

export interface SenderCampaign {
  ref: string;
  status: "draft" | "active" | "paused" | "completed";
}

export interface PushResult {
  accepted: number;
  rejected: { email: string; reason: string }[];
}

export type OutreachEventKind = "sent" | "opened" | "replied" | "positive" | "meeting" | "bounced" | "unsubscribed";

export interface OutreachEvent {
  email: string;
  kind: OutreachEventKind;
  step: number | null;
  variant: string | null;
  occurredAt: string;
  externalRef: string;
}

/**
 * Stages 7-8. Exactly one sender per campaign. `createCampaign` always creates a PAUSED/draft
 * campaign; `activate` is only called after the human launch gate (AGENTS.md).
 */
export interface SenderAdapter extends ProviderAdapter {
  createCampaign(ctx: RunContext, name: string, steps: SequenceStep[]): Promise<AdapterResult<SenderCampaign>>;
  pushLeads(ctx: RunContext, campaignRef: string, leads: Lead[]): Promise<AdapterResult<PushResult>>;
  activate(ctx: RunContext, campaignRef: string): Promise<AdapterResult<SenderCampaign>>;
  pause(ctx: RunContext, campaignRef: string): Promise<AdapterResult<SenderCampaign>>;
  pullEvents(ctx: RunContext, campaignRef: string, since: string): Promise<AdapterResult<OutreachEvent[]>>;
}
