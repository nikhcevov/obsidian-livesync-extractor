.PHONY: dev dev-down dev-reset dev-logs dev-seed

dev:
	docker compose -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-reset:
	docker compose -f docker-compose.dev.yml down -v
	rm -rf dev/public/* dev/state/*

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f livesync-publisher

dev-seed:
	docker compose -f docker-compose.dev.yml run --rm couchdb-seed
