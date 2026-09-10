/**
 * Hand-written TypeScript mirror of the generation-engine's Pydantic
 * response contract (see docs/hld/generation-engine-contract.md). Kept in
 * sync manually via the `sync-api-contract` skill until OpenAPI-based
 * codegen replaces this file — see that skill's SKILL.md for the plan.
 *
 * The engine is currently a stub that always returns one hardcoded room.
 * Nothing in this exact contract carries a dedicated "is this a stub"
 * field — the engine signals it through the existing, loosely-typed
 * `metadata.solver.status` (e.g. `"stub"`) rather than a new top-level key,
 * so consumers should treat `solver.status === "stub"` as the stub signal
 * until/unless a real field is added here (which would be a contract change
 * requiring updates on both sides, per this package's README).
 */

export interface GenerationRoom {
  id: string;
  type: string;
  polygon: Array<[number, number]>;
  area_m2: number;
}

export interface GenerationWall {
  id: string;
  polyline: Array<[number, number]>;
  thickness_m: number;
  is_exterior: boolean;
  height_m: number;
}

export interface GenerationOpening {
  id: string;
  type: string;
  wall_id: string;
  offset_m: number;
  width_m: number;
  height_m: number;
}

export interface GenerationFloor {
  level: number;
  height_m: number;
  rooms: GenerationRoom[];
  walls: GenerationWall[];
  openings: GenerationOpening[];
}

export interface GenerationRoof {
  type: string;
  pitch_deg: number;
}

export interface GenerationTemplateRef {
  id: string;
  code: string;
}

/** A rule the solver applied — either why a choice was made, or a warning. */
export interface RuleApplication {
  rule_id: string;
  params: Record<string, unknown>;
}

export interface GenerationSolverInfo {
  status: string;
  solve_time_ms: number;
  seed: number;
}

export interface GenerationMetadata {
  why_selected: RuleApplication[];
  warnings: RuleApplication[];
  solver: GenerationSolverInfo;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
}

export interface GenerationValidation {
  passed: boolean;
  checks: ValidationCheck[];
}

export interface GenerationCandidate {
  version_id: string;
  template: GenerationTemplateRef | null;
  floors: GenerationFloor[];
  roof: GenerationRoof | null;
  metadata: GenerationMetadata;
  validation: GenerationValidation;
}

export type GenerationStatus = "succeeded" | "partial" | "infeasible" | "failed";

export interface GenerationResponse {
  request_id: string;
  status: GenerationStatus;
  candidates: GenerationCandidate[];
}
