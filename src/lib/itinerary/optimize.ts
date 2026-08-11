/* ──────────────────────────────────────────────────────────────
   Route sequencing — given a full travel-time matrix, find the
   visiting order that minimizes total travel.

   Modelled as an OPEN-path TSP with the first stop fixed as the
   day's anchor (you start where the plan starts). Interiors + the
   final stop are free to reorder. Exact for small n (the planner
   targets 3–6 stops); nearest-neighbour fallback for larger sets.
   ────────────────────────────────────────────────────────────── */

/** Total travel time along an ordered path through the matrix. */
export function pathCost(order: number[], matrix: number[][]): number {
  let sum = 0;
  for (let i = 0; i < order.length - 1; i++) {
    sum += matrix[order[i]][order[i + 1]];
  }
  return sum;
}

/** Heap's algorithm — invoke `visit` with every permutation of `arr`. */
function permute(arr: number[], visit: (perm: number[]) => void) {
  const a = arr.slice();
  const n = a.length;
  const c = new Array(n).fill(0);
  visit(a.slice());
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      const j = i % 2 === 0 ? 0 : c[i];
      [a[i], a[j]] = [a[j], a[i]];
      visit(a.slice());
      c[i] += 1;
      i = 0;
    } else {
      c[i] = 0;
      i += 1;
    }
  }
}

/** Greedy nearest-neighbour path from index 0 (used when n is large). */
function nearestNeighbour(matrix: number[][]): number[] {
  const n = matrix.length;
  const visited = new Set<number>([0]);
  const order = [0];
  let current = 0;
  while (order.length < n) {
    let best = -1;
    let bestCost = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      if (matrix[current][j] < bestCost) {
        bestCost = matrix[current][j];
        best = j;
      }
    }
    if (best === -1) break;
    visited.add(best);
    order.push(best);
    current = best;
  }
  return order;
}

/**
 * Best open-path visiting order, with index 0 pinned as the start.
 *
 * When `isValid` is supplied, only orders that satisfy it (e.g. every venue
 * open at its arrival time, and each stop kept in its intended time-of-day
 * slot) are considered. Returns the minimum-travel valid order with
 * `valid: true`; if nothing satisfies the constraint, returns the identity
 * (planner's own) order with `valid: false` so the caller can preserve intent.
 */
export function bestOrder(
  matrix: number[][],
  isValid?: (order: number[]) => boolean
): { order: number[]; valid: boolean } {
  const n = matrix.length;
  const identity = Array.from({ length: n }, (_, i) => i);
  if (n <= 2) {
    return { order: identity, valid: isValid ? isValid(identity) : true };
  }

  const rest = Array.from({ length: n - 1 }, (_, i) => i + 1);

  // Exact brute force while (n-1)! stays cheap (8! = 40320).
  if (n <= 9) {
    let best: number[] | null = null;
    let bestCost = Infinity;
    permute(rest, (perm) => {
      const order = [0, ...perm];
      if (isValid && !isValid(order)) return;
      const cost = pathCost(order, matrix);
      if (cost < bestCost) {
        bestCost = cost;
        best = order;
      }
    });
    if (best) return { order: best, valid: true };
    return { order: identity, valid: false };
  }

  // Larger sets: nearest-neighbour, only if it satisfies the constraint.
  const nn = nearestNeighbour(matrix);
  if (!isValid || isValid(nn)) return { order: nn, valid: true };
  return { order: identity, valid: false };
}
