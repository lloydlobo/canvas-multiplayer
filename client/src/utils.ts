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
