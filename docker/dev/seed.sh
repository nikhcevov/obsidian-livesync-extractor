#!/bin/sh
set -eu

COUCHDB_URL="${COUCHDB_URL:-http://couchdb:5984}"
COUCHDB_DB="${COUCHDB_DB:-obsidian-livesync-v2}"
COUCHDB_USER="${COUCHDB_USER:-admin}"
COUCHDB_PASSWORD="${COUCHDB_PASSWORD:-changeme}"
FIXTURES="${SEED_FIXTURES:-/fixtures}"
EXAMPLE_IMAGE="${EXAMPLE_IMAGE:-/assets/example.png}"

AUTH="${COUCHDB_USER}:${COUCHDB_PASSWORD}"
BASE="${COUCHDB_URL}/${COUCHDB_DB}"
MTIME="$(($(date +%s) * 1000))"

wait_for_couch() {
	i=0
	while [ "$i" -lt 60 ]; do
		if curl -sf -u "$AUTH" "${COUCHDB_URL}/_up" >/dev/null; then
			return 0
		fi
		i=$((i + 1))
		sleep 1
	done
	echo "CouchDB not ready" >&2
	exit 1
}

ensure_db() {
	code="$(curl -so /dev/null -w "%{http_code}" -u "$AUTH" "$BASE")"
	if [ "$code" = "404" ]; then
		curl -sf -u "$AUTH" -X PUT "$BASE" -H "Content-Type: application/json" -d "{}" >/dev/null
		echo "Created database ${COUCHDB_DB}"
	elif [ "$code" = "200" ]; then
		echo "Database ${COUCHDB_DB} exists"
	else
		echo "Unexpected status ${code} for ${BASE}" >&2
		exit 1
	fi
}

doc_exists() {
	code="$(curl -so /dev/null -w "%{http_code}" -u "$AUTH" "${BASE}/${1}")"
	[ "$code" = "200" ]
}

put_doc() {
	id="$1"
	file="$2"
	if doc_exists "$id"; then
		echo "Skip existing ${id}"
		return 0
	fi
	sed "s/__MTIME__/${MTIME}/g" "$file" | curl -sf -u "$AUTH" -X PUT "${BASE}/${id}" \
		-H "Content-Type: application/json" \
		-d @- >/dev/null
	echo "Created ${id}"
}

put_image_leaf() {
	id="$1"
	image="$2"
	if doc_exists "$id"; then
		echo "Skip existing ${id}"
		return 0
	fi
	if [ ! -f "$image" ]; then
		echo "Missing image ${image}" >&2
		exit 1
	fi
	data="$(base64 <"$image" | tr -d '\n')"
	printf '{"type":"leaf","data":"%s"}' "$data" | curl -sf -u "$AUTH" -X PUT "${BASE}/${id}" \
		-H "Content-Type: application/json" \
		-d @- >/dev/null
	echo "Created ${id} from $(basename "$image")"
}

wait_for_couch
ensure_db

if doc_exists "dev-seed-marker"; then
	echo "Seed already applied"
	exit 0
fi

put_doc "h:dev-post-hello-leaf-1" "${FIXTURES}/h-dev-post-hello-leaf-1.json"
put_doc "dev-post-hello" "${FIXTURES}/dev-post-hello.json"
put_doc "h:dev-post-draft-leaf-1" "${FIXTURES}/h-dev-post-draft-leaf-1.json"
put_doc "dev-post-draft" "${FIXTURES}/dev-post-draft.json"
put_image_leaf "h:dev-image-sample-leaf-1" "$EXAMPLE_IMAGE"
put_doc "dev-image-sample" "${FIXTURES}/dev-image-sample.json"
put_doc "h:dev-post-with-image-leaf-1" "${FIXTURES}/h-dev-post-with-image-leaf-1.json"
put_doc "dev-post-with-image" "${FIXTURES}/dev-post-with-image.json"
put_doc "dev-seed-marker" "${FIXTURES}/dev-seed-marker.json"

echo "Seed complete"
