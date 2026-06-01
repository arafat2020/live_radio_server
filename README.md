# [ WEB RADIO SERVER ARCHITECTURE ]

A production-ready, scalable web radio server implementation. This system features an automated DJ that plays tracks from a database, seamless switching to a live human DJ, and scalable file storage.

## ✦ PURPOSE ✦
The purpose of this project is to provide a fully decoupled, robust radio broadcasting system. By separating the API layer, storage layer, and streaming engine, the architecture can scale horizontally. It allows multiple DJs to broadcast live, automates playlist generation, and handles media uploads using modern cloud-native patterns.

## ✦ TECH STACK & ARCHITECTURE ✦

- **NestJS**: The core API layer handling uploads and business logic.
- **Drizzle ORM & PostgreSQL**: Database layer storing track metadata.
- **MinIO**: S3-compatible object storage for hosting audio files and cover art.
- **BullMQ & Redis**: Asynchronous job queue for processing audio and rebuilding playlists without blocking the API.
- **Liquidsoap**: The powerful stream generator (DJ engine) that reads playlists, applies crossfades, and accepts live input.
- **Icecast**: The audio streaming server that broadcasts the final mixed stream to listeners worldwide.
- **Docker Compose**: Orchestrates all infrastructure services locally.

---

## ✦ FEATURES ✦

- **AutoDJ**: Automatically plays songs uploaded to the system via a dynamically generated `m3u` playlist.
- **Live DJ Fallback**: Human DJs can connect live using standard broadcasting software (e.g., BUTT, Mixxx, OBS). The stream instantly and gracefully crossfades from the automated playlist to the live DJ.
- **S3-Compatible Storage**: Audio files are safely stored in MinIO rather than the local filesystem, preparing the app for cloud deployments like AWS S3.
- **Asynchronous Processing**: Uploads trigger a background job to rebuild the playlist, keeping the API lightning fast.

---

## ✦ SETUP AND INSTALLATION ✦

### 1. Prerequisites
- **Docker & Docker Compose**
- **Node.js** (v18+)

### 2. Install Dependencies
Install the NestJS project dependencies:
```bash
npm install
```

### 3. Start Infrastructure
Start the Docker containers (PostgreSQL, Redis, MinIO, Icecast, Liquidsoap) in the background:
```bash
docker-compose up -d
```

### 4. Initialize Database
Push the Drizzle ORM schema to the PostgreSQL database:
```bash
npx drizzle-kit push:pg
```

### 5. Start the API Server
Start the NestJS application:
```bash
npm run start:dev
```

---

## ✦ USAGE GUIDE ✦

### Uploading a Track (AutoDJ)
To add a track to the automated playlist, send a `POST` request to the `/upload` endpoint with a multipart form containing an audio file.

**Example via cURL:**
```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@/path/to/your/song.mp3"
```
*Behind the scenes: The API uploads the file to MinIO, saves it to Postgres, and BullMQ generates a fresh `radio.m3u` playlist for Liquidsoap to instantly read.*

### Listening to the Radio
Open your browser or any media player (like VLC) and connect to the Icecast stream:
```
http://localhost:8000/live.mp3
```

### Broadcasting as a Live DJ
You can interrupt the automated playlist and broadcast live.
1. Download a broadcasting tool like [BUTT (Broadcast Using This Tool)](https://danielnoethen.de/butt/).
2. Add a new server with the following details:
   - **Address**: `localhost` (or your server's public IP)
   - **Port**: `8005`
   - **Password**: `dj-password` *(Configured in `liquidsoap/radio.liq`)*
   - **Mountpoint**: `/live-dj`
3. Click **Play** to connect.
4. Liquidsoap will automatically crossfade from the current song to your microphone! When you disconnect, the auto-playlist resumes.

---

## ✦ PROJECT STRUCTURE ✦

- `/src/audio` - BullMQ worker that generates `radio.m3u` playlists.
- `/src/db` - Drizzle ORM setup and PostgreSQL schema.
- `/src/minio` - AWS SDK configuration for S3 uploads and public bucket policies.
- `/src/upload` - API controllers for receiving `.mp3` files.
- `/liquidsoap` - Contains `radio.liq`, the stream processing engine configuration.
- `docker-compose.yml` - Defines the external infrastructure.
