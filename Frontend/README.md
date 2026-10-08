# CareerSage Frontend

CareerSage is an interview, resume and career guidance frontend built with React + Vite.

> **Know where you stand. Know what to do next.**

## This version has NO dummy data

The project intentionally ships with empty states instead of fake users, scores, companies, questions or progress values.

The only personal information shown after login is the information the user actually enters in the login form. For example, entering `Charitha` makes the next page say `Good to see you, Charitha 👋`.

## Tech stack

- React
- Vite
- Lucide React
- CSS

### NumPy?

You **do not need NumPy** for this frontend. NumPy is a Python library and is not part of this React/Vite application.

The frontend dependencies are installed with:

```bash
npm install
```

Then run locally:

```bash
npm run dev
```

Build for deployment:

```bash
npm run build
```

## Backend integration

The FastAPI backend is in `backend/`. See `BACKEND_HANDOFF.md` for the login/registration and frontend API mapping, and `backend/README.md` for setup.

Set:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The local frontend connects to this API URL; `.env` is ignored by Git.

## Public GitHub + Vercel deployment

### 1. Open the actual project folder

If the extracted folder is nested, your terminal should end in:

```text
CareerSage-Frontend\\CareerSage-Frontend>
```

Run:

```powershell
cd .\\CareerSage-Frontend
```

### 2. Check the frontend

```powershell
npm install
npm run dev
```

### 3. Create a PUBLIC GitHub repository

On GitHub choose **New repository** and set **Visibility → Public**.

Repository name example:

```text
CareerSage-Frontend
```

Do not upload `.env` files or passwords/API secrets.

### 4. Push this folder

From the folder containing `package.json`:

```powershell
git init
git add .
git commit -m "Initial CareerSage frontend"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/CareerSage-Frontend.git
git push -u origin main
```

### 5. Deploy on Vercel

- Sign in to Vercel with GitHub.
- Choose **Add New → Project**.
- Import the public `CareerSage-Frontend` repository.
- Set **Root Directory** to the folder containing this `package.json`, `index.html`, and `src/main.jsx`. In the original workspace this is `CareerSage-Frontend-No-Dummy-Data/CareerSage-Frontend`; in the separated ZIP it is `Frontend`; in `CareerSage-Vercel-Frontend.zip`, extract and deploy the `CareerSage-Vercel-Frontend` folder itself.
- Framework: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Install command: `npm ci`.
- Click **Deploy**.

The deployment error `Failed to resolve /src/main.jsx` means the deployed source did not include `src/main.jsx` at its root. Confirm that `src/` is committed and that Vercel's Root Directory points to the frontend project folder. The supplied `vercel.json` defines the build settings; it cannot override Vercel's Root Directory selection.

The frontend `.vercelignore` excludes its local backend folder from this static deployment, so Vercel does not try to install backend-only Python packages as part of the frontend build. Deploy the FastAPI backend separately; its `uv.toml` selects copy mode to avoid the cross-filesystem hardlink warning when that backend is installed with uv. Vercel must create a new deployment from these updated files; old deployment logs will continue to show the warning.

Vercel can then redeploy the site when you push new commits to GitHub.

### 6. Configure the deployed backend

In Vercel:

**Project → Settings → Environment Variables**

Add:

```text
VITE_API_BASE_URL = https://your-backend.example.com
```

Then redeploy.

## Public repository warning

A public GitHub repository is visible to everyone. Never commit passwords, private API keys, database credentials, JWT secrets or `.env` files.
