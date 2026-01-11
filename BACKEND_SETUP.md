# FieldOps Pro: PostgreSQL Hub Setup

## 1. Connection Choice (CRITICAL)
For deployment on **Render**, you **MUST** use the **Transaction Pooler** connection string. 

**Why?**
- Render instances often cannot route to Supabase direct IPv6 addresses, causing `ENETUNREACH`.
- The Pooler uses **IPv4** (Port 6543) which works perfectly on Render.
- It is optimized for serverless/containerized apps.

## 2. Supabase Settings
1. Go to **Settings** > **Database**.
2. Find the **Connection String** section.
3. Click the **Pooler** tab.
4. Mode: `Transaction`.
5. Port: `6543`.
6. Copy the string. It will look like:
   `postgresql://postgres.[ID]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`

## 3. Render Setup
1. Open your Render Web Service.
2. Go to **Environment**.
3. Set **DATABASE_URL** to your copied Pooler string.
   - *Ensure it ends with `?pgbouncer=true`*
4. Restart your service.

## 4. Troubleshooting
If you see `Error: connect ENETUNREACH`, double-check that you are using port **6543** (Pooler) and NOT 5432 (Direct). 
