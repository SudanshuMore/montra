# Simplified workspace acceptance

16 October 2026. Service regression suite: 27 tests passed. Browser checks below remain pending; previous browser-tool access to the local preview was rejected by its URL policy. The application build also passed.

1. Sign in and create a sample workspace if necessary. Verify the actual signed-in email and role appear in the sidebar. Test identities ending in `.test` must be labelled as synthetic.
2. Focus Workspace with the keyboard. Change the selected organization using the styled Radix selector (arrow keys, Enter, Escape). Verify readable contrast, long names wrapping without a duplicate label, and full state reset to the selected organization's records. Repeat at a narrow viewport.
3. Confirm Transactions and Connected accounts are primary navigation. Supporting documents and Check against statement appear under Review tools.
4. As an administrator, expand Settings and open Members & permissions, Activity log and Document settings. Confirm member emails wrap, the current member is marked You, and IDs are behind Developer reference. The form must state that email invitations are unavailable.
5. In Connected accounts, inspect Last updated and the plain update status. Trigger a sample update and confirm progress ends. Expand Connection details, Demo testing tools and Update history when needed. Disconnect only an expendable synthetic connection and verify its stopped status.
6. As a restricted member, confirm Settings management controls are absent and administrator API actions remain forbidden. Confirm sample scenario changes cannot be initiated by a viewer.
7. Revisit document review and statement comparison. Confirm synthetic-only restrictions and the saved reports still work. Document settings must describe deletion timing without claiming immediate removal of every backup or historical record.

These checks are not marked passed by source inspection or a successful build.

## Financial workspace redesign — 16 October 2026

- Added clickable account cards that select the existing account filter, and a Clear filters action that resets account, description, dates, status and direction.
- Applied the warm canvas / forest theme to transaction summaries, connections, member controls and transaction details. Summary values still use the existing currency and filtered-history rules; no invented chart data was added.
- Regression suite: 27 passed. TypeScript `tsc --noEmit`: passed. Whitespace check: passed.
- Production build could not complete: the native compiler reported memory allocation failures, including after reducing parallelism. This is an unresolved environment validation blocker; do not treat the new production build as verified.
- Browser visual acceptance remains pending under the previously reported local browser policy restriction. Verify account-card selection, Clear filters, readable long names and amounts, mobile layout, keyboard focus and reduced motion before release.
