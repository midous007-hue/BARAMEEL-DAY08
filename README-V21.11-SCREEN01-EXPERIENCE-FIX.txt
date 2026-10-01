BARAMEEL V21.11 — SCREEN 01 EXPERIENCE / MOTION FIX

SCREEN 01 agreed behavior is implemented as a coordinated cinematic opening, not a static loading overlay.

1. ARTWORK / ALIGNMENT
- The splash artwork remains unchanged.
- The loading overlay, logo shine and lens shine use the same transform space as the artwork so micro-parallax cannot separate them from the printed artwork.
- The loading overlay remains aligned to the printed loading bar while the scene breathes.

2. MICRO-PARALLAX
- Pointer/touch movement produces a restrained 4.5px horizontal / 3.5px vertical response.
- The effect is deliberately small: the scene feels alive without becoming a moving poster.
- Brona herself is not animated, does not turn toward camera and does not smile.
- The strongest perceptual motion is in the environment and in the reflective glasses highlight.

3. VISUAL SENSORY EFFECTS
- Slow scene breathing.
- Warm ambient world glow.
- One-shot recurring logo highlight.
- Dedicated moving reflection across the disco glasses.
- Subtle film/arcade grain.
- Loading fill uses strong Barameel red/orange/gold/cyan with an internal moving light sweep.

4. LOADING / PACING
- Minimum cinematic duration increased to 4.2 seconds so the effects are actually perceptible.
- Progress advances through preparation stages instead of appearing as a static bar.
- WORLD READY is the activation moment.

5. TRANSITION
- On completion, the splash performs a short controlled zoom/brightness activation.
- The loading layer exits with the same coordinated transform.
- world.html enters with a matching reverse zoom/brightness reveal, creating a continuous Splash -> World transition rather than a hard page swap.

6. AUDIO / HAPTIC
- Existing browser-safe audio unlock and lightweight arcade tone remain.
- Haptic feedback remains optional and device-dependent.

7. PROTECTED CORE
- Supabase, Player, Ticket, Universal QR, Edge Functions, Reward Engine and Screen 06 logic are untouched.
