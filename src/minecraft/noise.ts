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
    public patch_values: Float32Array;
    private padded_patch_values: Float32Array;
    static readonly HEIGHT_SCALE = 100;

    constructor(center_x: number, center_y: number, patch_size: number, chunk_size: number) {
        this.center_x = center_x;
        this.center_y = center_y;
        const seed = center_x + "&" + center_y;
        this.rng = new Rand(seed);
        this.patch_size = patch_size;
        this.chunk_size = chunk_size;

        this.patch_values = new Float32Array(patch_size * patch_size);
        for (let i = 0; i < patch_size * patch_size; i++) {
            this.patch_values[i] = ValueNoise.HEIGHT_SCALE * this.rng.next();
        }

        this.pad_patch();
    }

    // I have verified that this function is correct
    public pad_patch() {
        const padded_size = this.patch_size + 2;
        this.padded_patch_values = new Float32Array(padded_size * padded_size);

        // the center patch_size * patch_size is the same as the original patch
        // we can directly construct here but for now to avoid mistakes we copy
        // from patch_values
        for (let i = 0; i < this.patch_size; i++) {
            for (let j = 0; j < this.patch_size; j++) {
                this.padded_patch_values[(i + 1) * padded_size + j + 1] = this.patch_values[i * this.patch_size + j];
            }
        }

        // todo: optimally, consider cache these patches
        // the first row, i.e. from [0, 1] to [0, patch_size]
        let other_seed = this.center_x + "&" + (this.center_y - this.chunk_size);
        let other_rng = new Rand(other_seed);
        // it is the last row of the other patch, so we need to skip everything before that
        for (let i = 0; i < this.patch_size * (this.patch_size - 1); i++) {
            other_rng.next();
        }
        for (let i = 0; i < this.patch_size; i++) {
            this.padded_patch_values[i + 1] = ValueNoise.HEIGHT_SCALE * other_rng.next();
        }

        // the last row, i.e. from [patch_size + 1, 1] to [patch_size + 1, patch_size]
        other_seed = this.center_x + "&" + (this.center_y + this.chunk_size);
        other_rng = new Rand(other_seed);
        // it is the first row of the other patch, so it is just the first patch_size values
        for (let i = 0; i < this.patch_size; i++) {
            this.padded_patch_values[(padded_size - 1) * padded_size + i + 1] = ValueNoise.HEIGHT_SCALE * other_rng.next();
        }

        // the first column, i.e. from [1, 0] to [patch_size, 0]
        other_seed = (this.center_x - this.chunk_size) + "&" + this.center_y;
        other_rng = new Rand(other_seed);
        // it is the last column of the other patch, it will appear every patch_size
        for (let i = 0; i < this.patch_size; i++) {
            for (let j = 0; j < this.patch_size - 1; j++) {
                other_rng.next();
            }
            this.padded_patch_values[(i + 1) * padded_size] = ValueNoise.HEIGHT_SCALE * other_rng.next();
        }

        // the last column, i.e. from [1, patch_size + 1] to [patch_size, patch_size + 1]
        other_seed = (this.center_x + this.chunk_size) + "&" + this.center_y;
        other_rng = new Rand(other_seed);
        // it is the first column of the other patch, it will appear every patch_size
        for (let i = 0; i < this.patch_size; i++) {
            this.padded_patch_values[(i + 1) * padded_size + padded_size - 1] = ValueNoise.HEIGHT_SCALE * other_rng.next();
            for (let j = 0; j < this.patch_size - 1; j++) {
                other_rng.next();
            }
        }

        // the four corners
        other_seed = (this.center_x - this.chunk_size) + "&" + (this.center_y - this.chunk_size);
        other_rng = new Rand(other_seed);
        // it is the last element of the other patch, so we need to skip everything before that
        for (let i = 0; i < this.patch_size * this.patch_size - 1; i++) {
            other_rng.next();
        }
        this.padded_patch_values[0] = ValueNoise.HEIGHT_SCALE* other_rng.next();

        other_seed = (this.center_x - this.chunk_size) + "&" + (this.center_y + this.chunk_size);
        other_rng = new Rand(other_seed);
        // it is the last element of the first row of the other patch, so we need to skip everything before that
        for (let i = 0; i < this.patch_size - 1; i++) {
            other_rng.next();
        }
        this.padded_patch_values[(padded_size - 1) * padded_size] = ValueNoise.HEIGHT_SCALE * other_rng.next();

        other_seed = (this.center_x + this.chunk_size) + "&" + (this.center_y - this.chunk_size);
        other_rng = new Rand(other_seed);
        // it is the first element of the last row of the other patch, so we need to skip everything before that
        for (let i = 0; i < this.patch_size * (this.patch_size - 1); i++) {
            other_rng.next();
        }
        this.padded_patch_values[padded_size - 1] = ValueNoise.HEIGHT_SCALE * other_rng.next();

        other_seed = (this.center_x + this.chunk_size) + "&" + (this.center_y + this.chunk_size);
        other_rng = new Rand(other_seed);
        // it is the first element of the other patch, so we don't need to skip anything
        this.padded_patch_values[padded_size * padded_size - 1] = ValueNoise.HEIGHT_SCALE * other_rng.next();
    }

    public eval(x: number, y: number): number {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = Math.min(x0 + 1, this.patch_size + 1);
        const y1 = Math.min(y0 + 1, this.patch_size + 1);

        const tx = x - x0;
        const ty = y - y0;

        // const v00 = this.patch_values[y0 * this.patch_size + x0];
        // const v01 = this.patch_values[y0 * this.patch_size + x1];
        // const v10 = this.patch_values[y1 * this.patch_size + x0];
        // const v11 = this.patch_values[y1 * this.patch_size + x1];
        const v00 = this.padded_patch_values[y0 * (this.patch_size + 2) + x0];
        const v01 = this.padded_patch_values[y0 * (this.patch_size + 2) + x1];
        const v10 = this.padded_patch_values[y1 * (this.patch_size + 2) + x0];
        const v11 = this.padded_patch_values[y1 * (this.patch_size + 2) + x1];

        const v0 = lerp(v00, v01, tx);
        const v1 = lerp(v10, v11, tx);

        return lerp(v0, v1, ty);
    }

    public generateHeightMap(): Float32Array {
        // the padded patch is a 2D array of size (patch_size + 2) * (patch_size + 2), in our case, 10 x 10
        // original we upsample the 8 x 8 patch to 64 x 64, so now the new upsampled chunk will be 80 x 80,
        // and we will need the inner 64 x 64
        const upsample_factor = this.chunk_size / this.patch_size;
        let padded_chunk_size = upsample_factor * (this.patch_size + 2);
        let padded_height_map = new Float32Array(padded_chunk_size * padded_chunk_size);
        // let height_map = new Float32Array(this.chunk_size * this.chunk_size);
        let frequency = 1.0 / (4 * upsample_factor);  // 1/ (8 * upsample_factor) so 1/8, 1/4, 1/2, 1 => 4 octaves
        const frequency_multiplier = 2;
        const amplitude_multiplier = 5;
        const num_octaves = 3;

        // for (let j = 0; j < this.chunk_size; j++) {
        //     for (let i = 0; i < this.chunk_size; i++) {
        for (let j = 0; j < padded_chunk_size; j++) {
            for (let i = 0; i < padded_chunk_size; i++) {
                let x = i * frequency;
                let y = j * frequency;
                let amplitude = 0.03/5;
                let height = 0.0;
                for (let k = 0; k < num_octaves; k++) {
                    height += this.eval(x, y) * amplitude;

                    x *= frequency_multiplier;
                    y *= frequency_multiplier;
                    amplitude *= amplitude_multiplier;
                }
                // height_map[j * this.chunk_size + i] = Math.min(Math.floor(height), 100);
                padded_height_map[j * padded_chunk_size + i] = Math.min(Math.floor(height), 100);  // todo: add floor back here
            }
        }


        // get the inner 64 x 64
        let height_map = new Float32Array(this.chunk_size * this.chunk_size);
        for (let j = 0; j < this.chunk_size; j++) {
            for (let i = 0; i < this.chunk_size; i++) {
                height_map[j * this.chunk_size + i] = padded_height_map[(j + upsample_factor) * padded_chunk_size + (i + upsample_factor)];
            }
        }

        return height_map;

    }
}

export default ValueNoise;