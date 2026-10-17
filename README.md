# Lektra

A lightweight campus planner for students — keep your lectures, sections, labs, quizzes, deadlines and exams in one calendar. Everything lives in a single HTML file, with no build step and no dependencies.

**Live demo:** https://ahmedkamalrezk.github.io/Lektra/

## Features

- **Monthly calendar** with color-coded subjects and a "Today" shortcut
- **Entry types:** Lecture, Section, Lab (repeat weekly) and Quiz, Deadline, Midterm, Final (one-off)
- **Subjects** with their own colors and per-subject filtering
- **Quick add** from the "What are your plans?" bar, including **voice input** (supports Arabic digits)
- **Offline-friendly:** data is saved in your browser's `localStorage`
- **Optional Google Drive sync** to store files per subject (uses the `drive.file` scope only)

## Run locally

No installation needed. Just open the file in a browser:

```bash
git clone https://github.com/ahmedkamalrezk/Lektra.git
cd Lektra
open index.html   # or double-click it
```

## Deploy on GitHub Pages

1. Go to **Settings → Pages**
2. Under **Build and deployment**, choose **Deploy from a branch**
3. Select branch `main` and folder `/ (root)`, then **Save**

The site will be available at `https://<your-username>.github.io/Lektra/` after a minute or two.

## Enable Google Drive sync (optional)

1. Create an OAuth 2.0 **Web application** client ID in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add your site's URL (e.g. `https://ahmedkamalrezk.github.io`) to **Authorized JavaScript origins**
3. Open `index.html` and set the client ID at the top of the script:

```js
var CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
```

## Notes

- Data is stored per browser/device. Clearing site data will erase it.
- Voice input relies on the browser's Web Speech API (best supported in Chrome and Safari).

## Tech

Plain HTML, CSS and vanilla JavaScript — a single self-contained file.
