import { Mat3, Mat4, Vec3, Vec4 } from "../lib/TSM.js";
import Rand from "../lib/rand-seed/Rand.js"
import ValueNoise from "./noise.js";


export class Chunk {
    private cubes: number; // Number of cubes that should be *drawn* each frame
    private cubePositionsF32: Float32Array; // (4 x cubes) array of cube translations, in homogeneous coordinates
    private x : number; // Center of the chunk
    private y : number;
    private size: number; // Number of cubes along each side of the chunk
    
    constructor(centerX : number, centerY : number, size: number) {
        this.x = centerX;
        this.y = centerY;
        this.size = size;
        this.cubes = size*size;        
        this.generateCubes();
    }

    private generateHeightMap(seed: string): Float32Array {
        let noises = new ValueNoise(seed, 4);
        let heightMap = new Float32Array(this.size * this.size).fill(0.);
        let frequency = 0.02;
        let frequencyMultiplier = 2;
        let amplitudeMultiplier = 0.5;
        const octaves = 5;
        let maxNoise = 0.0;
        for (let j = 0; j < this.size; j++) {
            for (let i = 0; i < this.size; i++) {
                let x = i * frequency;
                let y = j * frequency;
                let amplitude = 1.0;
                for (let k = 0; k < octaves; k++) {
                    heightMap[this.size * j + i] += amplitude * noises.eval(x, y);
                    x *= frequencyMultiplier;
                    y *= frequencyMultiplier;
                    amplitude *= amplitudeMultiplier;
                }
                maxNoise = Math.max(maxNoise, heightMap[this.size * j + i]);
            }
        }

        for (let j = 0; j < this.size * this.size; j++) {
            heightMap[j]  *= (100 / maxNoise);
            // console.log(heightMap[j]);
        }
        return heightMap;
    }
    
    
    private generateCubes() {
        const topleftx = this.x - this.size / 2;
        const toplefty = this.y - this.size / 2;
        
      //TODO: The real landscape-generation logic. The example code below shows you how to use the pseudorandom number generator to create a few cubes.
      this.cubes = this.size * this.size;
      this.cubePositionsF32 = new Float32Array(4 * this.cubes);

      const seed = this.x + " " + this.y; // set different seeds for different chunks
      const heightMap = this.generateHeightMap(seed);

      for(let i=0; i<this.size; i++)
      {
          for(let j=0; j<this.size; j++)
          {
            // const height = Math.floor(10.0 * rng.next());
            const height = heightMap[this.size * i + j];
            const idx = this.size * i + j;
            this.cubePositionsF32[4*idx + 0] = topleftx + j;
            this.cubePositionsF32[4*idx + 1] = height;
            this.cubePositionsF32[4*idx + 2] = toplefty + i;
            this.cubePositionsF32[4*idx + 3] = 0;
          }
      }
    
    }
    
    public cubePositions(): Float32Array {
        return this.cubePositionsF32;
    }
    
    
    public numCubes(): number {
        return this.cubes;
    }
}
