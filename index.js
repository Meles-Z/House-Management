/*const qr = require('qrcode');
const fs = require('fs');
const { PNG } = require('pngjs');
const coding=require('./coding')

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
    coding=this.Code;
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

  async decode(data, max) {
    const img = await new Promise((resolve, reject) => {
      const buf = new Buffer.from(data);
      const bmp = new PNG().parse(buf, (err, img) => {
if (err) {
          return reject(err);
        }
        resolve(img);
      });
    });
    const b = img.bounds;
    const dx = Math.min(max, b.width);
    const dy = Math.min(max, b.height);
    let irgba;
    switch (img.constructor.name) {
      case 'RGBA':
        irgba = new PNG({
          width: dx,
          height: dy,
          filterType: -1
        });
        for (let y = 0; y < dy; y++) {
          for (let x = 0; x < dx; x++) {
            const r = img.data[y * b.width + x * 4];
            const g = img.data[y * b.width + x * 4 + 1];
            const b = img.data[y * b.width + x * 4 + 2];
            const a = img.data[y * b.width + x * 4 + 3];
            if (a === 0) {
              irgba.data[y * dx + x * 4] = 255;
              irgba.data[y * dx + x * 4 + 1] = 0;
              irgba.data[y * dx + x * 4 + 2] = 0;
              irgba.data[y * dx + x * 4 + 3] = 0;
            } else {
              irgba.data[y * dx + x * 4] = r;
              irgba.data[y * dx + x * 4 + 1] = g;
              irgba.data[y * dx + x * 4 + 2] = b;
              irgba.data[y * dx + x * 4 + 3] = a;
            }
          }
        }
        break;
      default:
        irgba = new PNG({
          width: dx,
          height: dy,
          filterType: -1
        });
        for (let y = 0; y < dy; y++){
          for (let x = 0; x < dx; x++) {
            const r = img.data[y * b.width + x * 4];
            const g = img.data[y * b.width + x * 4 + 1];
            const b = img.data[y * b.width + x * 4 + 2];
            const a = img.data[y * b.width + x * 4 + 3];
            if (a === 0) {
              irgba.data[y * dx + x * 4] = 255;
              irgba.data[y * dx + x * 4 + 1] = 0;
              irgba.data[y * dx + x * 4 + 2] = 0;
              irgba.data[y * dx + x * 4 + 3] = 0;
            } else {
              irgba.data[y * dx + x * 4] = r;
              irgba.data[y * dx + x * 4 + 1] = g;
              irgba.data[y * dx + x * 4 + 2] = b;
              irgba.data[y * dx + x * 4 + 3] = a;
            }
          }
        }
        break;
    }
    return irgba;
  }

  pngEncode(c) {
    const chunks = [];
    chunks.push({
      name: 'IHDR',
      data: Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        Buffer.from([0x00, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x0D, 0x08, 0x06, 0x00, 0x00, 0x00])
       ])
});
    chunks.push({
      name: 'PLTE',
      data: Buffer.from([0x00, 0xFF, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    });
    chunks.push({
      name: 'IDAT',
      data: this.pngDeflate(c.data)
    });
    chunks.push({
      name: 'IEND',
      data: Buffer.from([0x00, 0x00, 0x00, 0x00])
    });
    return Buffer.concat(chunks.map(chunk => (chunk.data)));
  }

  pngDeflate(data) {
    const deflate = zlib.deflateRawSync(data);
    const head = Buffer.from([
      0x78, 0x9c, 0x01, 0x12, 0x00, 0x04, 0xe0, 0x32, 0x41, 0xc0, 0x47, 0x7f, 0xb5,
      0x12, 0x00, 0x00, 0x00, 0x00, 0x03
    ]);
    const chunk = Buffer.concat([head, deflate]);
    const zlen = chunk.length;
    const crc = crc32.signed(chunk.slice(0, -4));
    const body = Buffer.concat([
      chunk.slice(0, zlen - 4),
      Buffer.from([0xff, 0xff])
    ]);
    const tail = Buffer.from([
      (crc >> 24) & 0xff,
      (crc >> 16) & 0xff,
      (crc >> 8) & 0xff,
      crc & 0xff,
(zlen >> 24) & 0xff,
      (zlen >> 16) & 0xff,
      (zlen >> 8) & 0xff,
      zlen & 0xff
    ]);
    return Buffer.concat([body, tail]);
  }

  async target() {
    if (this.Target === null) {
      const targ = await this.makeTarg(this.File, 17 + 4 * this.Version);
      this.Target = targ;
    }
    return this.Target;
  }

  async makeTarg(data, max) {
    const img = await this.src();
    const buf = new Buffer.from(img);
    const png = new PNG().parse(buf, (err, img) => {
      if (err) {
        throw err;
      }
      const b = img.bounds;
      const dx = Math.min(max, b.width);
      const dy = Math.min(max, b.height);
      const arr = new Array(dx * dy);
      const targ = new Array(dy);
      for (let y = 0; y < dy; y++) {
        targ[y] = arr.slice(dx * y, dx * (y + 1));
      }
      for (let y = 0; y < dy; y++) {
        for (let x = 0; x < dx; x++) {
          const r = img.data[y * b.width + x * 4 + 0];
          const g = img.data[y * b.width + x * 4 + 1];
          const b = img.data[y * b.width + x * 4 + 2];
          const a = img.data[y * b.width + x * 4 + 3
          ];
          if (a === 0) {
            targ[y][x] = -1;
          } else {
            targ[y][x] = Math.round((299 * r + 587 * g + 114 * b) / 1000);
}
        }
      }
      return targ;
    });
  }

  async encode() {
    this.clamp();
    const targ = await this.target();
    const qrCode = qr.encode(this.URL + '#', {
      type: 'byte',
      data: targ,
      mode: 8,
      maskPattern: this.Mask,
      version: this.Version
    });

    for (let y = 0; y < qrCode.modules.length; y++) {
      for (let x = 0; x < qrCode.modules[0].length; x++) {
        const idx = y * qrCode.modules[0].length + x;
        const targ = targ[y][x];
        if (targ < 0) {
          qrCode.modules[y][x] = 2;
        } else {
          qrCode.modules[y][x] = qrCode.modules[y][x] === 0 ? targ * 4 + 2 : 255 - (targ * 4 + 1);
        }
      }
    }

    this.Code = qrCode;

    if (this.SaveControl) {
      const img = this.makeImage(0, qrCode.modules.length, 4, this.Scale, (x, y) => {
        return qrCode.modules[y][x] > 0 ? 0xffffffff : 0x00000000;
      });
      this.pngControl(img);
    }

    return qrCode.toDataURL('image/png');
  }

  pngControl(c) {
    const chunks = [];
    chunks.push({
      name: 'IHDR',
      data: Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        Buffer.from([0x00, 0x00,0x00, 0x38, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
       ])
});
    chunks.push({
      name: 'PLTE',
      data: Buffer.from([0x00, 0xFF, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    });
    chunks.push({
      name: 'IDAT',
      data: this.pngDeflate(c.data)
    });
    chunks.push({
      name: 'IEND',
      data: Buffer.from([0x00, 0x00, 0x00, 0x00])
    });
    fs.writeFileSync('control.png', Buffer.concat(chunks.map(chunk => (chunk.data))));
  }
}

  function makeImage(pt, size, border, scale, f) {
    const d = (size + 2 * border) * scale;
    const c = Buffer.alloc(d * d * 4);
  
    // white
    for (let i = 0; i < c.length; i += 4) {
      c[i] = 255;
      c[i + 1] = 255;
      c[i + 2] = 255;
      c[i + 3] = 255;
    }
  
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const rgba = f(x, y);
        const offset = ((x + border) * scale + (y + border) * d * scale) * 4;
        c[offset] = (rgba >> 24) & 0xff;
        c[offset + 1] = (rgba >> 16) & 0xff;
        c[offset + 2] = (rgba >> 8) & 0xff;
        c[offset + 3] = rgba & 0xff;
      }
    }
  
    return sharp(c, { raw: { width: d, height: d, channels: 4 } })
      .png()
      .toBuffer();
  }

  */

