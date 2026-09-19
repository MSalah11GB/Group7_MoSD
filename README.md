# PROJECT DESCRIPTION – GROUP 7: SPOTIFY

## 1. PROJECT OVERVIEW
**Project Name:** Spotify
**Group:** 7

Spotify is a fully functional music streaming web application designed to provide a comprehensive and immersive listening experience. It features a modern, responsive user interface for music playback and discovery, accompanied by a dedicated Admin Panel for content management. The system supports seamless audio streaming, playlist creation, and user authentication, leveraging a robust backend to handle media storage and data retrieval.

## 2. OBJECTIVES
* **Seamless Streaming Experience:** Provide users with high-quality audio playback, including controls for shuffle, loop, and queue management.
* **Content Management:** Empower administrators to easily upload and manage songs, albums, and artist profiles through a secure dashboard.
* **Personalization:** Allow users to create custom playlists, search for their favorite tracks, and view synchronized lyrics.

## 3. TECHNOLOGIES USED
The application is built using a modern **JavaScript** stack, ensuring performance and scalability.

### Frontend (User & Admin)
* **Framework:** React.js (Vite) for fast and interactive UI development.
* **Styling:** Tailwind CSS for a responsive, utility-first design system.
* **State Management & Routing:** React Router DOM and Context API (PlayerContext, PlaylistContext).
* **Authentication:** Clerk for secure and easy-to-integrate user authentication.
* **HTTP Client:** Axios for API requests.

### Backend
* **Runtime:** Node.js with Express.js for handling RESTful API routes.
* **Database:** MongoDB (via Mongoose) for storing metadata on users, songs, albums, and playlists.
* **Media Storage:** Cloudinary for efficient cloud storage and retrieval of image and audio assets.
* **External Integration:** Spotify Web API (metadata lookup only) to pre-fill song details in the admin panel.

## 4. MAIN FEATURE GROUPS

### User Features
* **Music Player:** Full playback controls (Play, Pause, Next, Previous), volume control, and progress bar navigation.
* **Discovery:** Browse content by Albums, Artists, and Genres.
* **Search:** Real-time search functionality to find songs and artists.
* **Library Management:** Users can create personal playlists, like songs, and manage their queue.
* **Lyrics Display:** Support for parsing and displaying synchronized lyrics (`.lrc` format).

### Administrator Features
* **Dashboard:** Specialized interface for content administrators.
* **Content Upload:** Tools to upload new songs, create albums, and add artist profiles using forms that integrate with Cloudinary for file hosting.
* **Content Management:** Edit or remove existing tracks, albums, and genres to keep the library up to date.

## 5. SYSTEM ARCHITECTURE
* **Client-Server Model:** The application separates the client (React Frontend) from the server (Express Backend), communicating via JSON REST APIs.
* **Database Schema:** Utilizes MongoDB collections for `Users`, `Songs`, `Albums`, `Artists`, `Playlists`, and `Genres`.
* **Security:** Authentication middleware ensures that protected routes (like playlist creation or admin uploads) are accessible only to authorized users.

## 6. TEAM STRUCTURE

**Total Members:** 13

| No. | Member Name | Email |
| :--- | :--- | :--- |
| 1 | Nguyễn Đức Anh | anh.nd226009@sis.hust.edu.vn |
| 2 | Phạm Quang Anh | anh.pq220071@sis.hust.edu.vn |
| 3 | Vũ Ngọc Dũng | dung.vn226032@sis.hust.edu.vn |
| 4 | Vũ Bình Minh | minh.vb226058@sis.hust.edu.vn |
| 5 | Trịnh Mạnh Quỳnh | quynh.tm226064@sis.hust.edu.vn |
| 6 | Nguỵ Quang Sơn | son.nq225998@sis.hust.edu.vn |
| 7 | Lò Đức Tài | tai.ld225999@sis.hust.edu.vn |
| 8 | Đinh Ngọc Lập Thành | thanh.dnl226000@sis.hust.edu.vn |
| 9 | Ngô Anh Tú | tu.na226005@sis.hust.edu.vn |
| 10 | Phan Hoàng Tú | tu.ph226068@sis.hust.edu.vn |
| 11 | Bùi Hoàng Việt | viet.bh226073@sis.hust.edu.vn |
| 12 | Nguyễn Long Vũ | vu.nl226006@sis.hust.edu.vn |
| 13 | Bùi Xuân Sơn | son.bx226065@sis.hust.edu.vn |


## 7. GETTING STARTED

The repository contains three independent apps, each with its own `package.json` and `node_modules`: `spotify-backend` (API), `spotify-frontend` (user site) and `spotify-admin` (admin panel). Requires Node.js 22+.

```bash
# once per app
(cd spotify-backend && npm install)
(cd spotify-frontend && npm install)
(cd spotify-admin && npm install)

node start.js        # runs all three: API on :4000, user site on :5173, admin panel on :5174
```

Or run them separately with `npm run dev` inside each folder. Other commands, run inside the app folder:

```bash
npm test             # tests (backend tests start an in-memory MongoDB)
npm run lint         # ESLint (user site and admin)
npm run typecheck    # backend only
npm run build        # production build
npm run test:e2e     # user site only: real-browser smoke tests (Playwright; first run: npx playwright install chromium)
```

### Configuration
Copy each `.env.example` to `.env` and fill it in:

| App | File | Notes |
| :--- | :--- | :--- |
| Backend | `spotify-backend/.env` | MongoDB, Clerk secret + publishable key, Cloudinary, optional Spotify keys, `CORS_ORIGINS` |
| User site | `spotify-frontend/.env` | `VITE_API_BASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY` |
| Admin panel | `spotify-admin/.env` | `VITE_API_BASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY` |

### Authentication and admin access
* The apps send the Clerk session token as `Authorization: Bearer <token>`; the API derives the user from that token only and ignores any user id in request bodies.
* Public: browsing songs, albums, artists, genres and public playlists.
* Signed-in users: create playlists and edit **their own** playlists.
* Admins only: every add / update / remove route for songs, albums, artists and genres, and `/api/db/*`.
* To make someone an admin, either set `{ "role": "admin" }` in their Clerk **public metadata**, or add their Clerk user id to `ADMIN_USER_IDS` in `spotify-backend/.env`.

### Uploads
* The admin panel uploads songs, lyrics, album art and artist photos **directly from the browser to Cloudinary** using a short-lived signature from `POST /api/uploads/sign` (admin only). The API then asks Cloudinary whether the upload exists, reads the URL and duration from Cloudinary itself, and saves that. Large audio files never pass through the API.
* Playlist cover images (uploaded by regular users) still go through the API and are limited to `MAX_UPLOAD_MB` (default 5).
* Deleting or replacing a song also deletes its audio and lyrics files from Cloudinary.
* Songs are no longer downloaded from YouTube. The Spotify URL field only pre-fills the song name, artists and cover; you always upload the audio file yourself.

### API notes
* `song.album` in API responses is the album's **name**, but the database stores a reference (`albumId`), so renaming an album updates all its songs.
* Genre `songCount` / `songList`, artist `genres` and playlist `songCount` are computed when read, not stored.
* List endpoints (`/api/song|album|artist|playlist/list`) return everything by default. Add `?page=1&limit=20` (limit up to 100) to get a page plus a `pagination` object.

### Upgrading an existing database
Data created before the schema change needs a one-off migration (the API logs a warning at startup until it is done):

```bash
cd spotify-backend
npm run migrate:normalize              # dry run: only reports what would change
npm run migrate:normalize -- --apply   # back up the database first, then apply
```
It is safe to run more than once.
