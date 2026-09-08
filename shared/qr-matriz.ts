/**
 * Matriz QR (modo byte, ECC L) para mostrar PSBT pública no ecrã.
 * Sem Buffer, sem rede, sem seed. Capacidade até a versão 20 (~858 bytes).
 */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255]!;
})();

function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a]! + LOG[b]!]!;
}

type BlockPlan = {
  groups: Array<{ blocks: number; data: number; ec: number }>;
  totalData: number;
};

/** Versões 1–20, ECC L: grupos de blocos (n, k dados, ec). */
const PLANOS_L: BlockPlan[] = [
  { groups: [{ blocks: 1, data: 19, ec: 7 }], totalData: 19 },
  { groups: [{ blocks: 1, data: 34, ec: 10 }], totalData: 34 },
  { groups: [{ blocks: 1, data: 55, ec: 15 }], totalData: 55 },
  { groups: [{ blocks: 1, data: 80, ec: 20 }], totalData: 80 },
  { groups: [{ blocks: 1, data: 108, ec: 26 }], totalData: 108 },
  { groups: [{ blocks: 2, data: 68, ec: 18 }], totalData: 136 },
  { groups: [{ blocks: 2, data: 78, ec: 20 }], totalData: 156 },
  { groups: [{ blocks: 2, data: 97, ec: 24 }], totalData: 194 },
  { groups: [{ blocks: 2, data: 116, ec: 30 }], totalData: 232 },
  {
    groups: [
      { blocks: 2, data: 68, ec: 18 },
      { blocks: 2, data: 69, ec: 18 },
    ],
    totalData: 274,
  },
  { groups: [{ blocks: 4, data: 81, ec: 20 }], totalData: 324 },
  {
    groups: [
      { blocks: 2, data: 92, ec: 24 },
      { blocks: 2, data: 93, ec: 24 },
    ],
    totalData: 370,
  },
  { groups: [{ blocks: 4, data: 107, ec: 26 }], totalData: 428 },
  {
    groups: [
      { blocks: 3, data: 115, ec: 30 },
      { blocks: 1, data: 116, ec: 30 },
    ],
    totalData: 461,
  },
  {
    groups: [
      { blocks: 5, data: 87, ec: 22 },
      { blocks: 1, data: 88, ec: 22 },
    ],
    totalData: 523,
  },
  {
    groups: [
      { blocks: 5, data: 98, ec: 24 },
      { blocks: 1, data: 99, ec: 24 },
    ],
    totalData: 589,
  },
  {
    groups: [
      { blocks: 1, data: 107, ec: 28 },
      { blocks: 5, data: 108, ec: 28 },
    ],
    totalData: 647,
  },
  {
    groups: [
      { blocks: 5, data: 120, ec: 30 },
      { blocks: 1, data: 121, ec: 30 },
    ],
    totalData: 721,
  },
  {
    groups: [
      { blocks: 3, data: 113, ec: 28 },
      { blocks: 4, data: 114, ec: 28 },
    ],
    totalData: 795,
  },
  {
    groups: [
      { blocks: 3, data: 107, ec: 28 },
      { blocks: 5, data: 108, ec: 28 },
    ],
    totalData: 861,
  },
];

const ALINHAMENTO: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
];

function generatorPoly(degree: number): Uint8Array {
  const poly = new Uint8Array(degree);
  poly[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      poly[j] = mul(poly[j]!, root);
      if (j + 1 < degree) poly[j] = poly[j]! ^ poly[j + 1]!;
    }
    root = mul(root, 2);
  }
  return poly;
}

function reedSolomon(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = generatorPoly(ecCount);
  const rest = new Uint8Array(ecCount);
  for (const byte of data) {
    const factor = byte ^ rest[0]!;
    rest.copyWithin(0, 1);
    rest[ecCount - 1] = 0;
    if (factor === 0) continue;
    for (let i = 0; i < ecCount; i += 1) {
      rest[i] = rest[i]! ^ mul(gen[i]!, factor);
    }
  }
  return rest;
}

