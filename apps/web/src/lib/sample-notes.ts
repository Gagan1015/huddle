// Demo transcripts for the import dialog. Each mixes open action items, work in
// flight, finished work, and decisions with nothing to do, so an import visibly
// sorts tasks into different columns and skips the noise. Names match the
// seeded Northwind Studio people.

export interface SampleNotes {
  id: string;
  title: string;
  /** One line shown next to the title in the picker. */
  hint: string;
  notes: string;
}

export const SAMPLE_NOTES: readonly SampleNotes[] = [
  {
    id: "launch-sync",
    title: "Launch sync",
    hint: "Product launch check-in with owners and dates",
    notes: `Launch sync, Sept 19
Attendees: Priya, Marcus, Dana

Pricing page: Marcus is still waiting on the final tier names from finance. He'll chase them tomorrow and get the FAQ answers into the doc by Thursday's review.

Status page: Priya started wiring up the components (API, web app, billing) yesterday. It can't go public until IT hands over the DNS record.

Announcement email: nobody has started. Dana will write a short, plain-language draft for existing customers that links to the changelog rather than the blog.

QA: agreed to book two days of QA for the mobile release in the first week of October. Priya to send the calendar hold.

Billing webhooks: the queue migration is deployed. Marcus still has to replay last week's failed events once the consumer is confirmed idempotent.

Dark mode shipped behind a setting last week. Nothing more to do there.

Decision: the launch date stays October 14. Leadership signed off on Monday.

Accessibility audit: Dana is halfway through the findings and wants a second pair of eyes on the color-contrast items before Friday.`,
  },
  {
    id: "incident-review",
    title: "Incident review",
    hint: "Outage postmortem with follow-ups and completed fixes",
    notes: `Incident review: checkout outage, Sept 17
Attendees: Tomás (on-call), Aisha, Priya, Dana

Timeline: 14:02 payments API latency spiked, 14:09 checkout started returning 502s, 14:31 rollback complete, 14:40 recovered.

Root cause: the mobile client retried failed requests immediately and without a cap, which turned one slow deploy into a retry storm.

Action items:
- Tomás adds a retry cap with exponential backoff to the mobile client. Ship this week.
- Aisha sets up an alert when p95 latency on /checkout goes above 800 ms for five minutes. Currently we only alert on error rate.
- Priya writes the customer-facing postmortem by Monday and shares it with support first.
- The failover runbook for the payments worker is half written. Tomás is finishing it and wants a review from Aisha.
- The status page update went out 25 minutes late. Dana will draft a comms template so the on-call engineer can post in under two minutes.

Already done: deploy rolled back, the 37 failed orders were backfilled, and the affected customers were emailed.

We agreed not to add a second payments provider this quarter.`,
  },
  {
    id: "design-review",
    title: "Design review",
    hint: "Feedback on onboarding screens with a few decisions",
    notes: `Design review: onboarding v2
Attendees: Dana, Aisha, Marcus

The new welcome screen tested well with all six participants. Keep it as is.

The empty state on the board page still confuses people; three participants did not notice the Add issue button. Dana is trying a version that shows a sample card and a short line of copy.

Marcus flagged the invite flow wording. "Add a teammate" and "Invite" are used for the same action. Decide on one by Thursday and update every screen.

The amber swatch in the color picker fails contrast against white. Aisha is fixing the palette and will re-check every swatch.

Agreed: move the dark-mode toggle out of the account menu and into Settings, next to notifications.

Parking lot: animated illustrations for the empty states. Revisit next quarter; no action now.

Aisha is already halfway through the new icon set at the 1.5 stroke width and expects to finish tomorrow.`,
  },
  {
    id: "customer-call",
    title: "Customer call",
    hint: "Feature requests and promises from a customer conversation",
    notes: `Call with Brightline Co., Sept 18
Attendees: Marcus, Priya; Jordan and Sam from Brightline

They love the meeting-notes import but want to review the tasks before they land on the board. Priya will scope a review step and bring options to next week's call.

CSV export of a board is a blocker for their ops team. Marcus writes the spec, including which fields they need.

SSO through Okta must be in place before their renewal in November. Marcus is looping in security to confirm what is needed.

They asked for webhook retries with backoff. Noted; we did not commit to a date.

Sam offered to be a design partner for @mention comments. Priya to set up a 30-minute session.

Follow-up: Marcus sends them a roadmap summary by Friday.

Billing question about seat counts was answered on the call. Nothing further needed.`,
  },
  {
    id: "sprint-planning",
    title: "Sprint planning",
    hint: "Commitments, carry-over, stretch goals, and blockers",
    notes: `Sprint 24 planning, Sept 19
Capacity: Tomás is out Thursday. Everyone else is available.

Carry-over from last sprint: the billing webhook replay. Marcus is still on it and expects to finish Tuesday.

Committed this sprint:
- Aisha builds the board export endpoint.
- Tomás fixes drag and drop on touch screens; it currently drops cards in the wrong column on iPad.
- Priya finishes the members page, including the role badge.
- Dana updates the icon set to the new stroke width across the app.

Stretch: search across boards. Aisha picks it up only if export lands early.

Blocked: the analytics dashboard is waiting on the data team's schema. Priya will chase them today.

Not doing this sprint: dark theme polish. Parked until the design system lands.

Retro action from last sprint (done): the flaky end-to-end test was quarantined.`,
  },
];

/** The default sample, used wherever a single transcript is enough. */
export const SAMPLE_MEETING_NOTES = SAMPLE_NOTES[0]?.notes ?? "";
