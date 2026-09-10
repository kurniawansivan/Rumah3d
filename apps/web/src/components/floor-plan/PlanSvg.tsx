import type { GenerationFloor, GenerationRoom } from "@rumah3d/schemas";

export interface PlanSvgProps {
  /** One floor from `GenerationResponse["candidates"][number]["floors"][number]`. */
  floor: GenerationFloor;
  className?: string;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const VIEWBOX_PADDING_M = 1;

function getRoomsBoundingBox(rooms: GenerationRoom[]): BoundingBox {
  const points = rooms.flatMap((room) => room.polygon);

  if (points.length === 0) {
    // No rooms to measure — fall back to a small, valid default box rather
    // than an Infinity/-Infinity viewBox.
    return { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  }

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/** Simple vertex-average centroid — exact for rectangular rooms, a good
 * enough approximation for irregular ones. This only positions a label, so
 * the more involved area-weighted polygon centroid isn't worth the extra
 * complexity here. */
function polygonCentroid(polygon: Array<[number, number]>): [number, number] {
  if (polygon.length === 0) {
    return [0, 0];
  }

  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of polygon) {
    sumX += x;
    sumY += y;
  }

  return [sumX / polygon.length, sumY / polygon.length];
}

function pointsToAttr(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function polylineToPathD(points: Array<[number, number]>): string {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}

function humanizeRoomType(type: string): string {
  return type.replaceAll("_", " ");
}

/**
 * Renders one generated floor as a schematic 2D floor plan (denah). Pure
 * presentational component: geometry in, SVG out — no data fetching, no
 * client-only state, so it works equally embedded in a client or a server
 * component. Coordinates are assumed to be meters in the generation
 * engine's local plan coordinate system (lot-relative, not geographic).
 */
export function PlanSvg({ floor, className }: PlanSvgProps) {
  const { minX, minY, maxX, maxY } = getRoomsBoundingBox(floor.rooms);

  const viewBoxX = minX - VIEWBOX_PADDING_M;
  const viewBoxY = minY - VIEWBOX_PADDING_M;
  const viewBoxWidth = maxX - minX + VIEWBOX_PADDING_M * 2;
  const viewBoxHeight = maxY - minY + VIEWBOX_PADDING_M * 2;

  return (
    <svg
      viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={`Denah lantai ${floor.level}`}
    >
      {floor.rooms.map((room) => {
        const [cx, cy] = polygonCentroid(room.polygon);
        return (
          <g key={room.id}>
            <polygon points={pointsToAttr(room.polygon)} fill="#e5e7eb" stroke="#4b5563" strokeWidth={0.05}>
              <title>
                {humanizeRoomType(room.type)} — {room.area_m2} m²
              </title>
            </polygon>
            <text
              x={cx}
              y={cy}
              fontSize={0.35}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#1f2937"
            >
              {humanizeRoomType(room.type)}
            </text>
          </g>
        );
      })}
      {floor.walls.map((wall) => (
        <path
          key={wall.id}
          d={polylineToPathD(wall.polyline)}
          fill="none"
          stroke={wall.is_exterior ? "#111827" : "#6b7280"}
          strokeWidth={wall.thickness_m}
          strokeLinecap="square"
        />
      ))}
    </svg>
  );
}