const fs = require('fs');
const PNG = require('pngjs').PNG;
const coding=require('./coding')

class Image {
    constructor() {
        this.File = null;
        this.Img48 = null;
        this.Target = [];
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
        this.Code = coding;
    }

    SetFile(data) {
        this.File = data;
        this.Img48 = null;
        this.Target = [];
    }

    Small() {
        return 8 * (17 + 4 * this.Version) < 512;
    }

    Clamp() {
        if (this.Version > 8) {
            this.Version = 8;
        }
        if (this.Scale === 0) {
            this.Scale = 8;
        }
        if (this.Version >= 12 && this.Scale >= 4) {
            this.Scale /= 2;
        }
    }

    async Src() {
        if (!this.Img48) {
            const i = await decode(this.File, 48);
            this.Img48 = pngEncode(i);
        }
        return this.Img48;
    }
}

class Pixinfo {
    constructor(x, y, pix, targ, contrast, hardZero, block, bit) {
        this.X = x;
        this.Y = y;
        this.Pix = pix;
        this.Targ = targ;
        this.Contrast = contrast;
        this.HardZero = hardZero;
        this.Block = block;
        this.Bit = bit;
    }
}

class Pixorder {
    constructor(off, priority) {
        this.Off = off;
        this.Priority = priority;
    }
}

class BitBlock {
    constructor(nd, nc, rs, dat, cdata) {
        this.DataBytes = nd;
        this.CheckBytes = nc;
        this.B = Buffer.alloc(nd + nc);
        this.M = new Array(nd * 8).fill(null).map(() => Buffer.alloc(nd + nc));
        this.Tmp = Buffer.alloc(nc);
        this.RS = rs;
        this.bdata = dat;
        this.cdata = cdata;
    }

