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
* **External Integration:** Integration with external APIs and libraries (such as `youtube-sr`) for metadata fetching and search capabilities.

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
