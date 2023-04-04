import Rand from "../lib/rand-seed/Rand.js"

function lerp(lo: number, hi: number, t: number): number {
    return lo * (1 - t) + hi * t;
}

function smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
}

class ValueNoise {
    private rng: Rand;
    private size: number;
    private values: Float32Array;
    private sizeMask: number;

    constructor(seed: string, size: number) {
        this.rng = new Rand(seed);
        this.size = size;
        this.values = new Float32Array(size * size);
        let base = this.rng.next();
        for (let i = 0; i < size * size; i++) {
            this.values[i] = base + this.rng.next() / 2;
            console.log(this.values[i])
        }
        this.sizeMask = size - 1;
    }

    public eval(x: number, y: number): number {
        const xi = Math.floor(x);
        const yi = Math.floor(y);

        const tx = x - xi;
        const ty = y - yi;

        const  rx0 = xi & this.sizeMask;
        const  ry0 = yi & this.sizeMask;
        const  rx1 = (rx0 + 1) & this.sizeMask;
        const  ry1 = (ry0 + 1) & this.sizeMask;

        const  v00 = this.values[ry0 * this.size + rx0];
        const  v01 = this.values[ry0 * this.size + rx1];
        const  v10 = this.values[ry1 * this.size + rx0];
        const  v11 = this.values[ry1 * this.size + rx1];

        // const  sx = smoothstep(tx);
        // const  sy = smoothstep(ty);

        const  a = lerp(v00, v01, tx);
        const  b = lerp(v10, v11, tx);

        return lerp(a, b, ty);
    }
}

export default ValueNoise;