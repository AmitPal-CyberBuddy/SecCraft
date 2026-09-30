# UI recommendations: delivery plan and boundaries

This plan tracks the requested page-by-page improvements. **Completed** means the current UI can make an accurate claim with existing data; it does not mean a new server capability was added. Preserve existing routes, account states, local/imported provenance and API authorization.

## Step 1 — Inventory and correct product claims (completed)
- Audit available-path metadata, actual lab and assessment inventories before using counts or examples.
- Landing page distinguishes shipped wireless/Android work from planned AI/LLM content; catalogue displays both available paths. Avoid claims of measured Android APK outcomes, independently validated field skills or certificates.
- Loading account status never masquerades as a confirmed approval decision; retry and update notices remain non-disruptive.

## Step 2 — Make the curriculum navigable (completed, UI scope)
- Path catalogue shows level, hours, modules, labs, skills and prerequisites where authored.
- Path detail gives a sequence, learning coverage, evidence and assessment boundary.
- Module catalogue names phases. Module overview links its actual lessons, labs, quizzes and documentation in a suggested order; no invented mandatory completion criteria.

## Step 3 — Put practice and evidence first (completed, UI scope)
- Lab entries show target, review mode and environment using supplied metadata. The UI must not imply a missing APK, capture, validated score or runtime result exists.
- Challenge cards foreground skills; detail starts with an objective-to-self-review workflow. Existing Guided → Semi-guided → Assessment distinction remains.
- Engagements show actual authored briefs, scope and tasks. Reports remains an evidence-writing practice workspace, not an award: its duplicate Certificates tab was removed while the finding editor, evidence vault, PDF export and other tools remain. Reporting does not claim automated evidence linkage.

## Step 4 — Reduce navigation and status noise (completed, UI scope)
- Existing Home/Learn/Practice/Reference/Progress/Account groups already cover the proposed hierarchy without changing route identities. Daily is labelled optional practice; achievements and XP are local milestones, not credentials.
- Sync leads with device/account/imported record origins and folds the technical explanation into “How progress works”.
- Settings keeps every existing control but collapses the practice/XP dashboard into an optional disclosure. Profile links to existing learning, practice, assessment and transfer pages rather than claiming a professional credential.
- Reference retains command/filter/method/checklist tabs and adds direct jumps among actual command categories; no fictitious iOS or Frida reference sections.
- Owner overview uses existing settings, filtered user list and audit API; counts explicitly distinguish server totals from partial list snapshots. No new owner privileges or content-management endpoints.

## Step 5 — Verify (completed for automated checks; visual check pending)
- Run frontend production build, frontend tests and `git diff --check` after changes. Check routes, accessibility and reduced motion in a real browser when a browser executable is available.

## Not implementable honestly as UI-only work
These are **separate product/backend projects**, not unfinished page polish:
1. Independently graded module/skill/unknown assessments, demonstrated-skill matrix and Skill Passport: define rubrics, trusted grading, review/appeals, verified records and tests before showing “demonstrated”.
2. Evidence-linked report generation and review: define structured evidence/finding/retest records, trusted linkage, persistence and privacy/export contracts; PDF alone is not that workflow.
3. New Android APK/dynamic instrumentation results, RF field outcomes and AI/LLM labs: supply authorized test targets, artifacts, verifiable exercises and environment support first.
4. Owner content management or globally accurate pending counts: require authenticated owner APIs, pagination/totals, audit trail and authorization tests. A filtered first-page list cannot provide a platform-wide number.
5. Genuinely private Full Curriculum: remove bundled protected content and deliver lessons through entitlement-checked API endpoints before describing it as access control.

Certificates remain disabled; imported/local practice cannot be promoted to verified results by presentation changes.
