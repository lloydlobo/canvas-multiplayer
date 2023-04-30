import { Point } from "./lib/types/canvas";

/**
 * An object containing the values to interpolate.
 * @property {number} a - The starting value.
 * @property {number} b - The ending value.
 * @property {number} t - The interpolation factor, usually between 0 and 1.
 */
export type Lerp = {
  a: number;
  b: number;
  t: number;
};

/**
 * Linearly interpolate between two values.
 * @param {Lerp["a"]} a - The starting value.
 * @param {Lerp["b"]} b - The ending value.
 * @param {Lerp["t"]} t - The interpolation factor, usually between 0 and 1.
 * @returns {number} The interpolated value.
 *
 * Use linear interpolation (`lerp`) to create a smooth line as the mouse move
 * over the canvas. We interpolate between the previous mouse position and the
 * current mouse position.
 */
export function lerp(a: Lerp["a"], b: Lerp["b"], t: Lerp["t"]) {
  if (t > 1) {
    t = 1;
  } else if (t < 0) {
    t = 0;
  }

  return a + (b - a) * t;
}

export type LerpIncrementalPathProps = {
  currentPoint: Point;
  prevPoint: Point;
  /**
   * @param incrementSize The number of points to interpolate between two
   * points. Adjust the increment size here to make the line smoother or
   * rougher.
   */
  incrementSize?: number;
};

/**
 * `lerpIncrementalPath` is a utility function that calculates the number of
 * points to interpolate between two points.
 *
 * First calculate the distance between prev and curr mouse positons.
 * Then divide the distance by desire increment size to get the number of points we
 * want to interpolate between the two positions.
 *
 * @param incrementSize: The number of points to interpolate between two points.
 * Adjust the increment size here to make the line smoother or rougher.
 * @default 5
 *
 * @example With a `for` loop
 * ```ts
 * ctx.beginPath();
 * ctx.moveTo(...prevPoint); // OR ctx.moveTo(...path[0]);
 * for (let i = 1; i < path.length; i++ ){
 *   const t = i / numPoints;
 *   const x = lerp(prevPoint.x, currentPoint.x, t);
 *   const y = lerp(prevPoint.y, currentPoint.y, t);
 *   ctx.lineTo(x, y);
 * }
 * ctx.stroke();
 * ```
 * NOTE: Move ctx.moveTo(x, y) before the for loop, to get a single line when
 * stroke is called.
 */
export function lerpIncrementalPath({
  currentPoint,
  prevPoint,
  incrementSize = 5,
}: LerpIncrementalPathProps) {
  const distance = Math.sqrt(
    (currentPoint.x - prevPoint.x) ** 2 + (currentPoint.y - prevPoint.y) ** 2
  );

  const numPoints = Math.ceil(distance / incrementSize);

  return {
    /** @description The distance between the two points. */
    distance,
    /** @description The number of points to interpolate between two points. */
    numPoints,
  };
}