function pushBits(bits: number[], value: number, count: number): void {
  for (let i = count - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function escolherVersao(dataBytes: number): number {
  for (let version = 1; version <= PLANOS_L.length; version += 1) {
    const countBits = version <= 9 ? 8 : 16;
    const bitsNeeded = 4 + countBits + dataBytes * 8 + 4;
    const capacityBits = PLANOS_L[version - 1]!.totalData * 8;
    if (bitsNeeded <= capacityBits) return version;
  }
  throw new Error("PSBT grande demais para um QR. Copie o Base64.");
}

function bitsDeDados(bytes: Uint8Array, version: number, totalData: number): Uint8Array {
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) pushBits(bits, byte, 8);
  const capacity = totalData * 8;
  const terminator = Math.min(4, capacity - bits.length);
  pushBits(bits, 0, terminator);
  while (bits.length % 8 !== 0) bits.push(0);
  const pad = [0xec, 0x11];
  let padIndex = 0;
  while (bits.length < capacity) {
    pushBits(bits, pad[padIndex % 2]!, 8);
    padIndex += 1;
  }
  const out = new Uint8Array(totalData);
  for (let i = 0; i < totalData; i += 1) {
    let value = 0;
    for (let b = 0; b < 8; b += 1) value = (value << 1) | bits[i * 8 + b]!;
    out[i] = value;
  }
  return out;
}

function codewordsFinais(data: Uint8Array, plano: BlockPlan): Uint8Array {
  const blocos: { data: Uint8Array; ec: Uint8Array }[] = [];
  let offset = 0;
  for (const group of plano.groups) {
    for (let i = 0; i < group.blocks; i += 1) {
      const slice = data.slice(offset, offset + group.data);
      offset += group.data;
      blocos.push({ data: slice, ec: reedSolomon(slice, group.ec) });
    }
  }
  const maxData = Math.max(...blocos.map((bloco) => bloco.data.length));
  const maxEc = Math.max(...blocos.map((bloco) => bloco.ec.length));
  const out: number[] = [];
  for (let i = 0; i < maxData; i += 1) {
    for (const bloco of blocos) {
      if (i < bloco.data.length) out.push(bloco.data[i]!);
    }
  }
  for (let i = 0; i < maxEc; i += 1) {
    for (const bloco of blocos) {
      if (i < bloco.ec.length) out.push(bloco.ec[i]!);
    }
  }
  return Uint8Array.from(out);
}

function tamanho(version: number): number {
  return 21 + 4 * (version - 1);
}

function mascara(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function desenharEncontrador(grid: number[][], x: number, y: number): void {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (yy < 0 || xx < 0 || yy >= grid.length || xx >= grid.length) continue;
      const on =
        dx === -1 || dy === -1 || dx === 7 || dy === 7
          ? false
          : dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      grid[yy]![xx] = on ? 1 : 0;
    }
  }
}

function desenharAlinhamento(grid: number[][], cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const on = Math.max(Math.abs(dx), Math.abs(dy)) !== 1 || (dx === 0 && dy === 0);
      grid[cy + dy]![cx + dx] = on ? 1 : 0;
    }
  }
}

function reservarFuncoes(version: number): { grid: number[][]; reserved: boolean[][] } {
  const n = tamanho(version);
  const grid = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  const reserved = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));

  const marcar = (x: number, y: number) => {
    if (y >= 0 && x >= 0 && y < n && x < n) reserved[y]![x] = true;
  };

  desenharEncontrador(grid, 0, 0);
  desenharEncontrador(grid, n - 7, 0);
  desenharEncontrador(grid, 0, n - 7);
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      marcar(x, y);
      marcar(n - 8 + x, y);
      marcar(x, n - 8 + y);
    }
  }

  for (let i = 8; i < n - 8; i += 1) {
    grid[6]![i] = i % 2 === 0 ? 1 : 0;
    grid[i]![6] = i % 2 === 0 ? 1 : 0;
    marcar(i, 6);
    marcar(6, i);
  }

  const pos = ALINHAMENTO[version - 1]!;
  for (const cy of pos) {
    for (const cx of pos) {
      if ((cx <= 8 && cy <= 8) || (cx >= n - 9 && cy <= 8) || (cx <= 8 && cy >= n - 9)) continue;
      desenharAlinhamento(grid, cx, cy);
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) marcar(cx + dx, cy + dy);
      }
    }
  }

  for (let i = 0; i < 9; i += 1) {
    marcar(8, i);
    marcar(i, 8);
    marcar(n - 1 - i, 8);
    marcar(8, n - 1 - i);
  }
  marcar(8, 8);
  grid[n - 8]![8] = 1;
  marcar(8, n - 8);

  if (version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        marcar(n - 11 + j, i);
        marcar(i, n - 11 + j);
      }
    }
  }

  return { grid, reserved };
}

function colocarDados(grid: number[][], reserved: boolean[][], codewords: Uint8Array): void {
  const n = grid.length;
  const bits: number[] = [];
  for (const byte of codewords) {
    for (let i = 7; i >= 0; i -= 1) bits.push((byte >> i) & 1);
  }
  let bit = 0;
  let upward = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let i = 0; i < n; i += 1) {
      const y = upward ? n - 1 - i : i;
      for (const dx of [0, -1]) {
        const x = col + dx;
        if (reserved[y]![x]) continue;
        grid[y]![x] = bit < bits.length ? bits[bit]! : 0;
        bit += 1;
      }
    }
    upward = !upward;
  }
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (grid[y]![x] < 0 && !reserved[y]![x]) grid[y]![x] = 0;
    }
  }
}

