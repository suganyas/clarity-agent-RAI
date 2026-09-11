# Chat with your data

## "Hack With Your Data" — Hospital Hackathon Project

A fully fleshed-out fictitious project to drop into a hackathon brief or use as a template.

## The event framing

The hospital ("St. Aurora Regional Medical Centre," a fictional 600-bed acute care hospital) runs an internal 4-day "Hack With Your Data" sprint. The premise: teams get supervised, de-identified access to the hospital's own operational and clinical data lake and must build a working prototype that turns dormant data into a decision that improves patient care or operations. This write-up covers one team's project.

## Project: FlowState — Predicting and unblocking discharge delays

**The problem.** Every winter St. Aurora's emergency department jams up because inpatient beds aren't freeing up fast enough. The bottleneck usually isn't clinical readiness — it's *non-clinical* discharge barriers: a pharmacy TTO (to-take-out meds) not yet dispensed, transport not booked, a social-care package not confirmed, an imaging result still pending. These delays are invisible until a bed manager physically walks the ward. On average, patients sit "medically fit for discharge" for 1.8 extra days.

**The concept.** FlowState ingests the hospital's existing data (admissions, orders, pharmacy, allied health referrals, transport bookings) and produces two things:

1. A **predicted discharge date** for each inpatient, updated daily.
2. A live **"discharge barrier" flag list** — which specific step is blocking each near-ready patient, and who owns it.

The output is a simple ward dashboard the bed manager and charge nurse look at each morning, replacing the manual "board round" guesswork.

**Why it's a good hackathon fit.** It uses data the hospital already has, delivers a visible artifact in 4 days, doesn't require deploying a risky clinical algorithm, and has an obvious owner who wants it.

## Stakeholders

- **Executive sponsor — Chief Operating Officer.** Cares about ED wait times and bed occupancy; approves the project and unblocks data access.
- **Clinical champion — Consultant in Acute Medicine.** Validates that the barrier logic reflects reality and gives clinical credibility.
- **Primary user — Site / Bed Manager.** The person who'll actually use the dashboard daily; the single most important voice for whether it's usable.
- **Ward staff — Charge Nurses & Ward Clerks.** Provide ground truth on what really delays discharge and will interact with the flags.
- **Data & IT — Health Informatics / Data Warehouse team.** Provision de-identified data, explain the schema, and handle governance.
- **Information Governance / Caldicott Guardian.** Ensures data use is compliant and de-identified; must sign off before any data is touched.
- **Allied Health & Pharmacy leads.** Own several of the barrier categories (therapy assessments, TTOs) and need buy-in for the flags to be actioned.
- **The hackathon team itself.** A rough mix of ~1 data engineer, 1–2 data scientists/analysts, 1 front-end/dashboard builder, and 1 clinical-facing product lead.

## Objectives

**Primary objective.** By end of Day 4, demo a working prototype that, for a sample ward, predicts discharge dates and surfaces the top blocking barrier per patient with reasonable face validity.

**Secondary objectives.**

- Quantify the size of the problem from historical data (average excess "fit-for-discharge" days, most common barrier types).
- Produce a clickable dashboard mockup the bed manager finds intuitive.
- Draft a lightweight plan for how this could move from prototype to a supervised pilot.

**Explicit non-goals** (worth stating to keep scope sane): no live EHR integration, no real patient-identifiable data, no clinically autonomous decisions, no production deployment.

## Success metrics for the sprint

- A prediction that beats a naïve baseline (e.g. "average length of stay for this diagnosis") on held-out historical data.
- Barrier flags that the clinical champion agrees are correct on ≥80% of a spot-checked sample.
- A dashboard the bed manager can navigate unaided in a 5-minute usability test.

## Task breakdown

Grouped into five workstreams so people can parallelize:

- **Data & governance:** confirm IG sign-off, pull and profile the de-identified extract, document the schema.
- **Analysis / modelling:** build the historical baseline, engineer features, train and validate a discharge-date model, define barrier rules.
- **Product / clinical:** interview the bed manager and charge nurses, map real barrier categories, define what "actionable" looks like.
- **Front-end:** build the ward dashboard, wire it to model output.
- **Story / demo:** assemble the narrative, quantify impact, prep the final pitch.

## The 4-day plan

### Day 1 — Frame and unlock the data

- Kickoff with sponsor and clinical champion; lock the scope to one or two wards.
- Confirm IG/Caldicott sign-off and receive the de-identified extract.
- Interview the bed manager and a charge nurse: what actually delays discharge, and what would they want to see each morning?
- Profile the data — what fields exist, quality, gaps.
- **End-of-day checkpoint:** problem confirmed, data in hand, barrier categories drafted.

### Day 2 — Build the analytical spine

- Establish the naïve baseline and measure current excess "fit-for-discharge" days from history.
- Engineer features (diagnosis, admission route, pending orders, referrals, weekend effects).
- First-pass discharge-date model; define the rule-based barrier flags.
- Sketch the dashboard layout with the bed manager for early feedback.
- **End-of-day checkpoint:** a rough model and barrier logic producing output on real historical rows.

### Day 3 — Make it real and usable

- Validate the model on held-out data; iterate on features and barrier rules with the clinical champion spot-checking a sample.
- Build the working dashboard connected to model output.
- Run a quick usability test with the bed manager; fix the biggest friction points.
- Start assembling the impact story (how many bed-days this could plausibly release).
- **End-of-day checkpoint:** end-to-end prototype working on a demo ward, validated and roughly usable.

### Day 4 — Polish, prove, and pitch

- Freeze the build; final validation numbers and a clean demo dataset.
- Usability and accuracy final checks; capture the clinical champion's endorsement quote.
- Build the pitch: the problem, the demo, the measured impact, and a realistic path to a supervised pilot (including what would need to change for real-world use).
- Present to the judging panel / sponsor.
- **End-of-day checkpoint:** live demo delivered, next-steps proposal handed to the COO.

## Key risks to name upfront

- **Data access slipping.** IG sign-off is the critical-path item — if it's not pre-arranged, the whole sprint stalls. Mitigation: get provisional approval *before* Day 1.
- **Messy real-world data.** Barrier information may be free-text or missing. Mitigation: start with the 3–4 best-captured barrier types rather than boiling the ocean.
- **Building the wrong thing.** Easy to over-engineer the model and under-invest in usability. Mitigation: the bed manager reviews something every single day.