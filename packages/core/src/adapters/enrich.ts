import type { AdapterResult, ProviderAdapter, RunContext } from "../types.ts";

export interface FindEmailInput {
  firstName: string;
  lastName: string;
  domain: string;
  linkedinUrl: string | null;
}

export interface FoundEmail {
  email: string;
  /** Provider's own confidence 0-100 when given; never trusted without verification. */
  confidence: number | null;
}

export interface PersonInput {
  domain: string;
  titlesAny: string[];
  titlesNone: string[];
  seniorities: string[];
  limit: number;
}

export interface FoundPerson {
  firstName: string;
  lastName: string;
  title: string;
  seniority: string | null;
  department: string | null;
  linkedinUrl: string | null;
  country: string | null;
}

/** Stage 3: one adapter per vendor. Used in order by the email waterfall. */
export interface EnrichAdapter extends ProviderAdapter {
  findEmail(ctx: RunContext, input: FindEmailInput): Promise<AdapterResult<FoundEmail>>;
  /** Optional: vendors that can also find people at an account. */
  findPeople?(ctx: RunContext, input: PersonInput): Promise<AdapterResult<FoundPerson[]>>;
}
