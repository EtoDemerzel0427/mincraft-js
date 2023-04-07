import Rand from "../lib/rand-seed/Rand.js"

// linear interpolation
function lerp(lo: number, hi: number, t: number): number {
    return lo * (1 - t) + hi * t;
}

class ValueNoise {
    private center_x: number;
    private center_y: number;
    private rng: Rand;
    private readonly patch_size: number;
    private readonly chunk_size: number;

    private patch_values: Float32Array;

    constructor(center_x: number, center_y: number, patch_size: number, chunk_size: number) {
        this.center_x = center_x;
        this.center_y = center_y;
        const seed = center_x + "&" + center_y;
        this.rng = new Rand(seed);
        this.patch_size = patch_size;
        this.chunk_size = chunk_size;

        this.patch_values = new Float32Array(patch_size * patch_size);
        for (let i = 0; i < patch_size * patch_size; i++) {
            this.patch_values[i] = 30 * this.rng.next();
        }
    }

    public eval(x: number, y: number): number {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = Math.min(x0 + 1, this.patch_size - 1);
        const y1 = Math.min(y0 + 1, this.patch_size - 1);

        const tx = x - x0;
        const ty = y - y0;

        const v00 = this.patch_values[y0 * this.patch_size + x0];
        const v01 = this.patch_values[y0 * this.patch_size + x1];
        const v10 = this.patch_values[y1 * this.patch_size + x0];
        const v11 = this.patch_values[y1 * this.patch_size + x1];

        const v0 = lerp(v00, v01, tx);
        const v1 = lerp(v10, v11, tx);

        return lerp(v0, v1, ty);
    }

    public generateHeightMap(): Float32Array {
        let height_map = new Float32Array(this.chunk_size * this.chunk_size);
        let frequency = 1.0 / 64.0;
        const frequency_multiplier = 2.0;
        const amplitude_multiplier = 0.5;
        const num_octaves = 4;
        for (let j = 0; j < this.chunk_size; j++) {
            for (let i = 0; i < this.chunk_size; i++) {
                let x = i * frequency;
                let y = j * frequency;
                let amplitude = 1.0;
                let height = 0.0;
                for (let k = 0; k < num_octaves; k++) {
                    height += this.eval(x, y) * amplitude;
                    x *= frequency_multiplier;
                    y *= frequency_multiplier;
                    amplitude *= amplitude_multiplier;
                }
                height_map[j * this.chunk_size + i] = Math.min(Math.floor(height), 100);
            }
        }

        return height_map;

    }
}

export default ValueNoise;