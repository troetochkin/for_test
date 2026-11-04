// Small, dependency-free mesh and matrix helpers. Coordinates are in scene units.
export const TAU = Math.PI * 2;
export function identity() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
  return out;
}
export function translation(x, y, z) { const m = identity(); m[12] = x; m[13] = y; m[14] = z; return m; }
export function scaling(x, y = x, z = x) { const m = identity(); m[0] = x; m[5] = y; m[10] = z; return m; }
export function rotationX(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); }
export function rotationY(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); }
export function rotationZ(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); }
export function perspective(fov, aspect, near = .1, far = 100) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
}
export const compose = (...matrices) => matrices.reduce(multiply, identity());
export function transformPoint(matrix, [x, y, z]) {
  const w = matrix[3]*x + matrix[7]*y + matrix[11]*z + matrix[15];
  return [(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12])/w, (matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13])/w, (matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14])/w];
}
export function makeGrid(columns = 80, rows = 8) {
  const vertices = new Float32Array((columns + 1) * (rows + 1) * 8), indices = new Uint16Array(columns * rows * 6);
  let at = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const a = y * (columns + 1) + x, b = a + 1, c = a + columns + 1, d = c + 1;
    indices.set([a,b,c, b,d,c], at); at += 6;
  }
  return { columns, rows, vertices, indices };
}
export function updateGrid(grid, surface) {
  const e = .0005;
  let at = 0;
  for (let y = 0; y <= grid.rows; y++) for (let x = 0; x <= grid.columns; x++) {
    const u = x / grid.columns, v = y / grid.rows, p = surface(u, v);
    const a = surface(u + e, v), b = surface(u, v + e);
    const du = a.map((n, i) => n - p[i]), dv = b.map((n, i) => n - p[i]);
    const n = [du[1]*dv[2]-du[2]*dv[1], du[2]*dv[0]-du[0]*dv[2], du[0]*dv[1]-du[1]*dv[0]];
    const length = Math.hypot(...n) || 1;
    grid.vertices.set([p[0],p[1],p[2],n[0]/length,n[1]/length,n[2]/length,u,v], at); at += 8;
  }
  return grid;
}
export function surfaceFor(type, index, count, time, clip) {
  const phase = time / clip.duration * TAU * clip.turns / 100 * clip.motion / 100;
  const bend = clip.curvature / 100, spacing = clip.spread / 100;
  if (type === 'type-rings') {
    const y = ((count - 1) / 2 - index) * (2.25 / Math.max(5, count - 1)) * spacing;
    const radius = Math.sqrt(Math.max(.12, 1 - (y / 1.65) ** 2)) * 1.53;
    return (u, v) => {
      const angle = u * TAU + phase * (index % 2 ? -1 : 1) + index * .65;
      const r = radius + Math.sin(angle * 3 + phase) * .055 * bend;
      return [Math.sin(angle)*r, y + (v-.5)*.4 + Math.sin(angle*2+phase)*.055*bend, Math.cos(angle)*r];
    };
  }
  if (type === 'liquid-sphere' || type === 'core') {
    return (u, v) => {
      const latitude = ((type === 'core' ? v : 1 - (index + 1 - v) / count) - .5) * Math.PI;
      const longitude = u * TAU + phase * .5 + latitude * Math.sin(phase) * bend * .5;
      const r = (type === 'core' ? 1.415 : 1.43) * (1 + (Math.sin(longitude*3+phase)*Math.cos(latitude*3) + Math.sin(latitude*5-phase)*.5) * .035 * bend);
      return [Math.cos(latitude)*Math.sin(longitude)*r, Math.sin(latitude)*r, Math.cos(latitude)*Math.cos(longitude)*r];
    };
  }
  if (type === 'type-tunnel') {
    return (u, v) => {
      const gy = 1 - (index + 1 - v) / count, yy = (gy-.5)*4.7;
      const waist = .35 + .72 * (Math.abs(yy) / 2.35) ** 1.6;
      return [(u-.5)*4.9*waist*spacing, yy, Math.cos((u-.5)*Math.PI)*(.25+.15*bend) - yy*yy*.15*bend + Math.sin(gy*TAU+phase)*.09*bend];
    };
  }
  if (type === 'helix') {
    return (u, v) => {
      const a = (index + u) / count * TAU * 2.25 + phase;
      const y = 1.5 - (index + u) / count * 3 + (v-.5)*.33;
      const r = 1.15 + Math.sin(a*.6-phase)*.1*bend;
      return [Math.sin(a)*r*spacing, y, Math.cos(a)*r];
    };
  }
  // A continuous tessellated textile, split into editable strips without UV gaps.
  return (u, v) => {
    const gy = 1 - (index + 1 - v) / count;
    const x = (u-.5)*3.4*spacing, y = (gy-.5)*3.3;
    const z = Math.sin(u*TAU*1.25+phase)*.18*bend + Math.sin(gy*TAU-phase)*.24*bend;
    return [x,y,z];
  };
}