    check() {
        this.RS.ECC(this.B.slice(0, this.DataBytes), this.Tmp);
        if (!this.B.slice(this.DataBytes).equals(this.Tmp)) {
            console.log("ECC mismatch");
            throw new Error("ECC mismatch");
        }
    }

    reset(bi, bval) {
        const byteIndex = Math.floor(bi / 8);
        const bitIndex = 7 - (bi % 8);
        if (((this.B[byteIndex] >> bitIndex) & 1) === bval) {
            return;
        }
        let found = false;
        for (let j = 0; j < this.M.length; j++) {
            const row = this.M[j];
            if ((row[byteIndex] & (1 << bitIndex)) !== 0) {
                if (!found) {
                    found = true;
                    if (j !== 0) {
                        [this.M[0], this.M[j]] = [this.M[j], this.M[0]];
                    }
                    continue;
                }
                for (let k = 0; k < row.length; k++) {
                    row[k] ^= this.M[0][k];
                }
            }
        }
        if (!found) {
            return false;
        }

        const targ = this.M[0];
        if (((this.B[byteIndex] >> bitIndex) & 1) !== bval) {
            for (let j = 0; j < targ.length; j++) {
                this.B[j] ^= targ[j];
            }
        }
        this.check();
        const n = this.M.length - 1;
        [this.M[0], this.M[n]] = [this.M[n], this.M[0]];
        this.M.pop();
        for (const row of this.M) {
            if ((row[byteIndex] & (1 << bitIndex)) !== 0) {
                throw new Error("Did not reduce");
            }
        }
        return true;
    }

    canSet(bi, bval) {
        let found = false;
        for (let j = 0; j < this.M.length; j++) {
            const row = this.M[j];
            const byteIndex = Math.floor(bi / 8);
            const bitIndex = 7 - (bi % 8);
            if ((row[byteIndex] & (1 << bitIndex)) === 0) {
                continue;
            }
            if (!found) {
                found = true;
                if (j !== 0) {
                    [this.M[0], this.M[j]] = [this.M[j], this.M[0]];
                }
                continue;
            }
            for (let k = 0; k < row.length; k++) {
                row[k] ^= this.M[0][k];
            }
        }
        if (!found) {
            return false;
        }

        const targ = this.M[0];
        const byteIndex = Math.floor(bi / 8);
        const bitIndex = 7 - (bi % 8);
        if (((this.B[byteIndex] >> bitIndex) & 1) !== bval) {
            for (let j = 0; j < targ.length; j++) {
                this.B[j] ^= targ[j];
            }
        }
        this.check();
        const n = this.M.length - 1;
        [this.M[0], this.M[n]] = [this.M[n], this.M[0]];
        this.M.pop();
        for (const row of this.M) {
            if ((row[byteIndex] & (1 << bitIndex)) !== 0) {
                throw new Error("Did not reduce");
            }
        }
        return true;
    }

    copyOut() {
        this.check();
        this.bdata.set(this.B.slice(0, this.DataBytes));
        this.cdata.set(this.B.slice(this.DataBytes));
    }
}

async function decode(data, max) {
  const img = await Jimp.read(data);
  const resized = img.cover(max, max);
  const buffer = await resized.getBufferAsync(Jimp.MIME_PNG);
  const rgba = await Jimp.read(buffer);
  return rgba.bitmap.data;
}

async function makeTarget(data, max) {
  const img = await Jimp.read(data);
  const resized = img.cover(max, max);
  const { width, height } = resized.bitmap;
  const targ = [];
  for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
          const { r, g, b, a } = Jimp.intToRGBA(resized.getPixelColor(x, y));
          if (a === 0) {
              row.push(-1);
          } else {
              row.push(Math.floor((299 * r + 587 * g + 114 * b + 500) / 1000));
          }
      }
      targ.push(row);
  }
  return targ;
}

function pngEncode(c) {
  return PNG.sync.write(c);
}

makeImage(pt, size, border, scale, f) {
  const d = (size + 2 * border) * scale;
  const c = Buffer.alloc(d * d * 4);

  // white
  for (let i = 0; i < c.length; i += 4) {
      c[i] = 255;
      c[i + 1] = 255;
      c[i + 2] = 255;
      c[i + 3] = 255;
  }

  for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
          const rgba = f(x, y);
          const offset = ((x + border) * scale + (y + border) * d * scale) * 4;
          c[offset] = (rgba >> 24) & 0xff;
          c[offset + 1] = (rgba >> 16) & 0xff;
          c[offset + 2] = (rgba >> 8) & 0xff;
          c[offset + 3] = rgba & 0xff;
      }
  }

  return sharp(c, { raw: { width: d, height: d, channels: 4 } })
      .png()
      .toBuffer();
}


async function main() {
  const image = new Image();
  const fileData = fs.readFileSync('your_image.png'); // provide your image path
  image.SetFile(fileData);

  try {
      image.Clamp();
      const src = await image.Src();
      console.log(src); // Assuming you want to log the source data
      // Perform other operations with the image object as needed
  } catch (error) {
      console.error(error);
  }
}

main();
