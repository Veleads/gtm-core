/**
 * Where `gtm track` mirrors stages and gates (GitHub Issues today; Linear/Jira later behind the same
 * interface). The tracker is never read back to decide anything: git files are the source of truth.
 */
export interface TrackItemInput {
  /** Stable key, e.g. "gate:icp" or "campaign:q1-uk-cfo". Re-running updates the same item. */
  key: string;
  title: string;
  body: string;
  labels: string[];
  /** Labels with these prefixes are replaced (not accumulated), e.g. "stage:". */
  exclusiveLabelPrefixes?: string[];
  assignees?: string[];
}

export interface TrackItem {
  key: string;
  url: string;
  created: boolean;
}

export interface TrackerAdapter {
  readonly kind: string;
  upsert(item: TrackItemInput): Promise<TrackItem>;
  comment(key: string, body: string): Promise<void>;
  close(key: string, comment?: string): Promise<void>;
}
