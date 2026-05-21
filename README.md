# Obsidian LiveSync → Hugo Publisher

Self-hosted publisher that watches an Obsidian LiveSync CouchDB database, rebuilds markdown posts from `posts/`, extracts embedded images, runs Hugo (PaperMod), and writes a static site to `/public` for your existing Caddy reverse proxy.

No Git, no Obsidian on the server, no filesystem sync.

## Architecture

```
Obsidian → LiveSync → CouchDB → livesync-publisher → Hugo → /public → Caddy
```

## Quick start (production)

Pull the image from GitHub Container Registry (after CI publishes it):

```yaml
services:
  livesync-publisher:
    image: ghcr.io/<your-github-user>/livesync-publisher:latest
    restart: unless-stopped
    environment:
      COUCHDB_URL: http://couchdb.host:5984
      COUCHDB_DB: obsidian-livesync-v2
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: ${COUCHDB_PASSWORD}
      SITE_BASE_URL: https://blog.example.com/
      SITE_TITLE: My Blog
      PUID: 1000
      PGID: 1000
    volumes:
      - /srv/blog/public:/public
      - /srv/blog/state:/state
```

Point Caddy at `/srv/blog/public`:

```
blog.example.com {
  root * /srv/blog/public
  encode zstd gzip
  file_server
}
```

## Publishing rules

Posts are read from CouchDB paths under `posts/` (configurable via `WATCH_FOLDERS`).

| Condition                         | Result                               |
| --------------------------------- | ------------------------------------ |
| `published: true` in frontmatter  | Published to site                    |
| `published` missing or not `true` | Removed from site (if was published) |
| Document deleted in CouchDB       | Removed from site                    |
| Conflicted revision               | Skipped (logged)                     |

Minimal auto-generated frontmatter when missing:

```yaml
---
title: "My Article"
date: 2026-05-20
---
```

## Images

- LiveSync binary docs (`type: newnote`) with image extensions are indexed
- Obsidian wikilinks `![[image.png]]` and markdown `![](path)` are resolved
- Files written to `/site/static/img/<hash>-<name>` and linked as `/img/...`
- Reference counting removes orphaned images when posts are updated or unpublished

## Environment variables

| Variable              | Required | Default             | Description                                 |
| --------------------- | -------- | ------------------- | ------------------------------------------- |
| `COUCHDB_URL`         | yes      | —                   | CouchDB base URL (no database suffix)       |
| `COUCHDB_DB`          | yes      | —                   | Database name (e.g. `obsidian-livesync-v2`) |
| `COUCHDB_USER`        | no       | —                   | Username if not in URL                      |
| `COUCHDB_PASSWORD`    | no       | —                   | Password if not in URL                      |
| `COUCHDB_AUTO_CREATE` | no       | `false`             | Create DB on startup if missing (dev)       |
| `WATCH_FOLDERS`       | no       | `posts/`            | Comma-separated vault folders               |
| `SITE_BASE_URL`       | no       | `http://localhost/` | Hugo `baseURL`                              |
| `SITE_TITLE`          | no       | `My Blog`           | Site title                                  |
| `SITE_LANGUAGE`       | no       | `en`                | Hugo language code                          |
| `PERMALINK_PATTERN`   | no       | `/blog/:slug/`      | Hugo permalink for posts                    |
| `DEBOUNCE_MS`         | no       | `4000`              | Debounce window for rebuilds                |
| `LOG_LEVEL`           | no       | `info`              | Pino log level                              |
| `IMAGE_URL_PREFIX`    | no       | `/img`              | URL prefix in rewritten markdown            |
| `MAX_IMAGE_BYTES`     | no       | `10485760`          | Max image size (10 MB)                      |
| `IMAGE_EXTENSIONS`    | no       | see `.env.example`  | Allowed image extensions                    |
| `PUID` / `PGID`       | no       | `1000`              | Volume ownership (Unraid-friendly)          |

## Volumes

| Mount     | Required | Purpose                          |
| --------- | -------- | -------------------------------- |
| `/public` | yes      | Hugo output (serve via Caddy)    |
| `/state`  | yes      | `last_seq`, image refs, refcount |

Optional: mount `/site/content` to inspect generated markdown on the host.

