# Flappy 999 — Full project (client + optional server + ports)

This repository contains:
- client/ single-page PWA (index.html + client-game.js + sw.js + manifest + icons)
- server/ leaderboard server (Node.js + Express + SQLite)
- phaser-starter/ minimal Phaser scaffold
- unity-notes/ guidance and a C# script skeleton for Unity port
- scripts/ helper scripts to write files and create zip or push to GitHub

No license (you specified "none").

Quick local run (client only):
1. Save files and open index.html in a modern browser.
2. Press Start to enable audio and play.

Optional leaderboard server:
1. cd server
2. npm install
3. node index.js
4. Server runs on http://localhost:3000 and exposes:
   - GET /scores  -> returns top scores
   - POST /score  -> body: { mode: "single", score: 12, player: "P1" }

Docker:
- From project root: docker-compose up --build

Creating a ZIP and initializing Git:
- Run `scripts/make_project.sh` (on macOS/Linux) to re-create files locally and zip them.
- To create a GitHub repo using `gh`, use `scripts/push_with_gh.sh` (edit the script to set repo name), or run it manually.

If you want me to push these into an existing GitHub repository, give me the repo full name (owner/repo) and confirm, then I will create a branch and push the files for you.
