#!/bin/sh
set -eu

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"
CONFIG_DIR="/config"

mkdir -p "$CONFIG_DIR" /site /public /state /site/content/posts /site/static/img

if [ -f "$CONFIG_DIR/hugo.toml" ]; then
	cp "$CONFIG_DIR/hugo.toml" /site/hugo.toml
elif [ -f "$CONFIG_DIR/hugo.yml" ]; then
	cp "$CONFIG_DIR/hugo.yml" /site/hugo.yml
elif [ -f "$CONFIG_DIR/hugo.yaml" ]; then
	cp "$CONFIG_DIR/hugo.yaml" /site/hugo.yaml
else
	cp /app/defaults/hugo.toml "$CONFIG_DIR/hugo.toml"
	cp "$CONFIG_DIR/hugo.toml" /site/hugo.toml
fi

for dir in archetypes themes content static; do
	if [ -d "/app/site/$dir" ]; then
		cp -rn "/app/site/$dir" "/site/" 2>/dev/null || true
	fi
done

if [ "$(id -u)" = "0" ]; then
	chown -R "${PUID}:${PGID}" "$CONFIG_DIR" /site /public /state 2>/dev/null || true
	if command -v gosu >/dev/null 2>&1; then
		exec gosu "${PUID}:${PGID}" "$@"
	fi
	if command -v su-exec >/dev/null 2>&1; then
		exec su-exec "${PUID}:${PGID}" "$@"
	fi
fi

exec "$@"
