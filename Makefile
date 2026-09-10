.PHONY: install dev gate lint typecheck test build

install:
	pnpm install
	cd services/generation-engine && uv sync

dev:
	pnpm dev

gate:
	pnpm turbo run lint typecheck test build

lint:
	pnpm turbo run lint

typecheck:
	pnpm turbo run typecheck

test:
	pnpm turbo run test

build:
	pnpm turbo run build
