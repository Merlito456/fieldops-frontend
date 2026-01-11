# FieldOps Pro

FieldOps Pro is a comprehensive operational management platform designed for Field Officers (FO) and technical vendors working with critical infrastructure (Cell Sites).

## Core Modules
- **Operational Dashboard**: Real-time oversight of site access and AI-generated logistics insights.
- **Work Assignments**: Task tracking for ECE engineers with Gemini-powered safety analysis.
- **Infrastructure Registry**: Digital twin of cell sites with forensic photo documentation.
- **Vendor Protocol Kiosk**: Biometric-verified site entry/exit system for external contractors.
- **Key Custody Ledger**: Chain-of-custody tracking for physical site keys.

## Quick Start
1. Run `npm install`.
2. Set your Gemini key: `export API_KEY=...`.
3. Launch: `npm run dev:all`.

For detailed setup instructions, including Cloudinary and Database configuration, see [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md).

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Node.js, Express, MySQL.
- **Intelligence**: Google Gemini (Flash 3.0).
- **Storage**: Cloudinary (Forensic Imagery).
