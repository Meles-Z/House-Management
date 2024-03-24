const qr = require('qrcode');
const fs = require('fs');
const { PNG } = require('pngjs');
const coding=require('./coding');
const { default: Code } = require('./coding');
const gf256 = require('./gf256');
const seedrandom = require('seedrandom');
const { createCanvas, loadImage } = require('canvas');
const { promisify } = require('util');

class Image {
    constructor() {
      this.File = null;
      this.Img48 = null;
      this.Target = null;
      this.Dx = 0;
      this.Dy = 0;
      this.URL = '';
      this.Version = 0;
      this.Mask = 0;
      this.Scale = 0;
      this.Rotation = 0;
      this.Size = 0;
      this.Rand = false;
      this.Dither = false;
      this.OnlyDataBits = false;
      this.SaveControl = false;
      this.Control = null;
      this.coding=Code;
    }
    setFile(data) {
        this.File = data;
        this.Img48 = null;
        this.Target = null;
      }
    
      small() {
        return 8 * (17 + 4 * this.Version) < 512;
      }
    
      clamp() {
        if (this.Version > 8) {
          this.Version = 8;
        }
        if (this.Scale == 0) {
          this.Scale = 8;
        }
        if (this.Version >= 12 && this.Scale >= 4) {
          this.Scale /= 2;
        }
      }
    
      async src() {
        if (this.Img48 == null) {
          const img = await this.decode(this.File, 48);
          this.Img48 = this.pngEncode(img);
        }
        return this.Img48;
      }

      target(x, y) {
        let tx = x + this.Dx;
        let ty = y + this.Dy;

        if (ty < 0 || ty >= this.Target.length || tx < 0 || tx >= this.Target[ty].length) {
            return [255, -1];
        }

        let v0 = this.Target[ty][tx];
        if (v0 < 0) {
            return [255, -1];
        }

        let targ = v0;
        let n = 0;
        let sum = 0;
        let sumsq = 0;
        const del = 5;
        for (let dy = -del; dy <= del; dy++) {
            for (let dx = -del; dx <= del; dx++) {
                if (0 <= ty + dy && ty + dy < this.Target.length && 0 <= tx + dx && tx + dx < this.Target[ty + dy].length) {
                    let v = this.Target[ty + dy][tx + dx];
                    sum += v;
                    sumsq += v * v;
                    n++;
                }
            }
        }

        let avg = sum / n;
        let contrast = sumsq / n - avg * avg;
        return [targ, contrast];
    }


      
}

class Pixinfo {
  constructor(x, y, pix, targ, dTarg, contrast, hardZero, block, bit) {
      this.X = x;
      this.Y = y;
      this.Pix = pix;
      this.Targ = targ;
      this.DTarg = dTarg;
      this.Contrast = contrast;
      this.HardZero = hardZero;
      this.Block = BitBlock;
      this.Bit = bit;
  } 
}

class Pixorder {
  constructor(off, priority) {
      this.Off = off;
      this.Priority = priority;
  }
}

class byPriority {
  constructor(carry) {
      this.carry = carry;
  }

  Len(x) {
      return x.length;
  }

  Swap(x, i, j) {
      [x[i], x[j]] = [x[j], x[i]];
  }

  Less(x, i, j) {
      return x[i].Priority > x[j].Priority;
  }
}

//lets test it for latter
function rotate(plan, rot) {
  if (rot === 0) {
      return;
  }

  let N = plan.Pixel.length;
  let pix = new Array(N).fill(null).map(() => new Array(N));

  switch (rot) {
      case 1:
          for (let y = 0; y < N; y++) {
              for (let x = 0; x < N; x++) {
                  pix[y][x] = plan.Pixel[x][N - 1 - y];
              }
          }
          break;
      case 2:
          for (let y = 0; y < N; y++) {
              for (let x = 0; x < N; x++) {
                  pix[y][x] = plan.Pixel[N - 1 - y][N - 1 - x];
              }
          }
          break;
      case 3:
          for (let y = 0; y < N; y++) {
              for (let x = 0; x < N; x++) {
                  pix[y][x] = plan.Pixel[N - 1 - x][y];
              }
          }
          break;
      default:
          break;
  }

  plan.Pixel = pix;
}

