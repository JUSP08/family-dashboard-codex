# Dashboard readability review — September 5, 2026

## Implemented for local review

- Daily, date-seeded backgrounds, palettes, and heading fonts. Refreshing does not reshuffle the interface; the local calendar date controls selection.
- Northern Hemisphere seasons and selected US holidays, plus early-September school weekdays. These are presentation defaults, not a school calendar or a complete holiday calendar.
- Three readable system heading-font stacks; body text stays consistent. No external font requests or image downloads. Devices without a selected font use its fallback.
- Larger small labels, brighter muted text, reduced letter spacing, darker content headers, and a clearer active navigation outline.
- Compact mobile header/navigation, safe-area spacing, and readable mobile form text. The decorative sun is hidden on narrow screens; configuration remains accessible.
- All existing page routes, controls, business handlers, backend integrations, and wallet logic remain in place. Status colors keep their meaning instead of changing with the decorative palette.

## Remaining findings

1. **Backend wallet invariant:** `backend/services/state_service.py` stores incoming wallet values without enforcing the frontend's 150-minute cap. The current UI clamps them, but an older client or a direct API write can persist excess time. Add server-side normalization and boundary tests in a separate persistence change.
2. **Maintainability:** `frontend/src/App.jsx` combines numerous views, data synchronization, and business handlers. Extract one view at a time with regression coverage; avoid a wholesale rewrite that risks existing workflows.
3. **Loading cost:** the production build still reports a large emoji-data chunk. Consider loading the picker/data only when needed, measuring before and after.
4. **Accessibility verification:** browser-based contrast, keyboard, zoom, narrow-screen overflow, and touch testing remain necessary. Larger labels alone are not proof of accessibility compliance.

## Validation and release boundary

- Production build passed; existing chunk-size and stale Browserslist warnings remain.
- Repeatable tests: from `frontend`, run `node --test src/dailyTheme.test.js`.
- Browser automation could not connect, so visual and end-to-end interaction checks are not completed.
- No backend changes, database changes, GitHub push, or Ubuntu deployment were performed for this review.

Before deployment, check Home, Coach, Gigs, Balances, Lunch, Suggest, and Config at desktop and phone widths. Exercise gig completion/approval, wallet edits/redemption, calendar navigation, forms, and Smart Home controls using safe test data. Confirm no clipped labels and that keyboard focus stays visible, including dialogs.
