
const gf256 = require('./gf256');

// Field is the field for QR error correction.
const Field = new gf256.Field(0x11d, 2);

class Version {
    constructor(v) {
        this.v = v;
    }

    toString() {
        return this.v.toString();
    }

    sizeClass() {
        if (this.v <= 9) {
            return 0;
        }
        if (this.v <= 26) {
            return 1;
        }
        return 2;
    }

    DataBytes(l) {
        const vt = vtab[this.v];
        const lev = vt.level[l];
        return vt.bytes - lev.nblock * lev.check;
    }
}

class Bits {
    constructor() {
        this.b = [];
        this.nbit = 0;
    }

    Reset() {
        this.b = [];
        this.nbit = 0;
    }

    Bits() {
        return this.nbit;
    }

    Bytes() {
        if (this.nbit % 8 !== 0) {
            throw new Error("fractional byte");
        }
        return this.b;
    }

    Append(p) {
        if (this.nbit % 8 !== 0) {
            throw new Error("fractional byte");
        }
        this.b.push(...p);
        this.nbit += 8 * p.length;
    }

    Write(v, nbit) {
        while (nbit > 0) {
            let n = nbit;
            if (n > 8) {
                n = 8;
            }
            if (this.nbit % 8 === 0) {
                this.b.push(0);
            } else {
                const m = -this.nbit & 7;
                if (n > m) {
                    n = m;
                }
            }
            this.nbit += n;
            const sh = nbit - n;
            this.b[this.b.length - 1] |= (v >> sh) << (-this.nbit & 7);
            v -= v >> sh << sh;
            nbit -= n;
        }
    }
}

class Num {
    constructor(s) {
        this.s = s;
    }

    String() {
        return `Num(${this.s})`;
    }

    Check() {
        for (const c of this.s) {
            if (c < '0' || c > '9') {
                throw new Error(`non-numeric string ${this.s}`);
            }
        }
    }

    Bits(v) {
        return 4 + numLen[v.sizeClass()] + (10 * this.s.length + 2) / 3;
    }

    Encode(b, v) {
        b.Write(1, 4);
        b.Write(this.s.length, numLen[v.sizeClass()]);
        let i = 0;
        for (; i + 3 <= this.s.length; i += 3) {
            const w = parseInt(this.s.substring(i, i + 3));
            b.Write(w, 10);
        }
        switch (this.s.length - i) {
            case 1:
                b.Write(parseInt(this.s[i]), 4);
                break;
            case 2:
                b.Write(parseInt(this.s[i] + this.s[i + 1]), 7);
                break;
        }
    }
}

class Alpha {
    constructor(s) {
        this.s = s;
    }

    String() {
        return `Alpha(${this.s})`;
    }

    Check() {
        for (const c of this.s) {
            if (alphabet.indexOf(c) === -1) {
                throw new Error(`non-alphanumeric string ${this.s}`);
            }
        }
    }

    Bits(v) {
        return 4 + alphaLen[v.sizeClass()] + (11 * this.s.length + 1) / 2;
    }

    Encode(b, v) {
        b.Write(2, 4);
        b.Write(this.s.length, alphaLen[v.sizeClass()]);
        let i = 0;
        for (; i + 2 <= this.s.length; i += 2) {
            const w = alphabet.indexOf(this.s[i]) * 45 + alphabet.indexOf(this.s[i + 1]);
            b.Write(w, 11);
        }
        if (i < this.s.length) {
            b.Write(alphabet.indexOf(this.s[i]), 6);
        }
    }
}

class StringEncoding {
    constructor(s) {
        this.s = s;
    }

    String() {
        return `String(${this.s})`;
    }

    Check() {
        // No validation needed for String encoding
    }

    Bits(v) {
        return 4 + stringLen[v.sizeClass()] + 8 * this.s.length;
    }

    Encode(b, v) {
        b.Write(4, 4);
        b.Write(this.s.length, stringLen[v.sizeClass()]);
        for (const ch of this.s) {
            b.Write(ch.charCodeAt(0), 8);
        }
    }
}

const Pixel = {
    Black: 1 << 0,
    Invert: 1 << 1
};

const roles = [
    "",
    "position",
    "alignment",
    "timing",
    "format",
    "pversion",
    "unused",
    "data",
    "check",
    "extra"
];

class PixelRole {
    constructor(r) {
        this.r = r;
    }

    String() {
        if (Position <= this.r && this.r <= Check) {
            return roles[this.r];
        }
        return this.r.toString();
    }
}

class Level {
    constructor(l) {
        this.l = l;
    }

    String() {
        if (L <= this.l && this.l <= H) {
            return "LMQH"[this.l];
        }
        return this.l.toString();
    }
}

class Code {
    constructor(bitmap, size, stride) {
        this.Bitmap = bitmap;
        this.Size = size;
        this.Stride = stride;
    }

    Black(x, y) {
        if (0 <= x && x < this.Size && 0 <= y && y < this.Size) {
            const byteIdx = y * this.Stride + (x >> 3);
            const bitIdx = 7 - (x & 7);
            return (this.Bitmap[byteIdx] & (1 << bitIdx)) !== 0;
        }
        return false;
    }    
}
        
class Mask {
            constructor(m) {
                this.m = m;
            }
        
            Invert(y, x) {
                if (this.m < 0) {
                    return false;
                }
                return mfunc[this.m](y, x);
            }
        }
        
        class Plan {
            constructor(version, level, mask) {
                this.Version = version;
                this.Level = level;
                this.Mask = mask;
            }
        
            Encode(text) {
                const b = new Bits();
                for (const t of text) {
                    t.Check();
                    t.Encode(b, this.Version);
                }
                if (b.Bits() > this.DataBytes * 8) {
                    throw new Error(`Cannot encode ${b.Bits()} bits into ${this.DataBytes * 8}-bit code`);
                }
                b.AddCheckBytes(this.Version, this.Level);
                const bytes = b.Bytes();
        
                // Construct the actual code.
                const c = {
                    Size: this.Pixel.length,
                    Stride: (this.Pixel.length + 7) & ~7,
                    Bitmap: []
                };
                for (let i = 0; i < this.Pixel.length; i++) {
                    for (let x = 0; x < this.Pixel[i].length; x++) {
                        const pix = this.Pixel[i][x];
                        switch (pix.Role()) {
                            case Data:
                            case Check:
                                const o = pix.Offset();
                                if (bytes[o >> 3] & (1 << (7 - (o & 7)))) {
                                    pix ^= Pixel.Black;
                                }
                                break;
                        }
                        const byteIdx = i * c.Stride + (x >> 3);
                        if (!c.Bitmap[byteIdx]) {
                            c.Bitmap[byteIdx] = 0;
                        }
                        if (pix & Pixel.Black) {
                            c.Bitmap[byteIdx] |= 1 << (7 - (x & 7));
                        }
                    }
                }
                return c;
            }
        }
        
        // Exporting the necessary functions and classes
        module.exports = {
            Field,
            Version,
            Encoding: {
                Num,
                Alpha,
                String: StringEncoding
            },
            Pixel,
            PixelRole,
            Level,
            Code,
            Mask,
            Plan
        };
        
