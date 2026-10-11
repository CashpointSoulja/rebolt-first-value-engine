# Accessibility and visual adaptation

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.**

Target: WCAG 2.2 AA-relevant behavior for this workflow, **not a conformance claim**. Desktop/mobile keyboard, focus, reduced motion, native 200% zoom and nine representative contrast combinations were exercised in Chrome; see [actual results and untested limits](test-results.md). Screen-reader and physical-device checks remain untested.

## Structure and meaning

- Provide a clear page heading and ordered section headings. Use semantic buttons, links, fieldsets and tables instead of clickable anonymous containers.
- Label every file input, date/time setting, filter and plan/UTM field. Distinguish required from optional in text.
- Use table captions and scoped headers; metric names, units, D/N/U/F, bounds and converter-only median meaning must be available without color, hover or visual position.
- Explain “unknown”, “pending”, “excluded” and “not estimable” in nearby text. Do not announce missing values as numeric zero.
- Expose selected/current state programmatically. Do not rely on amber/green/red to convey validity or completion.

## Keyboard and focus

Test the whole flow with Tab/Shift+Tab, Enter, Space and native control keys. Focus must be visible, in logical order and not hidden by a sticky region or clipped overflow. Avoid positive `tabindex`.

On explicit invalid submission, focus an error summary or the first invalid control and associate the reason. On successful import/settings apply, announce completion without losing the user's location. Invalid drafts must announce that the prior valid analysis remains active. Do not move focus on every keystroke or recomputation.

Downloads must be operable by keyboard; status feedback must not trap focus. If a dialog is introduced, provide an accessible name, Escape behavior, contained focus and return focus to its trigger.

## Contrast, targets and motion

- Normal text: at least 4.5:1 contrast; large text: at least 3:1.
- Essential controls, boundaries and focus indicators: at least 3:1 against adjacent colors as applicable.
- Measure actual computed foreground/background combinations, including muted text, disabled/error states and amber. A palette swatch is not a passed contrast test.
- Meet 24×24 CSS px target sizing or a valid spacing exception; prefer larger primary touch targets.
- Respect `prefers-reduced-motion: reduce`; suppress nonessential movement. Never make metric changes depend on animation.

## Responsive review

Required real rendered views: 1366×900 desktop and 390×844 mobile. Also inspect 200% browser zoom and reflow near 320 CSS px. File controls, long diagnostics and constructed URLs must wrap without pushing actions offscreen.

Data tables may use clearly indicated horizontal overflow when necessary; the page itself must remain usable without horizontal panning. A scrollable region that needs keyboard interaction must be reachable and named. Do not hide uncertainty/exclusions on mobile.

## Brand adaptation and ownership

The archived aviation guide reports commercial Helvetica Now Display and an amber/charcoal presentation. The implementation uses local **Arial as a disclosed adaptation**; no commercial font binary may be included or fetched. Generic Inter/Geist Mono brand references are not grounds for quietly substituting an undisclosed typography system.

Amber is an emphasis color, not an invented aviation safety status. Decorative stripes or literal permitted brand assets must not obscure labels or focus. Decorative images have empty alternatives; meaningful images require concise accurate alternatives and may not imply endorsement.

## Required evidence

Record viewport/browser, tested path, actual contrast values, keyboard focus behavior, reduced-motion behavior and any assistive technology used. An automated audit is supplemental; it does not establish keyboard usability or complete conformance. File issues with reproduction steps and affected acceptance IDs A01–A06/B01; do not declare the work accessible until the stated checks actually run.