async function encode() {
  this.clamp();

  const dt = 17 + 4 * this.Version + this.Size;
  if (this.Target.length !== dt) {
      const t = await makeTarg(this.File, dt);
      this.Target = t;
  }

  const p = new coding.Plan(new coding.Version(this.Version), new coding.Level('L'), new coding.Mask(this.Mask));

  this.rotate(p, this.Rotation);

  const rand = seedrandom(new Date().getTime().toString());

  let nd = p.DataBytes / p.Blocks;
  let nc = p.CheckBytes / p.Blocks;
  const extra = p.DataBytes - nd * p.Blocks;
  const rs = new gf256.RSEncoder(coding.Field, nc);

  const pixByOff = new Array((p.DataBytes + p.CheckBytes) * 8);
  const expect = [];
  for (let y = 0; y < p.Pixel.length; y++) {
      expect[y] = new Array(p.Pixel[y].length);
      for (let x = 0; x < p.Pixel[y].length; x++) {
          const pix = p.Pixel[y][x];
          const [targ, contrast] = this.target(x, y);
          if (this.Rand && contrast >= 0) {
              contrast = rand.int32() % 128 + 64 * ((x + y) % 2) + 64 * (((x + y) % 3) % 2);
          }
          expect[y][x] = pix & coding.Pixel.Black !== 0;
          if (pix.Role() === coding.PixelRole.Data || pix.Role() === coding.PixelRole.Check) {
              pixByOff[pix.Offset()] = new Pixinfo(x, y, pix, targ, contrast);
          }
      }
  }

  let url = this.URL + '#';
  const b = new coding.Bits();
  new coding.StringEncoding(url).Encode(b, p.Version);
  new coding.Num('').Encode(b, p.Version);
  const bbit = b.Bits();
  const dbit = p.DataBytes * 8 - bbit;
  if (dbit < 0) {
      throw new Error('Cannot encode URL into available bits');
  }
  const num = Buffer.alloc(dbit / 10 * 3);
  for (let i = 0; i < num.length; i++) {
      num[i] = '0'.charCodeAt(0);
  }
  b.Pad(dbit);
  b.Reset();
  new coding.StringEncoding(url).Encode(b, p.Version);
  new coding.Num(num.toString()).Encode(b, p.Version);
  b.AddCheckBytes(p.Version, p.Level);
  const data = Buffer.from(b.Bytes());

  let doff = 0;
  let coff = 0;
  const mbit = bbit + dbit / 10 * 10;

  const bitblocks = [];
  for (let blocknum = 0; blocknum < p.Blocks; blocknum++) {
      if (blocknum === p.Blocks - extra) {
          nd++;
      }

      const bdata = data.slice(doff / 8, doff / 8 + nd);
      const cdata = data.slice(p.DataBytes + coff / 8, p.DataBytes + coff / 8 + nc);
      const bb = new BitBlock(nd, nc, rs, bdata, cdata);
      bitblocks.push(bb);

      let lo = 0,
          hi = nd * 8;
      if (lo < bbit - doff) {
          lo = bbit - doff;
          if (lo > hi) {
              lo = hi;
          }
      }
      if (hi > mbit - doff) {
          hi = mbit - doff;
          if (hi < lo) {
              hi = lo;
          }
      }

      for (let i = 0; i < lo; i++) {
          if (!bb.canSet(i, (bdata[Math.floor(i / 8)] >> (7 - i % 8)) & 1)) {
              throw new Error('Cannot preserve required bits');
          }
      }
      for (let i = hi; i < nd * 8; i++) {
          if (!bb.canSet(i, (bdata[Math.floor(i / 8)] >> (7 - i % 8)) & 1)) {
              throw new Error('Cannot preserve required bits');
          }
      }

      const order = [];
      for (let i = lo; i < hi; i++) {
          order.push(new Pixorder(doff + i));
      }
      for (let i = 0; i < nc * 8; i++) {
          order.push(new Pixorder(p.DataBytes * 8 + coff + i));
      }
      if (this.OnlyDataBits) {
          order.splice(hi - lo, order.length - hi + lo);
      }
      for (let i = 0; i < order.length; i++) {
          const po = order[i];
          const pinfo = pixByOff[po.Off];
          po.Priority = (pinfo.Contrast << 8) | rand.int(256);
      }
      order.sort((a, b) => b.Priority - a.Priority);

      const mark = false;
      for (let i = 0; i < order.length; i++) {
          const po = order[i];
          const pinfo = pixByOff[po.Off];
          let bval = pinfo.Targ < 128 ? 1 : 0;
          const pix = pinfo.Pix;
          if (pix & coding.Pixel.Invert) {
              bval ^= 1;
          }
          if (pinfo.HardZero) {
              bval = 0;
          }

          let bi = 0;
          if (pix.Role() === coding.PixelRole.Data) {
              bi = po.Off - doff;
          } else {
              bi = po.Off - p.DataBytes * 8 - coff + nd * 8;
          }
          if (bb.canSet(bi, bval)) {
              pinfo.Block = bb;
              pinfo.Bit = bi;
              if (mark) {
                  p.Pixel[pinfo.Y][pinfo.X] = coding.Pixel.Black;
              }
          } else {
              if (pinfo.HardZero) {
                  throw new Error('Hard zero');
              }
              if (mark) {
                  p.Pixel[pinfo.Y][pinfo.X] = 0;
              }
          }
      }
      bb.copyOut();

      const cheat = false;
for (let i = 0; i < nd * 8; i++) {
    const pinfo = pixByOff[doff + i];
    const pix = p.Pixel[pinfo.Y][pinfo.X];
    if ((bb.B[Math.floor(i / 8)] & (1 << (7 - (i % 8)))) !== 0) {
        pix ^= coding.Black;
    }
    expect[pinfo.Y][pinfo.X] = (pix & coding.Black) !== 0;
    if (cheat) {
        p.Pixel[pinfo.Y][pinfo.X] = pix & coding.Black;
    }
}
for (let i = 0; i < nc * 8; i++) {
    const pinfo = pixByOff[p.DataBytes * 8 + coff + i];
    const pix = p.Pixel[pinfo.Y][pinfo.X];
    if ((bb.B[nd + Math.floor(i / 8)] & (1 << (7 - (i % 8)))) !== 0) {
        pix ^= coding.Black;
    }
    expect[pinfo.Y][pinfo.X] = (pix & coding.Black) !== 0;
    if (cheat) {
        p.Pixel[pinfo.Y][pinfo.X] = pix & coding.Black;
    }
}
doff += nd * 8;
coff += nc * 8;

// Pass over all pixels again, dithering.
if (m.Dither) {
    for (let i = 0; i < pixByOff.length; i++) {
        const pinfo = pixByOff[i];
        pinfo.DTarg = parseInt(pinfo.Targ);
    }
    for (let y = 0; y < p.Pixel.length; y++) {
        const row = p.Pixel[y];
        for (let x = 0; x < row.length; x++) {
            const pix = row[x];
            if (pix.Role() !== coding.Data && pix.Role() !== coding.Check) {
                continue;
            }
            const pinfo = pixByOff[pix.Offset()];
            if (pinfo.Block === null) {
                // did not choose this pixel
                continue;
            }

            let pval = 1; // pixel value (black)
            let v = 0;    // gray value (black)
            const targ = pinfo.DTarg;
            if (targ >= 128) {
                // want white
                pval = 0;
                v = 255;
            }

            let bval = pval; // bit value
            if ((pix & coding.Invert) !== 0) {
                bval ^= 1;
            }
            if (pinfo.HardZero && bval !== 0) {
                bval ^= 1;
                pval ^= 1;
                v ^= 255;
            }

            // Set pixel value as we want it.
            pinfo.Block.reset(pinfo.Bit, bval);

            let err = targ - v;
            if (x + 1 < row.length) {
                addDither(pixByOff, row[x + 1], err * 7 / 16);
            }
            if (false && y + 1 < p.Pixel.length) {
                if (x > 0) {
                    addDither(pixByOff, p.Pixel[y + 1][x - 1], err * 3 / 16);
                }
                addDither(pixByOff, p.Pixel[y + 1][x], err * 5 / 16);
                if (x + 1 < row.length) {
                    addDither(pixByOff, p.Pixel[y + 1][x + 1], err * 1 / 16);
                }
            }
        }
    }
}

let noops = 0;
let attempt=0
  for (let i = 0; i < Math.floor(dbit / 10); i++) {
      // Pull out 10 bits.
      let v = 0;
      for (let j = 0; j < 10; j++) {
          const bi = bbit + 10 * i + j;
          v <<= 1;
          v |= (data[Math.floor(bi / 8)] >> (7 - bi % 8)) & 1;
      }
      // Turn into 3 digits.
      if (v >= 1000) {
          const pinfo = pixByOff[bbit + 10 * i + 3]; // TODO random
          pinfo.Contrast = 1e9 >> 8;
          pinfo.HardZero = true;
          noops++;
      }
      num.writeUInt8(v / 100, i * 3);
      num.writeUInt8((v / 10) % 10, i * 3 + 1);
      num.writeUInt8(v % 10, i * 3 + 2);
  }
  while (attempt < maxAttempts) {

    if (noops > 0) {
        noops = 0;
        attempt++;
    } else {
        break;
    }
}
if (attempt === maxAttempts) {
  console.error("Maximum attempts reached without successful encoding");
} else {
  return encodedData;
}
  
  const b1 = new coding.Bits();
  new coding.StringEncoding(url).Encode(b1, p.Version);
  new coding.Num(num.toString()).Encode(b1, p.Version);
  b1.AddCheckBytes(p.Version, p.Level);
  if (!Buffer.compare(b.Bytes(), b1.Bytes())) {
      console.log("Mismatch");
      throw new Error('Byte mismatch');
  }
  
  const cc = await p.Encode(new coding.StringEncoding(url), new coding.Num(num.toString()));
  
  if (!this.Dither) {
      for (let y = 0; y < expect.length; y++) {
          for (let x = 0; x < expect[y].length; x++) {
              if (cc.Black(x, y) !== expect[y][x]) {
                  console.log("Mismatch", x, y, p.Pixel[y][x].String());
              }
          }
      }
  }
  
  this.Code = new qr.Code({
      Bitmap: cc.Bitmap,
      Size: cc.Size,
      Stride: cc.Stride,
      Scale: this.Scale
  });
  
  if (this.SaveControl) {
      this.Control = pngEncode(makeImage(0, cc.Size, 4, this.Scale, (x, y) => {
          const pix = p.Pixel[y][x];
          if (pix.Role() === coding.PixelRole.Data || pix.Role() === coding.PixelRole.Check) {
              const pinfo = pixByOff[pix.Offset()];
              if (pinfo.Block !== null) {
                  return cc.Black(x, y) ? 0x000000ff : 0xffffffff;
              }
          }
          return cc.Black(x, y) ? 0x3f3f3fff : 0xbfbfbfff;
      }));
      return this.Control;
  }
  
  return this.Code.PNG();
  }
}

