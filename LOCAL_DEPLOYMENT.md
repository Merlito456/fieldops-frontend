# Local Deployment Guide: FieldOps Pro

Follow these steps to get the full application (Frontend + Backend + AI) running on your local machine.

## Prerequisites
- **Node.js** (v18 or higher)
- **NPM** (comes with Node)
- **Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/)
- **Cloudinary Account**: For image storage (Free tier is fine)

---

## Step 1: Install Dependencies
Open your terminal in the project root directory and run:
```bash
npm install
```

## Step 2: Configure Environment Variables
The application requires a Gemini API Key for AI features and Cloudinary for photo uploads.

### A. Gemini API Key (Required for AI)
You must set your API key as an environment variable before starting the dev server.

**Windows (Command Prompt):**
```cmd
set API_KEY=your_actual_key_here
```

**Windows (PowerShell):**
```powershell
$env:API_KEY="your_actual_key_here"
```

**Mac / Linux:**
```bash
export API_KEY=your_actual_key_here
```

### B. Cloudinary Configuration
1. Log in to [Cloudinary](https://cloudinary.com/).
2. Go to **Settings** > **Upload**.
3. Scroll to **Upload Presets** and click **Add Upload Preset**.
4. Set the name to `Fieldops` (Exact case).
5. Set **Signing Mode** to `Unsigned`.
6. Save.
7. Note your **Cloud Name** (found on the Dashboard). If it differs from `drb2o9gts`, update `services/imageService.ts`.

---

## Step 3: Database Verification
The `server.js` file is currently pre-configured to connect to the remote MySQL database at `sql205.hstn.me`. 

- **If using the remote DB**: Ensure your network allows outbound connections to port 3306.
- **If using a local DB**: Update the `dbConfig` object in `server.js` with your local credentials and run the schema found in `BACKEND_SETUP.md`.

---

## Step 4: Launch the Application
You can now start both the Backend (Express) and Frontend (Vite) simultaneously:

```bash
npm run dev:all
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## Troubleshooting
- **AI Insights not loading**: Check that your `API_KEY` was exported correctly. Type `echo $API_KEY` (or `$env:API_KEY` in PS) to verify.
- **Photos not uploading**: Ensure the `Fieldops` unsigned preset is created in Cloudinary.
- **"Database unreachable"**: This usually means a firewall or company proxy is blocking the MySQL port (3306). The app will automatically fall back to **LocalStorage Mode** (Local Ledger) so you can still test the UI.
