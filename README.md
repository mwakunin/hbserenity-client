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

You can start editing the public home page by modifying `src/app/(site)/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## API types

`src/lib/api/schema.d.ts` is generated from the API's own OpenAPI document, so
nothing here restates a response shape by hand:

```bash
pnpm codegen                                  # defaults to http://localhost:9999/doc
API_ORIGIN=https://api.example pnpm codegen   # or point it elsewhere
OPENAPI_URL=https://api.example/doc pnpm codegen
```

The API has to be running — the document is served, not committed.

**This script needs a POSIX shell.** It resolves its default with
`${OPENAPI_URL:-${API_ORIGIN:-...}}`, which cmd.exe does not expand; on Windows
run it from WSL or Git Bash. Nothing else here is POSIX-only, but the API this
app talks to is developed against Docker Compose and a bash script, so a
Windows-native workflow is not a supported path today.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
