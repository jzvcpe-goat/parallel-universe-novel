# Motion

Motion should clarify state changes, not decorate the workbench.

Allowed:

- Subtle card reveal
- Hover elevation
- Branch/status pulse for active work
- Dialog open/close transitions
- Candidate review reveal when a writing suggestion appears

Required:

- Respect `prefers-reduced-motion`.
- Provide a Creator display preference for reduced motion.
- Critical actions must not depend on motion to be understandable.

Creator writing assistant:

- `CreatorEditorAssistPanel` may animate candidate and adoption rows once when a new suggestion appears.
- `采纳方式` must remain readable without the animation; motion only tells the author that a candidate just entered review.
- Reduced motion mode must remove candidate and adoption animations.
