
function nbit(p) {
    let n = 0;
    while (p > 0) {
        p >>= 1;
        n++;
    }
    return n;
}

function polyDiv(p, q) {
    let np = nbit(p);
    let nq = nbit(q);
    while (np >= nq) {
        if ((p & (1 << (np - 1))) !== 0) {
            p ^= q << (np - nq);
        }
        np--;
    }
    return p;
}

function mul(x, y, poly) {
    let z = 0;
    while (x > 0) {
        if ((x & 1) !== 0) {
            z ^= y;
        }
        x >>= 1;
        y <<= 1;
        if ((y & 0x100) !== 0) {
            y ^= poly;
        }
    }
    return z;
}

function reducible(p) {
    let np = nbit(p);
    for (let q = 2; q < (1 << (np / 2 + 1)); q++) {
        if (polyDiv(p, q) === 0) {
            return true;
        }
    }
    return false;
}

class Field {
    constructor(poly, α) {
        if (poly < 0x100 || poly >= 0x200 || reducible(poly)) {
            throw new Error("gf256: invalid polynomial: " + poly);
        }

        this.log = new Array(256).fill(0);
        this.exp = new Array(510).fill(0);

        let x = 1;
        for (let i = 0; i < 255; i++) {
            if (x === 1 && i !== 0) {
                throw new Error("gf256: invalid generator " + α + " for polynomial " + poly);
            }
            this.exp[i] = x;
            this.exp[i + 255] = x;
            this.log[x] = i;
            x = mul(x, α, poly);
        }
        this.log[0] = 255;

        for (let i = 0; i < 255; i++) {
            if (this.log[this.exp[i]] !== i || this.log[this.exp[i + 255]] !== i) {
                throw new Error("bad log");
            }
        }
        for (let i = 1; i < 256; i++) {
            if (this.exp[this.log[i]] !== i) {
                throw new Error("bad log");
            }
        }
    }

    Add(x, y) {
        return x ^ y;
    }

    Exp(e) {
        if (e < 0) {
            return 0;
        }
        return this.exp[e % 255];
    }

    Log(x) {
        if (x === 0) {
            return -1;
        }
        return this.log[x];
    }

    Inv(x) {
        if (x === 0) {
            return 0;
        }
        return this.exp[255 - this.log[x]];
    }

    Mul(x, y) {
        if (x === 0 || y === 0) {
            return 0;
        }
        return this.exp[this.log[x] + this.log[y]];
    }
}

function gen(f, e) {
    let p = new Array(e + 1).fill(0);
    p[e] = 1;

    for (let i = 0; i < e; i++) {
        let c = f.Exp(i);
        for (let j = 0; j < e; j++) {
            p[j] = f.Mul(p[j], c) ^ p[j + 1];
        }
        p[e] = f.Mul(p[e], c);
    }

    let lp = new Array(e + 1).fill(0);
    for (let i = 0; i < p.length; i++) {
        if (p[i] === 0) {
            lp[i] = 255;
        } else {
            lp[i] = f.Log(p[i]);
        }
    }

    return [p, lp];
}

class RSEncoder {
    constructor(f, c) {
        this.f = f;
        this.c = c;
        const [gen, lgen] = gen(f, c);
        this.gen = gen;
        this.lgen = lgen;
        this.p = [];
    }

    ECC(data, check) {
        if (check.length < this.c) {
            throw new Error("gf256: invalid check byte length");
        }
        if (this.c === 0) {
            return;
        }

        let p = [...data, ...Array(this.c).fill(0)];

        let f = this.f;
        let lgen = this.lgen.slice(1);
        for (let i = 0; i < data.length; i++) {
            let c = p[i];
            if (c === 0) {
                continue;
            }
            let q = p.slice(i + 1);
            let exp = f.exp[f.log[c]];
            for (let j = 0; j < lgen.length; j++) {
                if (lgen[j] !== 255) {
                    q[j] ^= exp[lgen[j]];
                }
            }
        }
        for (let i = 0; i < check.length; i++) {
            check[i] = p[data.length + i];
        }
        this.p = p;
    }
}

module.exports = { Field, RSEncoder };