//lets working
function addDither(pixByOff, pix, err) {
  if (pix.Role !== 'Data' && pix.Role !== 'Check') {
      return;
  }
  let pinfo = pixByOff[pix.Offset];
  console.log("add", pinfo.X, pinfo.Y, pinfo.DTarg, err);
  pinfo.DTarg += err;
}
 
class BitBlock {
  constructor(dataBytes, checkBytes, b, m, tmp, rs) {
      this.DataBytes = dataBytes;
      this.CheckBytes = checkBytes;
      this.B = b; // byte array
      this.M = m; // 2D byte array
      this.Tmp = tmp; // byte array
      this.RS = gf256.RSEncoder; // Assuming this is a reference to an RSEncoder object
      this.bdata = []; // byte array
      this.cdata = []; // byte array
  }
  check() {
    this.RS.ECC(this.B.slice(0, this.DataBytes), this.Tmp);
    if (!Buffer.from(this.B.subarray(this.DataBytes)).equals(Buffer.from(this.Tmp))) {
        console.log(`ecc mismatch\n${Buffer.from(this.B.subarray(this.DataBytes)).toString('hex')}\n${Buffer.from(this.Tmp).toString('hex')}`);
        throw new Error("mismatch");
    }
}

reset(bi, bval) {
    if (((this.B[Math.floor(bi / 8)] >> (7 - bi % 8)) & 1) === bval) {
        // already has desired bit
        return;
    }
    // rows that have already been set
    const m = this.M.slice(this.M.length, this.M.capacity);
    for (const row of m) {
        if ((row[Math.floor(bi / 8)] & (1 << (7 - bi % 8))) !== 0) {
            // Found it.
            for (let j = 0; j < row.length; j++) {
                this.B[j] ^= row[j];
            }
            return;
        }
    }
    throw new Error("reset of unset bit");
}


canSet(bi, bval) {
  let found = false;
  const m = this.M;
  for (let j = 0; j < m.length; j++) {
      const row = m[j];
      if ((row[Math.floor(bi / 8)] & (1 << (7 - bi % 8))) === 0) {
          continue;
      }
      if (!found) {
          found = true;
          if (j !== 0) {
              [m[0], m[j]] = [m[j], m[0]];
          }
          continue;
      }
      for (let k = 0; k < row.length; k++) {
          row[k] ^= m[0][k];
      }
  }
  if (!found) {
      return false;
  }

  const targ = m[0];

  // Subtract from saved-away rows too.
  for (const row of m.slice(m.length, m.capacity)) {
      if ((row[Math.floor(bi / 8)] & (1 << (7 - bi % 8))) === 0) {
          continue;
      }
      for (let k = 0; k < row.length; k++) {
          row[k] ^= targ[k];
      }
  }

  // Found a row with bit #bi == 1 and cut that bit from all the others.
  // Apply to data and remove from m.
  if (((this.B[Math.floor(bi / 8)] >> (7 - bi % 8)) & 1) !== bval) {
      for (let j = 0; j < targ.length; j++) {
          this.B[j] ^= targ[j];
      }
  }
  this.check();
  const n = m.length - 1;
  [m[0], m[n]] = [m[n], m[0]];
  this.M = m.slice(0, n);

  for (const row of this.M) {
      if ((row[Math.floor(bi / 8)] & (1 << (7 - bi % 8))) !== 0) {
          throw new Error("did not reduce");
      }
  }

  return true;
}

copyOut() {
  this.check();
  this.bdata.set(this.B.subarray(0, this.DataBytes));
  this.cdata.set(this.B.subarray(this.DataBytes));
}
}
// lets try to here before
async function decode(data, max) {
  const image = await loadImage(data);
  const canvas = createCanvas(max, max);
  const ctx = canvas.getContext('2d');
  const b = { minX: 0, minY: 0, maxX: image.width, maxY: image.height };

  let dx = max,
      dy = max;

  if (b.maxX > b.maxY) {
      dy = Math.floor((b.maxY * dx) / b.maxX);
  } else {
      dx = Math.floor((b.maxX * dy) / b.maxY);
  }

  canvas.width = dx;
  canvas.height = dy;

  ctx.drawImage(image, 0, 0, b.maxX, b.maxY, 0, 0, dx, dy);

  return ctx.getImageData(0, 0, dx, dy);
}
// Function to decode image data
async function decode(data, max) {
  const img = await loadImage(data);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

// Function to make target matrix from image data
async function makeTarg(data, max) {
  const imgData = await decode(data, max);
  const { width: dx, height: dy, data: pixels } = imgData;
  const targ = [];
  for (let y = 0; y < dy; y++) {
      const row = [];
      for (let x = 0; x < dx; x++) {
          const idx = (y * dx + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const a = pixels[idx + 3];
          if (a === 0) {
              row.push(-1);
          } else {
              row.push(Math.round((299 * r + 587 * g + 114 * b + 500) / 1000));
          }
      }
      targ.push(row);
  }
  return targ;
}

// Function to encode image data as PNG
async function pngEncode(c) {
  const canvas = createCanvas(c.width, c.height);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(c, 0, 0);
  const buffer = canvas.toBuffer('image/png');
  return buffer;
}

// Function to create RGBA image from function
function makeImage(pt, size, border, scale, f) {
  const canvas = createCanvas((size + 2 * border) * scale, (size + 2 * border) * scale);
  const ctx = canvas.getContext('2d');

  // Fill with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
          const rgba = f(x, y);
          ctx.fillStyle = `rgba(${(rgba >> 24) & 0xFF},${(rgba >> 16) & 0xFF},${(rgba >> 8) & 0xFF},${rgba & 0xFF})`;
          ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
      }
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
