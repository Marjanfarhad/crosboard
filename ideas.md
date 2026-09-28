# CROS Board — Design Direction

## Reference ground truth
The supplied read-only CROS Creator Revenue OS project is the visual source of truth. Match its dark editorial dashboard language rather than introducing a competing visual system.

## Design movement
Quiet editorial instrumentation: a creator’s workspace presented like a calm command center, with generous negative space, compact mono labels, and luminous lime signals.

## Core principles
- Make the next action feel obvious without making the interface loud.
- Use strong typographic contrast: serif display headlines against precise mono metadata.
- Keep data surfaces tactile and bounded with subtle borders, not heavy shadows.
- Let the lime signal color denote momentum, status, and the primary action.

## Color philosophy
Near-black green ink background (#10110f), warm paper text (#f5f0dd), subdued sage gray for secondary copy, electric lime (#c8f35a) as the signature signal, and restrained orange (#ed7955) for secondary accents and exceptions.

## Layout paradigm
Fixed desktop sidebar + fluid main canvas. A thin topbar anchors workspace context. The main canvas is organized as a sequence of hero, metric strip, portfolio cards, chart/insight pair, and momentum checklist. Mobile collapses the sidebar into an overlay menu.

## Signature elements
- Rotated rounded-square c-mark.
- Lime status dot and eyebrow line.
- Orbit / signal-field hero art built from CSS geometry.
- Bounded data panels with lightweight hover lift.
- Chart bars that reveal values on hover.

## Interaction philosophy
Every click should have visible feedback: active navigation state, toast confirmation, changing chart range, checklist completion, and a focused add-product flow. Keep interactions local and reversible.

## Animation
Use short ease-out transitions for lift, color, and modal appearance. Avoid ambient motion that competes with the dashboard. Use a subtle spinning refresh glyph only where a loading state is useful.

## Typography system
Display: Georgia / Instrument Serif-like fallback for large headlines and values. Interface: system sans for descriptions. Metadata: ui-monospace for labels, status, and controls.

## Brand essence and voice
CROS should feel observant, calm, and quietly confident. Copy favors short sentences such as “Build once. Compound forever.” and “Your next move is already visible.”

## Wordmark / logo
CROS is a compact mono wordmark paired with a lime c-mark. The c-mark is a rotated, softly rounded square with a single lowercase “c” centered inside.

## Signature brand color
Signal lime #c8f35a.
