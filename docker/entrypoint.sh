#!/bin/sh
set -eu

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"
HUGO_DIR="/hugo"

mkdir -p "$HUGO_DIR" /public /state "$HUGO_DIR/content/posts" "$HUGO_DIR/static/img"

if [ ! -f "$HUGO_DIR/hugo.toml" ] && \
	[ ! -f "$HUGO_DIR/hugo.yml" ] && \
	[ ! -f "$HUGO_DIR/hugo.yaml" ]; then
	cp /app/defaults/hugo.toml "$HUGO_DIR/hugo.toml"
fi

for dir in archetypes themes; do
	if [ ! -d "$HUGO_DIR/$dir" ] && [ -d "/app/site/$dir" ]; then
		mkdir -p "$HUGO_DIR/$dir"
		cp -rn "/app/site/$dir/." "$HUGO_DIR/$dir/"
	fi
done

if [ "$(id -u)" = "0" ]; then
	chown -R "${PUID}:${PGID}" "$HUGO_DIR" /public /state 2>/dev/null || true
	if command -v gosu >/dev/null 2>&1; then
		exec gosu "${PUID}:${PGID}" "$@"
	fi
	if command -v su-exec >/dev/null 2>&1; then
		exec su-exec "${PUID}:${PGID}" "$@"
	fi
fi

exec "$@"
