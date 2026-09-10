// Bare specifier, not a "/base.js" subpath import: @rumah3d/eslint-config's
// package.json declares an "exports" map with only the "." condition, so a
// deep subpath import would fail to resolve.
export { default } from "@rumah3d/eslint-config";
