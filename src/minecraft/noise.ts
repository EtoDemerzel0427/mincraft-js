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
    private chunkSize: number;
    private values: Float32Array;
    private baseMap: Float32Array;
    private sizeMask: number;

    constructor(seed: string, size: number, chunkSize: number) {
        this.rng = new Rand(seed);
        this.size = size;
        this.chunkSize = chunkSize;
        this.values = new Float32Array(size * size);
        this.baseMap = new Float32Array(chunkSize * chunkSize);
        let base = Math.floor(100.0 * this.rng.next());
        for (let i = 0; i < size * size; i++) {
            this.values[i] = base + Math.floor(100.0 * this.rng.next()) % 20;
            this.values[i] = Math.max(Math.min(Math.floor(this.values[i]), 100), 1.0);
        }
        this.sizeMask = size - 1;

        this.generateBaseMap();
    }

    public eval(x: number, y: number): number {
        // const xi = Math.floor(x);
        // const yi = Math.floor(y);
        //
        // const tx = x - xi;
        // const ty = y - yi;
        //
        // const  rx0 = xi & this.sizeMask;
        // const  ry0 = yi & this.sizeMask;
        // const  rx1 = (rx0 + 1) & this.sizeMask;
        // const  ry1 = (ry0 + 1) & this.sizeMask;
        //
        // const  v00 = this.values[ry0 * this.size + rx0];
        // const  v01 = this.values[ry0 * this.size + rx1];
        // const  v10 = this.values[ry1 * this.size + rx0];
        // const  v11 = this.values[ry1 * this.size + rx1];
        //
        // const  a = lerp(v00, v01, tx);
        // const  b = lerp(v10, v11, tx);
        //
        // return lerp(a, b, ty);
        let x0 = Math.floor(x);
        let y0 = Math.floor(y);
        let x1 = Math.min(x0 + 1, this.size - 1);
        let y1 = Math.min(y0 + 1, this.size - 1);
        let x_frac = x - x0;
        let y_frac = y - y0;
        let x_frac_1 = 1 - x_frac;
        let y_frac_1 = 1 - y_frac;

        let h00 = this.values[y0 * this.size + x0];
        let h01 = this.values[y1 * this.size + x0];
        let h10 = this.values[y0 * this.size + x1];
        let h11 = this.values[y1 * this.size + x1];

        // let h0 = h00 * x_frac_1 + h10 * x_frac;
        // let h1 = h01 * x_frac_1 + h11 * x_frac;
        // heightMap[j * this.size + i] = h0 * y_frac_1 + h1 * y_frac;
        let h0 = lerp(h00, h10, x_frac);
        let h1 = lerp(h01, h11, x_frac);
        return lerp(h0, h1, y_frac);
    }

    public generateBaseMap() {
        const factor = this.size / this.chunkSize;
        for (let j = 0; j < this.chunkSize; j++) {
            for (let i = 0; i < this.chunkSize; i++) {
                const x = i * factor;
                const y = j * factor;
                this.baseMap[j * this.chunkSize + i] = this.eval(x, y);
            }
        }
    }

    public getHeights(): Float32Array {
        let heights = new Float32Array(this.chunkSize * this.chunkSize);
        for (let i = 0; i < this.chunkSize; i++) {
            for (let j = 0; j < this.chunkSize; j++) {
                // heights[j * this.chunkSize + i] = Math.floor(
                //     (1 / 8.0 * this.baseMap[i * this.chunkSize + j]
                //         + 1 / 4.0 * this.baseMap[Math.floor(i / 2) * this.chunkSize + Math.floor(j / 2)]
                //         + 1 / 2.0 * this.baseMap[Math.floor(i / 4) * this.chunkSize + Math.floor(j / 4)]
                //         + this.baseMap[Math.floor(i / 8) * this.chunkSize + Math.floor(j / 8)])
                // );
                heights[i * this.chunkSize + j] = Math.floor(
                    1 / 2.0 * (1 / 8.0 * this.baseMap[i * this.chunkSize + j] +
                        1 / 4.0 * this.baseMap[Math.floor(i/2) * this.chunkSize + Math.floor(j/2)] +
                        1 / 2.0 * this.baseMap[Math.floor(i/4) * this.chunkSize + Math.floor(j/4)] +
                        this.baseMap[Math.floor(i/8) * this.chunkSize + Math.floor(j/8)])
                );
            }
        }
        return heights;
    }
}

export default ValueNoise;