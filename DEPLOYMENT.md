# Deploy the complete website

This setup serves the React/Vite frontend and FastAPI backend from one service, so the frontend calls the API on the same origin. Uploaded resumes, account records, and interview progress are stored in the backend JSON state file.

## Deploy on Render

1. Put the extracted `CareerSage-Website` folder in a Git repository and push it to GitHub.
2. In Render, choose **New → Blueprint** and connect that repository.
3. Render reads `render.yaml`, builds the frontend and backend image, and deploys the service.
4. When the first deploy completes, open the service URL. `/health` is the configured health check.

The Blueprint attaches a 1 GB persistent disk at `/var/data` and sets `CAREERSAGE_STATE_FILE` to that disk. Render requires a paid web service plan for persistent disks, so review its current pricing before creating the service. The service is kept to one instance because the JSON state file and disk are single-instance storage.

## Local Docker run

From this folder:

```sh
docker build -t careersage .
docker run --rm -p 10000:10000 -v careersage-data:/var/data -e CAREERSAGE_STATE_FILE=/var/data/user_state.json careersage
```

Then open `http://localhost:10000`. The Docker image installs only the declared frontend and backend dependencies and includes the supplied `Datasets/Geek Girls` modules.

The Vercel frontend-only archive is also available for static hosting. It does not deploy the FastAPI backend or provide durable user data by itself.
