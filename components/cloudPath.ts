// A scalloped, manga-style cloud outline filling a w x h box.
const f = (v: number) => Math.round(v * 10) / 10;

export function cloudPath(w: number, h: number): string {
  const cx = w / 2, cy = h / 2, rx = w / 2 - 14, ry = h / 2 - 14, n = 16;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const r = Math.hypot(x1 - x0, y1 - y0) * 0.62;
    d += ` A ${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(y1)}`;
  }
  return `${d} Z`;
}
