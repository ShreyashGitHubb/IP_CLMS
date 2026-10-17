// Compact, zero-dependency QR Code generator (ISO/IEC 18004 standard)
// Encodes alphanumeric & byte data with Error Correction Level M/L directly to vector SVG

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

// Polynomial arithmetic in Galois Field GF(256)
const GF256_EXP = new Uint8Array(512)
const GF256_LOG = new Uint8Array(256)

;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x
    GF256_EXP[i + 255] = x
    GF256_LOG[x] = i
    x <<= 1
    if (x >= 256) x ^= 0x11d
  }
})()

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]]
}

function polyMul(p1: number[], p2: number[]): number[] {
  const result = new Array<number>(p1.length + p2.length - 1).fill(0)
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j])
    }
  }
  return result
}

function getGeneratorPoly(degree: number): number[] {
  let g = [1]
  for (let i = 0; i < degree; i++) {
    g = polyMul(g, [1, GF256_EXP[i]])
  }
  return g
}

function calculateEcc(data: number[], eccLength: number): number[] {
  const gen = getGeneratorPoly(eccLength)
  const remainder = [...data, ...new Array<number>(eccLength).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const factor = remainder[i]
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        remainder[i + j] ^= gfMul(gen[j], factor)
      }
    }
  }
  return remainder.slice(data.length)
}

// Version capacities (Data codewords for Version 1..6, Level M)
// Version 1: 21x21, 16 data codewords
// Version 2: 25x25, 28 data codewords
// Version 3: 29x29, 44 data codewords
// Version 4: 33x33, 64 data codewords
// Version 5: 37x37, 86 data codewords
// Version 6: 41x41, 108 data codewords
const VERSION_SPECS = [
  { version: 1, size: 21, dataCodewords: 16, eccCodewords: 10, alignment: [] as number[] },
  { version: 2, size: 25, dataCodewords: 28, eccCodewords: 16, alignment: [6, 18] },
  { version: 3, size: 29, dataCodewords: 44, eccCodewords: 26, alignment: [6, 22] },
  { version: 4, size: 33, dataCodewords: 64, eccCodewords: 36, alignment: [6, 26] },
  { version: 5, size: 37, dataCodewords: 86, eccCodewords: 48, alignment: [6, 30] },
  { version: 6, size: 41, dataCodewords: 108, eccCodewords: 64, alignment: [6, 34] },
]

export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes = new TextEncoder().encode(text)
  const spec = VERSION_SPECS.find((s) => s.dataCodewords >= utf8Bytes.length + 3) ?? VERSION_SPECS[VERSION_SPECS.length - 1]
  const size = spec.size

  // Byte mode encoding (Mode 0100)
  const bitBuffer: number[] = []
  const pushBits = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) {
      bitBuffer.push((value >> i) & 1)
    }
  }

  pushBits(0b0100, 4) // Byte mode
  pushBits(utf8Bytes.length, spec.version < 10 ? 8 : 16)
  for (const byte of utf8Bytes) {
    pushBits(byte, 8)
  }

  // Terminator
  const maxBits = spec.dataCodewords * 8
  const terminatorLength = Math.min(4, maxBits - bitBuffer.length)
  pushBits(0, terminatorLength)

  // Align to byte
  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0)
  }

  // Pad bytes
  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (bitBuffer.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8)
    padIdx++
  }

  // Convert bit buffer to data codewords
  const dataCodewords: number[] = []
  for (let i = 0; i < bitBuffer.length; i += 8) {
    let byteVal = 0
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitBuffer[i + b]
    }
    dataCodewords.push(byteVal)
  }

  // Error correction
  const eccCodewords = calculateEcc(dataCodewords, spec.eccCodewords)
  const allCodewords = [...dataCodewords, ...eccCodewords]

  // Initialize matrix
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const isReserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))

  const setModule = (r: number, c: number, val: boolean, reserved = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val
      if (reserved) isReserved[r][c] = true
    }
  }

  // 1. Finder patterns (7x7 with 1-module separator)
  const drawFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r
        const col = left + c
        if (row < 0 || row >= size || col < 0 || col >= size) continue
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
          setModule(row, col, isBorder || isInner)
        } else {
          setModule(row, col, false)
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0
    if (!isReserved[6][i]) setModule(6, i, val)
    if (!isReserved[i][6]) setModule(i, 6, val)
  }

  // 3. Alignment patterns
  if (spec.alignment.length > 0) {
    const coords = spec.alignment
    for (const r of coords) {
      for (const c of coords) {
        if (isReserved[r][c]) continue
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2
            const isCenter = dr === 0 && dc === 0
            setModule(r + dr, c + dc, isBorder || isCenter)
          }
        }
      }
    }
  }

  // 4. Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = true
    if (!isReserved[i][8]) isReserved[i][8] = true
  }
  for (let i = 0; i < 8; i++) {
    if (!isReserved[size - 1 - i][8]) isReserved[size - 1 - i][8] = true
    if (!isReserved[8][size - 1 - i]) isReserved[8][size - 1 - i] = true
  }
  setModule(size - 8, 8, true) // Dark module

  // 5. Place data bits (Mask 0: (row + col) % 2 === 0)
  const fullBits: number[] = []
  for (const cw of allCodewords) {
    for (let b = 7; b >= 0; b--) {
      fullBits.push((cw >> b) & 1)
    }
  }

  let bitIdx = 0
  let upward = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col-- // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (!isReserved[row][c]) {
          const bit = bitIdx < fullBits.length ? fullBits[bitIdx++] : 0
          // Apply mask 0: (row + c) % 2 === 0
          const mask = (row + c) % 2 === 0
          matrix[row][c] = (bit === 1) !== mask
        }
      }
    }
    upward = !upward
  }

  // 6. Write Format Info (Level M = 00, Mask 0 = 000 -> 00000, BCH masked with 0x5412 = 0x5412)
  // Format bit sequence for Level M + Mask 0: 101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0]
  // Horizontal format bits around top-left finder
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1
  matrix[8][7] = formatBits[6] === 1
  matrix[8][8] = formatBits[7] === 1
  matrix[7][8] = formatBits[8] === 1
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1

  // Second copy of format bits around top-right and bottom-left
  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = formatBits[i] === 1
  for (let i = 0; i < 8; i++) matrix[8][size - 8 + i] = formatBits[7 + i] === 1

  return matrix
}

export function generateQrSvg(text: string, options: { size?: number; margin?: number; color?: string; background?: string } = {}): string {
  const { size = 180, margin = 4, color = '#ffffff', background = '#00000000' } = options
  const matrix = generateQrMatrix(text)
  const moduleCount = matrix.length
  const totalCells = moduleCount + margin * 2
  const cellSize = size / totalCells

  let pathData = ''
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        const x = (c + margin) * cellSize
        const y = (r + margin) * cellSize
        pathData += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" style="display:block;max-width:100%;max-height:100%;" shape-rendering="crispEdges">
    ${background !== 'transparent' && background !== '#00000000' ? `<rect width="${size}" height="${size}" fill="${background}" />` : ''}
    <path d="${pathData}" fill="${color}" />
  </svg>`
}
