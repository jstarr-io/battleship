# CHANGE-007 — Animated Turn Transitions + Polished Status Bar

**Change:** Add smooth animations to the turn indicator, phase transitions, and sunk announcements.

**Reason:** The raw text swap ("YOUR MOVE" / "ENEMY'S MOVE") felt abrupt and utilitarian. Modern games telegraph state changes with motion to guide player attention.

**Applied fix:**
- Turn indicator smoothly transitions between active/waiting with CSS `transition` on color/background/box-shadow.
- "Your turn" state pulses with a gold glow (turnPulse keyframe, 2s infinite ease-in-out).
- Every turn change triggers a slide-in animation (translateY(-10px) → 0, 0.4s).
- Sunk announcements (ENEMY SUNK / YOUR SHIP SUNK) flash with gradient backgrounds, colored glow, and a scale(1.05) pop.
- Battle start: placement panel fades out (opacity 0 + translateY) then hides; board blocks do a subtle scale bounce.
- Screen transitions upgraded to cubic-bezier eased translateY + scale entrance.
- Tracking grid board gets a gold border glow when armed (your turn active).

**Outcome:** Turn changes are immediately obvious, sunk announcements feel impactful, and phase transitions are smooth rather than jarring. All game logic unchanged.