function bch15(data: number): number {
  let d = data << 10;
  const gen = 0b10100110111;
  for (let i = 14; i >= 10; i -= 1) {
    if ((d >>> i) & 1) d ^= gen << (i - 10);
  }
  return ((data << 10) | d) ^ 0b101010000010010;
}

function bch18(data: number): number {
  let d = data << 12;
  const gen = 0b1111100100101;
  for (let i = 17; i >= 12; i -= 1) {
    if ((d >>> i) & 1) d ^= gen << (i - 12);
  }
  return (data << 12) | d;
}

function escreverFormato(grid: number[][], mask: number): void {
  const n = grid.length;
  const bits = bch15((0b01 << 3) | mask);
  const coords: Array<[number, number]> = [];
  for (let i = 0; i <= 5; i += 1) coords.push([i, 8]);
  coords.push([7, 8], [8, 8], [8, 7]);
  for (let i = 5; i >= 0; i -= 1) coords.push([8, i]);
  for (let i = 0; i < 15; i += 1) {
    const bit = (bits >> i) & 1;
    const [x, y] = coords[i]!;
    grid[y]![x] = bit;
    if (i < 8) grid[8]![n - 1 - i] = bit;
    else grid[n - 15 + i]![8] = bit;
  }
}

function escreverVersao(grid: number[][], version: number): void {
  if (version < 7) return;
  const n = grid.length;
  const bits = bch18(version);
  let k = 0;
  for (let i = 0; i < 6; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const bit = (bits >> k) & 1;
      grid[i]![n - 11 + j] = bit;
      grid[n - 11 + j]![i] = bit;
      k += 1;
    }
  }
}

function aplicarMascara(grid: number[][], reserved: boolean[][], mask: number): number[][] {
  const n = grid.length;
  const out = grid.map((row) => row.slice());
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (reserved[y]![x]) continue;
      if (mascara(mask, x, y)) out[y]![x] = out[y]![x] === 1 ? 0 : 1;
    }
  }
  return out;
}

function penalidade(grid: number[][]): number {
  const n = grid.length;
  let score = 0;
  for (let y = 0; y < n; y += 1) {
    let run = 1;
    for (let x = 1; x < n; x += 1) {
      if (grid[y]![x] === grid[y]![x - 1]) {
        run += 1;
      } else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    if (run >= 5) score += run - 2;
  }
  for (let x = 0; x < n; x += 1) {
    let run = 1;
    for (let y = 1; y < n; y += 1) {
      if (grid[y]![x] === grid[y - 1]![x]) {
        run += 1;
      } else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    if (run >= 5) score += run - 2;
  }
  for (let y = 0; y < n - 1; y += 1) {
    for (let x = 0; x < n - 1; x += 1) {
      const v = grid[y]![x];
      if (v === grid[y]![x + 1] && v === grid[y + 1]![x] && v === grid[y + 1]![x + 1]) score += 3;
    }
  }
  const finder = [1, 0, 1, 1, 1, 0, 1];
  const temPadrao = (seq: number[]) => {
    for (let i = 0; i <= seq.length - 7; i += 1) {
      let ok = true;
      for (let j = 0; j < 7; j += 1) {
        if (seq[i + j] !== finder[j]) {
          ok = false;
          break;
        }
      }
      if (ok) score += 40;
    }
  };
  for (let y = 0; y < n; y += 1) temPadrao(grid[y]!);
  for (let x = 0; x < n; x += 1) {
    const col = grid.map((row) => row[x]!);
    temPadrao(col);
  }
  let dark = 0;
  for (const row of grid) {
    for (const cell of row) if (cell === 1) dark += 1;
  }
  const percent = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

export function matrizQr(texto: string): boolean[][] {
  const bytes = new TextEncoder().encode(texto);
  const version = escolherVersao(bytes.length);
  const plano = PLANOS_L[version - 1]!;
  const data = bitsDeDados(bytes, version, plano.totalData);
  const codewords = codewordsFinais(data, plano);
  const { grid, reserved } = reservarFuncoes(version);
  colocarDados(grid, reserved, codewords);

  let melhor: number[][] | null = null;
  let melhorScore = Infinity;
  let melhorMask = 0;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidata = aplicarMascara(grid, reserved, mask);
    escreverFormato(candidata, mask);
    escreverVersao(candidata, version);
    const score = penalidade(candidata);
    if (score < melhorScore) {
      melhorScore = score;
      melhor = candidata;
      melhorMask = mask;
    }
  }
  void melhorMask;
  return melhor!.map((row) => row.map((cell) => cell === 1));
}
