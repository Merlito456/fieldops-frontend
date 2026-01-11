# Deployment Guide: FieldOps Pro on Render

Follow these steps to deploy your full-stack application as a single **Web Service** on Render.

## Prerequisites
- Your code is pushed to a **GitHub** or **GitLab** repository.
- You have a **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).

---

## Step 1: Create a New Web Service
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub/GitLab repository.

## Step 2: Configure Service Settings
Fill in the following details:
- **Name**: `fieldops-pro` (or your preferred name)
- **Environment**: `Node`
- **Region**: Select the one closest to your users.
- **Branch**: `main` (or your primary branch)

### Build & Start Commands
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node server.js`

## Step 3: Set Environment Variables
Click on the **Advanced** button or the **Environment** tab and add:

| Key | Value |
| :--- | :--- |
| `API_KEY` | *Your Gemini API Key* |
| `NODE_ENV` | `production` |

## Step 4: Deploy
Click **Create Web Service**. Render will now:
1. Install all dependencies.
2. Run the Vite build to generate the `dist` folder.
3. Start the Express server via `server.js`.

---

## Technical Details
- **Unified Hosting**: The Express server handles both the API requests (under `/api`) and serves the static React files for the UI.
- **SPA Routing**: The server is configured with a catch-all route (`*`) to ensure that React Router works correctly when users refresh the page on routes like `/dashboard` or `/sites`.
- **Database**: The app connects to the remote MySQL database configured in `server.js`. Ensure your database allows connections from Render's IP range if you have strict firewall rules.

## Verify Deployment
Once the build is "Live", visit your Render URL (e.g., `https://fieldops-pro.onrender.com`).
- Check that the **Landing Page** loads.
- Open the Browser Console (F12) to ensure no 404 errors for the API.
- Try generating an AI insight on the Dashboard to verify `API_KEY` is working.
