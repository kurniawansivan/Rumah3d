# apps/web

Next.js frontend + BFF for Rumah3d. See the repo root [`CLAUDE.md`](../../CLAUDE.md) for overall
product/architecture context, and
[`docs/prd/floor-plan-wizard.md`](../../docs/prd/floor-plan-wizard.md) for the full wizard spec
this app implements. Only wizard step 1 ("lot data", `src/app/design/new/lot`) is wired up so
far — see the `new-wizard-step` skill for scaffolding steps 2-5.

**Current state: the generation engine is a stub.** The BFF route
(`src/app/api/design/generate/route.ts`) forwards a validated design brief to
`services/generation-engine`, which right now always returns one hardcoded room instead of a
real generated layout. The preview page (`src/app/design/new/preview`) surfaces this with an
explicit "mode uji coba" (test mode) notice whenever the response's
`metadata.solver.status === "stub"` — see
[`packages/schemas/README.md`](../../packages/schemas/README.md) for the response contract this
is validated against.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
