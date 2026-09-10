/**
 * Hand-written TypeScript mirror of the generation-engine's Pydantic
 * response contract (see docs/hld/generation-engine-contract.md). Kept in
 * sync manually via the `sync-api-contract` skill until OpenAPI-based
 * codegen replaces this file — see that skill's SKILL.md for the plan.
 *
 * The engine is currently a stub that always returns one hardcoded room —
 * check `metadata.engine_mode === "stub"` to detect that, not
 * `metadata.solver.status` (which is a separate, solver-internal field).
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

export interface GenerationStair {
  id: string;
  from_level: number;
  to_level: number;
  polygon: Array<[number, number]>;
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
  engine_version: string;
  engine_mode: "stub" | "solver";
  why_selected: RuleApplication[];
  objective_breakdown: Record<string, number>;
  warnings: RuleApplication[];
  solver: GenerationSolverInfo;
}

export interface ValidationCheck {
  rule_id: string;
  passed: boolean;
  params: Record<string, unknown>;
}

export interface GenerationValidation {
  passed: boolean;
  checks: ValidationCheck[];
}

export interface GenerationCandidate {
  version_id: string;
  template: GenerationTemplateRef | null;
  floors: GenerationFloor[];
  stairs: GenerationStair[];
  roof: GenerationRoof | null;
  metadata: GenerationMetadata;
  validation: GenerationValidation;
}

/**
 * Matches the engine's contract exactly (docs/hld/generation-engine-contract.md):
 * a genuine internal failure is an HTTP 500 with no parseable body, never a
 * `"failed"` status value here.
 */
export type GenerationStatus = "success" | "partial" | "infeasible";

export interface GenerationResponse {
  request_id: string;
  status: GenerationStatus;
  candidates: GenerationCandidate[];
}
