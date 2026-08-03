# INVOX Web

Next.js frontend for the INVOX Supply Chain Finance platform.

## Getting Started

The frontend runs on port `3000`. The Nest API runs on port `3001`.

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Configure the API URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Start the API separately:

```bash
cd ../api
npm run start:dev
```

Then open [http://localhost:3000](http://localhost:3000).

Default local login after seeding the API:

```txt
admin@invox.com
Admin@123456
```

Primary routes:

- `/dashboard`
- `/counterparties`
- `/programmes`
- `/invoices`
- `/financing`
- `/reports`

The app uses Axios, TanStack Query, React Hook Form, Zod, and local shadcn-style UI primitives.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
