# Frontend Route Reference

> Purpose: give backend engineers a quick map of every presented page, where the UI lives, and where to plug in data fetching or mutations.

## Layouts & Shared Structure

- `src/app/layout.tsx` – global root; loads fonts, theme provider, command menu, toaster.
- `src/app/(marketing)/layout.tsx` – wraps all public marketing + docs pages with `MarketingHeader` and `MarketingFooter`.
- `src/app/(auth)/layout.tsx` – lightweight auth wrapper (centered card) used by login/signup forms.
- `src/app/(console)/layout.tsx` – dashboard shell: sidebar, topbar, and authenticated context (all `/dashboard` routes render inside).

## Marketing & Documentation

| URL | Component file | Notes & data hooks |
| --- | --- | --- |
| `/` | `src/app/page.tsx` (wraps `src/app/(marketing)/page.tsx`) | Hero/feature marketing content. Replace static feature lists, statistics, and testimonial copy with CMS/API data as needed. |
| `/docs` | `src/app/(marketing)/docs/page.tsx` | New client component with local search (`useState`, `searchIndex`). Plug real search/autocomplete (Algolia/Lunr/API) into the `matches` logic. Tabs showcase guides, endpoint cards, code snippets; snippet content is read from local constants. |
| `/docs/quickstart` | `src/app/(marketing)/docs/quickstart/page.tsx` | Timeline-style onboarding with multi-language `CodeSnippetTabs`. All copy/snippets are inline; swap in generated docs + dynamic examples via props or CMS feed. |
| `/docs/reference` | `src/app/(marketing)/docs/reference/page.tsx` | Full API reference. Endpoint metadata stored in the `endpoints` array. Backend can replace with generated OpenAPI feed or MDX. `EndpointActions` (new component) handles clipboard + deep link; extend to hit live Explorer. |
| `/pricing` | `src/app/(marketing)/pricing/page.tsx` | Static pricing cards & FAQ. Replace `plans` import (`src/data/projects.ts`) or wire to billing API. |
| `/support` | `src/app/(marketing)/support/page.tsx` | Support channel cards + incident commitments. Hook the quick links and copy to CRM/Helpdesk data sources. |
| `/changelog` | `src/app/(marketing)/changelog/page.tsx` | Lists releases from local `updates` array. Swap for changelog CMS or GitHub feed.

## Auth Flows

All render inside `src/app/(auth)/layout.tsx` and currently use static placeholders.

| URL | Component file | Notes |
| --- | --- | --- |
| `/login` | `src/app/(auth)/login/page.tsx` | Form uses `react-hook-form` + shadcn UI. Connect submit handler to Auth API (credentials/OAuth). |
| `/signup` | `src/app/(auth)/signup/page.tsx` | Similar to login; includes plan selection placeholders. Wire to registration service. |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Simple email submission. Hook into password reset email endpoint. |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | Form expects token + new password. Validate token via query params. |
| `/verify-email` | `src/app/(auth)/verify-email/page.tsx` | Confirmation UI with button to resend verification. Connect resend handler to mail service. |

## Console / Dashboard

All URLs are prefixed with `/dashboard` and share sidebar/navigation defined in `src/components/layout/console-sidebar.tsx` (and related config at `src/config/navigation.ts`). Page components currently render static cards/tables but follow consistent patterns for future data wiring.

| URL | Component file | Data integration notes |
| --- | --- | --- |
| `/dashboard` | `src/app/(console)/dashboard/page.tsx` | Overview cards & charts placeholders. Replace with analytics API. |
| `/dashboard/onboarding` | `.../dashboard/onboarding/page.tsx` | Step list for project onboarding; wire to onboarding status service. |
| `/dashboard/projects` | `.../dashboard/projects/page.tsx` | Projects table mocked; connect to projects list endpoint. |
| `/dashboard/projects/[slug]` | `.../dashboard/projects/[slug]/page.tsx` | Overview for a project slug; expects slug param. Populate with summary metrics, activity feed, etc. |
| `/dashboard/projects/[slug]/settings` | `.../settings/page.tsx` | Form placeholders for project settings; attach to patch endpoints. |
| `/dashboard/projects/[slug]/api-keys` | `.../api-keys/page.tsx` | Table + dialogs for API keys; connect to key management endpoints. |
| `/dashboard/projects/[slug]/usage` | `.../usage/page.tsx` | Usage charts placeholders; integrate with metering service. |
| `/dashboard/projects/[slug]/billing` | `.../billing/page.tsx` | Billing invoices/subscription cards; fetch from billing API. |
| `/dashboard/projects/[slug]/logs` | `.../logs/page.tsx` | Log stream viewer; hook to log storage or streaming API. |
| `/dashboard/projects/[slug]/team` | `.../team/page.tsx` | Team member table/modals; connect to user management endpoints. |
| `/dashboard/projects/[slug]/webhooks` | `.../webhooks/page.tsx` | Webhook list + signature instructions; integrate CRUD + signing secret rotation. |
| `/dashboard/explorer` | `.../dashboard/explorer/page.tsx` | API explorer UI; currently static. Plug into OpenAPI + live request execution. |
| `/dashboard/monitoring` | `.../dashboard/monitoring/page.tsx` | Health dashboards placeholders. Feed from observability metrics. |
| `/dashboard/automation` | `.../dashboard/automation/page.tsx` | Automation/workflow cards; integrate with rules engine. |
| `/dashboard/finance` | `.../dashboard/finance/page.tsx` | Revenue + payouts UI; connect to finance service. |
| `/dashboard/logs` | `.../dashboard/logs/page.tsx` | Tenant-wide logs view. |
| `/dashboard/team` | `.../dashboard/team/page.tsx` | Org-wide team management. |
| `/dashboard/support` | `.../dashboard/support/page.tsx` | Support ticket history placeholders. |
| `/dashboard/billing` | `.../dashboard/billing/page.tsx` | Workspace-level billing summary. |
| `/dashboard/security` | `.../dashboard/security/page.tsx` | Security settings forms. |
| `/dashboard/settings` | `.../dashboard/settings/page.tsx` | Workspace settings (profile, locale). |
| `/dashboard/credentials` | `.../dashboard/credentials/page.tsx` | Credential management forms. |

## Supporting Components & Utilities

- Docs-specific UI (`CodeSnippetTabs`, `EndpointActions`, language context) lives in `src/components/docs/`. Backend can swap snippet sources or attach download links.
- Navigation structure (`marketingNav`, `dashboardSidebarNav`, etc.) defined in `src/config/navigation.ts`.
- UI primitives (shadcn) under `src/components/ui/`; re-use for new forms when hooking APIs.

## How to Extend / Plug In Data

1. **Fetch patterns** – Adopt Next.js Server Components, `fetch` inside page/route segments, or React Query on the client where live interactions are needed. Current pages are static shells ready for either approach.
2. **Form handling** – Existing forms use `react-hook-form` and `zod` validators (see `src/components/form`). Add submit handlers that call your backend clients in `@/lib/api` (create as needed).
3. **Stateful widgets** – Components like `CodeSnippetTabs` and dashboard tables expect arrays/objects. Replace hard-coded data with responses and pass down via props.
4. **Authorization** – Console routes assume authenticated context. Wire your auth provider in `src/app/(console)/layout.tsx` before rendering child components.
5. **Search/Explorer** – `/docs` search currently filters a local list. Swap `searchIndex` with real doc search results. `EndpointActions` can be extended to open a live API explorer modal instead of linking out.

This file should give backend engineers a quick “where do I patch in?” view for every visible page. Update it whenever new routes or dynamic data sources are added.
