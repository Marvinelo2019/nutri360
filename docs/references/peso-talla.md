# Reference: PROSANA weight and height station

## Source

- Original file: `/Users/marving/Documents/Development/PROSANA_PROJECT/peso-talla.html`
- Reviewed: 2026-09-29
- SHA-256: `8267296f55f449cf0f31cb7c6994ab2b04fcbb7d7e019698599f828decefe831`
- Size at review: 33,457 bytes / 622 lines

The original HTML is not copied into Nutri360 because it contains a different project's backend URL and publishable key. This document preserves its functional behavior and clinical-calculation inventory without importing credentials, data-access patterns, branding, or patient data.

## Product value to preserve

Nutritionists using this tool during a medical outreach event valued the speed and completeness of entering only weight and height and receiving an immediately understandable assessment. Nutri360 should preserve that low-friction interaction while making the calculation history clinically traceable.

## Existing workflow inventory

### Event workflow

- Select an active medical event and optionally open it from a URL parameter.
- Load registered attendees in registration order.
- Refresh the attendee list every 15 seconds.
- Search attendees by name.
- Show total, measured, and pending counts.
- Distinguish pending and measured attendees visually.
- Show a compact BMI badge in the attendee list.
- Select an attendee and display name, age, sex/gender label, and local group.
- Load previous weight and height when measurements already exist.
- Update a prior measurement.
- Pass event, age, sex, weight, and height into a later screening step.

### Inputs

- Weight in kilograms, decimal precision of 0.1 kg.
- Height in centimetres, decimal precision of 0.1 cm.
- HTML constraints: weight 20–300 kg and height 50–250 cm.
- The JavaScript only enforces the lower bounds; Nutri360 must enforce both bounds at the server boundary and allow an authorized professional to handle documented exceptional values deliberately.

### Immediate results

- Entered weight in kilograms.
- Entered height in centimetres.
- Entered weight converted to pounds using `kg × 2.20462`.
- BMI using `weightKg / heightMeters²`.
- Extended adult BMI classification.
- Estimated ideal weight in kilograms and pounds.
- Adult normal-weight interval using BMI 18.5–24.9.
- Difference between entered and estimated ideal weight.
- Estimated body-fat percentage when age and sex are available.
- Full BMI scale with the current interval highlighted.

### Adult BMI intervals in the resource

| BMI | Displayed classification |
| --- | --- |
| `< 16` | Severe thinness |
| `16–16.9` | Moderate thinness |
| `17–18.4` | Underweight |
| `18.5–24.9` | Normal weight |
| `25–29.9` | Overweight |
| `30–34.9` | Obesity I |
| `35–39.9` | Obesity II |
| `≥ 40` | Obesity III |

These fixed cut-offs are suitable only for the adult pathway. WHO defines paediatric assessment by age- and sex-specific growth references rather than adult cut-offs:

- [WHO obesity and overweight definitions](https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight)
- [WHO growth reference for ages 5–19](https://www.who.int/tools/growth-reference-data-for-5to19-years)
- [WHO child growth standards](https://www.who.int/tools/child-growth-standards/standards/bmi)

## Formula audit

### BMI

```text
BMI = weightKg / heightMeters²
```

This implementation is consistent with the adult BMI definition. BMI is a screening indicator and must not be presented as a diagnosis or a direct measure of body fat.

### Normal-weight interval

```text
minimumWeightKg = 18.5 × heightMeters²
maximumWeightKg = 24.9 × heightMeters²
```

This is an adult BMI-derived interval, not an individualized treatment target.

### Body-fat estimate

The resource implements the adult Deurenberg equation when age and a binary sex value are present:

```text
estimatedBodyFatPercent = 1.20 × BMI + 0.23 × age - 10.8 × sexFactor - 5.4
sexFactor = 1 for male, 0 otherwise
```

Nutri360 must label this as an estimate, preserve the formula version and inputs, validate the applicable population, and avoid treating an unrecognized sex value as female by default.

### “Ideal weight” mismatch

The resource labels its calculation as the Devine formula but implements:

```text
base = heightCm - 100
female = base × 0.9
other = base × 0.9 + 2.5
```

That implementation is not the standard Devine equation. Nutri360 must not reproduce the label/formula mismatch. Before implementation, the nutritionist must approve the intended equation, display name, clinical purpose, height limits, sex handling, rounding, and interpretation. A range derived from BMI may be safer for general counselling than presenting one number as an “ideal” weight.

## Nutri360 adaptation requirements

- Make the calculator available from a patient consultation and, later, from a fast outreach-event workflow.
- Preserve the two-input fast path for adult weight and height.
- Store each measurement as an immutable dated record rather than overwriting the patient's latest values.
- Store explicit units, formula identifier, formula version, inputs, raw output, rounded display output, responsible professional, and timestamp.
- Derive organization and patient scope from the authenticated context; never accept organization ownership from the browser.
- Audit clinical reads and mutations.
- Require versioned consent before collecting clinical measurements.
- Separate adult and paediatric calculation pathways.
- For ages 5–19, use WHO BMI-for-age and height-for-age references with age in months and the required sex reference.
- For children under 5, use the appropriate WHO child growth standards.
- Show applicability warnings for pregnancy, oedema, amputation, highly muscular patients, older adults, and other conditions where BMI or an estimate may be misleading.
- Present estimates with neutral clinical language; avoid alarmist colors as the only indication of status.
- Maintain keyboard access, visible focus, readable result hierarchy, and mobile operation.
- Allow recalculation before saving, but save only through an authenticated, validated server action.
- Do not pass clinical values in query strings when a server-side or short-lived-token handoff is available.

## Acceptance criteria for the future module

- A professional can enter weight and height and see the complete adult result set without leaving the consultation.
- Invalid, implausible, missing, or out-of-scope values produce clear Spanish guidance and are rejected server-side.
- A paediatric patient never receives the adult BMI classification automatically.
- Every displayed result identifies whether it is measured, calculated, estimated, or reference-derived.
- Formula versions and original inputs can reproduce a historical result exactly.
- Saving creates a new history entry and does not silently replace a prior measurement.
- Cross-organization and assistant clinical-access tests pass.
- The workflow remains usable on a phone during an outreach event.

## Deferred product decision

Before implementing “ideal weight,” confirm with the nutritionist which validated formula or target-setting approach should be used. The current reference behavior is preserved here for comparison but is not approved as a Nutri360 clinical rule.
