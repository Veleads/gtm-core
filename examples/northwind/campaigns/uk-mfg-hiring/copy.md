# Copy: uk-mfg-hiring

> Stage 5 output. Status: **awaiting sign-off** (config.yaml `gates.copy`).
> Variables available: `{{first_name}}`, `{{company_name}}`, `{{signal_line}}`, `{{sender_first_name}}`.
> `{{signal_line}}` is generated per lead from the signal's `messaging_angle` by the qualify job.

## Segment: uk-manufacturing-mm × persona: finance-leader

### Variant A (signal-led: hiring-ap-staff)
**Step 1, day 0.** Subject: `AP hire at {{company_name}}`

Hi {{first_name}},

{{signal_line}}

Most manufacturers we work with hit the same wall: invoice volume grows, so AP grows. A Midlands
manufacturer moved month-end close from day 9 to day 4 without adding to the team.

Worth a free 20-minute AP benchmark against similar UK manufacturers before you hire?

{{sender_first_name}}

Not relevant? Reply 'no thanks' and I won't contact you again.

**Step 2, day 3.** Subject: (thread reply)

{{first_name}}, the benchmark covers invoices per AP FTE and time-to-approve vs. peers. Our average
customer gets to 3.1x invoices per FTE. Happy to send it over if useful.

{{sender_first_name}}

**Step 3, day 8.** Subject: (thread reply)

Last note from me. If AP isn't on your list this quarter, no problem. Shall I check back in Q2?

{{sender_first_name}}

### Variant B (pain-led, no signal)
**Step 1, day 0.** Subject: `month-end at {{company_name}}`

Hi {{first_name}},

When finance teams in manufacturing tell us close slips, it's usually invoices waiting on approvers,
not the accounting itself.

We helped a Midlands manufacturer go from day 9 to day 4. Would a 20-minute AP benchmark be useful?

{{sender_first_name}}

Not relevant? Reply 'no thanks' and I won't contact you again.

(Steps 2–3 same as Variant A.)

## Segment: uk-manufacturing-mm × persona: ap-owner
(Not yet written. Only used when no finance leader is reachable.)
