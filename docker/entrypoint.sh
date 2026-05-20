#!/bin/sh
set -eu

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

export SITE_BASE_URL="${SITE_BASE_URL:-http://localhost/}"
export SITE_TITLE="${SITE_TITLE:-My Blog}"
export SITE_LANGUAGE="${SITE_LANGUAGE:-en}"
export PERMALINK_PATTERN="${PERMALINK_PATTERN:-/blog/:slug/}"

mkdir -p /site /public /state /site/content/posts /site/static/img

envsubst '${SITE_BASE_URL} ${SITE_TITLE} ${SITE_LANGUAGE} ${PERMALINK_PATTERN}' \
	</app/site/hugo.toml.tmpl >/site/hugo.toml

for dir in archetypes themes content static; do
	if [ -d "/app/site/$dir" ]; then
		cp -rn "/app/site/$dir" "/site/" 2>/dev/null || true
	fi
done

if [ "$(id -u)" = "0" ]; then
	chown -R "${PUID}:${PGID}" /site /public /state 2>/dev/null || true
	if command -v gosu >/dev/null 2>&1; then
		exec gosu "${PUID}:${PGID}" "$@"
	fi
	if command -v su-exec >/dev/null 2>&1; then
		exec su-exec "${PUID}:${PGID}" "$@"
	fi
fi

exec "$@"