## Local development

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up --build
```

CouchDB Fauxton: http://localhost:5984/\_utils

Build TypeScript locally:

```bash
cd publisher && npm install && npm run build
```

Run unit tests (Vitest):

```bash
cd publisher && npm test
```

`docker-compose.dev.yml` sets `COUCHDB_AUTO_CREATE=true` so a fresh CouchDB gets the LiveSync database without manual `curl -X PUT`.

Init PaperMod submodule (optional; Docker build clones it automatically):

```bash
git submodule update --init --recursive
```

Preview static output:

```bash
docker compose -f docker-compose.dev.yml exec livesync-publisher ls /public
python3 -m http.server 8080 --directory ./public  # if you copy /public out
```

## Obsidian setup

1. Install **Self-hosted LiveSync** and connect to your CouchDB.
2. Store blog posts under `posts/` in the vault.
3. Add frontmatter to publish:

```yaml
---
title: "My Article"
published: true
date: 2026-05-20
tags:
  - homelab
---
```

4. Save — the publisher picks up changes via CouchDB `_changes` within a few seconds.

## Troubleshooting

| Symptom                                       | Check                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No posts on site                              | `published: true` set? Path under `posts/`?                                                                                                                                                                                                                                                                  |
| Post not updating                             | Publisher logs (`LOG_LEVEL=debug`), CouchDB connectivity                                                                                                                                                                                                                                                     |
| Images broken                                 | Image doc replicated? Supported extension? Under size limit?                                                                                                                                                                                                                                                 |
| Hugo build fails                              | `docker logs` — missing theme or invalid frontmatter                                                                                                                                                                                                                                                         |
| Restart re-processes everything               | Delete `/state/last_seq.json` to force full bootstrap                                                                                                                                                                                                                                                        |
| `You are not a server admin` (401) on startup | `COUCHDB_USER` must be `admin`; password must match the existing CouchDB volume. After changing `COUCHDB_PASSWORD`, run `docker compose -f docker-compose.dev.yml down -v` to reset `couchdb_data`. If CouchDB logs show `Missing system database _users`, the volume is corrupt — `down -v` fixes that too. |

Structured log events: `change_received`, `doc_written`, `doc_deleted`, `doc_skipped`, `image_missing`, `build_started`, `build_finished`, `build_failed`.

## Versioning and releases

Version lives in `publisher/package.json` (currently `0.1.0`). That value is logged at startup (`version` in every JSON log line) and baked into the Docker image label `org.opencontainers.image.version`.

**Release flow (automated tags):**

1. Bump `version` in `publisher/package.json` (semver: `MAJOR.MINOR.PATCH`).
2. Commit **including** the `package.json` change and push to `main`.

```bash
# example
npm version patch --prefix publisher --no-git-tag-version
git add publisher/package.json publisher/package-lock.json
git commit -m "chore: release v0.2.0"
git push origin main
```

3. GitHub Actions on `main` detects the `package.json` change, creates tag `v0.2.0` if it does not exist yet, and pushes it.
4. The tag push runs a second workflow: publishes `ghcr.io/<owner>/livesync-publisher:0.2.0` (and `0.2`, `0`), and creates a GitHub Release with notes.

The `main` push still publishes `latest` and `sha-<commit>` in parallel.

Manual tags are optional; CI fails a tag build if `vX.Y.Z` ≠ `package.json` version.

**Do not** bump `package.json` without intending a release — any commit that changes that file triggers a new tag when the version is new.

**Pin production** to a version tag instead of `latest`:

```yaml
image: ghcr.io/<owner>/livesync-publisher:0.2.0
```

Check the running image:

```bash
docker inspect livesync-publisher --format '{{index .Config.Labels "org.opencontainers.image.version"}}'
docker logs livesync-publisher 2>&1 | head -1   # "version":"0.2.0" in JSON
```

## Build image locally

```bash
docker build --build-arg VERSION=0.1.0-local -t livesync-publisher:local .
```

## Deferred / out of scope

- E2EE / path obfuscation
- PDF and other non-image attachments
- Hugo Page Bundles (flat `static/img/` only)
- `notes/` and `pages/` sections (folders configurable, not styled)
- Wiki links between notes, HTML `<img>` rewriting
- Scheduled publishing, search, AI summaries

## License

MIT
