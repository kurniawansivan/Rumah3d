import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { GenerationFloor } from "@rumah3d/schemas";

import { PlanSvg } from "./PlanSvg";

afterEach(() => {
  cleanup();
});

const fixtureFloor: GenerationFloor = {
  level: 1,
  height_m: 3.5,
  rooms: [
    {
      id: "room-1",
      type: "ruang_tamu",
      polygon: [
        [0, 0],
        [4, 0],
        [4, 3],
        [0, 3],
      ],
      area_m2: 12,
    },
    {
      id: "room-2",
      type: "kamar_tidur_utama",
      polygon: [
        [4, 0],
        [8, 0],
        [8, 4],
        [4, 4],
      ],
      area_m2: 16,
    },
    {
      id: "room-3",
      type: "kamar_mandi",
      polygon: [
        [0, 3],
        [3, 3],
        [3, 5],
        [0, 5],
      ],
      area_m2: 6,
    },
  ],
  walls: [
    {
      id: "wall-1",
      polyline: [
        [0, 0],
        [8, 0],
      ],
      thickness_m: 0.15,
      is_exterior: true,
      height_m: 3.5,
    },
    {
      id: "wall-2",
      polyline: [
        [4, 0],
        [4, 4],
      ],
      thickness_m: 0.1,
      is_exterior: false,
      height_m: 3.5,
    },
  ],
  openings: [],
};

describe("PlanSvg", () => {
  it("renders one <polygon> per room", () => {
    const { container } = render(<PlanSvg floor={fixtureFloor} />);

    const polygons = container.querySelectorAll("polygon");

    expect(polygons.length).toBe(fixtureFloor.rooms.length);
  });

  it("renders a room-type text label for each room", () => {
    const { container } = render(<PlanSvg floor={fixtureFloor} />);

    const labels = container.querySelectorAll("text");

    expect(labels.length).toBe(fixtureFloor.rooms.length);
  });

  it("renders one <path> per wall", () => {
    const { container } = render(<PlanSvg floor={fixtureFloor} />);

    const paths = container.querySelectorAll("path");

    expect(paths.length).toBe(fixtureFloor.walls.length);
  });
});
