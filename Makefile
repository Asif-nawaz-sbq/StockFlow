.DEFAULT_GOAL := help
COMPOSE := docker compose
API := $(COMPOSE) exec -T api

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

.PHONY: env
env: ## Create .env from the example if it does not exist
	@test -f .env || (cp .env.example .env && echo "created .env")

.PHONY: up
up: env ## Start the whole stack
	$(COMPOSE) up -d --build

.PHONY: down
down: ## Stop containers, keep data
	$(COMPOSE) down

.PHONY: clean
clean: ## Stop containers and delete the database volume
	$(COMPOSE) down -v

.PHONY: logs
logs: ## Tail api and web logs
	$(COMPOSE) logs -f api web

.PHONY: ps
ps: ## Show container status
	$(COMPOSE) ps

.PHONY: migrate
migrate: ## Apply pending migrations
	$(API) npm run migration:run

.PHONY: migrate-down
migrate-down: ## Roll back the most recent migration
	$(API) npm run migration:revert

.PHONY: migrate-status
migrate-status: ## List applied and pending migrations
	$(API) npm run migration:show

.PHONY: seed
seed: ## Wipe tenant data and reseed with demo data
	$(API) npm run seed

.PHONY: reset
reset: clean up ## Rebuild from empty, then migrate and seed
	@echo "waiting for the api to come up..."
	@until curl -sf http://localhost:3001/health/live >/dev/null 2>&1; do sleep 2; done
	$(MAKE) migrate
	$(MAKE) seed

.PHONY: test
test: ## Unit tests
	cd apps/api && npm test

.PHONY: test-e2e
test-e2e: ## Integration tests (needs postgres and redis up)
	cd apps/api && npm run test:e2e

.PHONY: lint
lint: ## Typecheck both apps
	cd apps/api && npx tsc --noEmit
	cd apps/web && npx tsc --noEmit

.PHONY: psql
psql: ## Open a psql shell
	$(COMPOSE) exec postgres psql -U stockflow -d stockflow
