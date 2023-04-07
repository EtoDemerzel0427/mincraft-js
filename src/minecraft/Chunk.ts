import {Mat3, Mat4, Vec2, Vec3, Vec4} from "../lib/TSM.js";
import Rand from "../lib/rand-seed/Rand.js"
import ValueNoise from "./noise.js";

function lerp(lo: number, hi: number, t: number): number {
    return lo * (1 - t) + hi * t;
}


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
    
    private generateCubes() {
        const topleftx = this.x - this.size / 2;
        const toplefty = this.y - this.size / 2;
        
      //TODO: The real landscape-generation logic. The example code below shows you how to use the pseudorandom number generator to create a few cubes.
      const visibleCubes = [];

      let noises = new ValueNoise(this.x, this.y, 8, 64);

      const heightMap = noises.generateHeightMap();

      for(let i= 0; i < this.size; i++) {
          for(let j= 0; j<this.size; j++) {
              const height = heightMap[i * this.size + j];

              // get neighbors
              // todo: note that currently we still need to handle the boundary, but after we implement the boundary loading,
              // we can remove the boundary handling here, because you will never see the boundary
              const left = (j == 0) ? 0 : heightMap[i * this.size + j - 1];
              const right = (j == this.size - 1) ? 0: heightMap[i * this.size + j + 1];
              const up = (i == 0) ? 0: heightMap[(i - 1) * this.size + j];
              const down = (i == this.size - 1) ? 0: heightMap[(i + 1) * this.size + j];

              // get the minimum height of the neighbors
              const min = Math.min(left, right, up, down);

              // render from min + 1 to height
              // if the current height is lower than all its neighbors, we just render the uppermost cube
              for (let k = Math.min(min + 1, height) ; k <= height; k++) {
                  visibleCubes.push(topleftx + j);
                  visibleCubes.push(k);
                  visibleCubes.push(toplefty + i);
                  visibleCubes.push(0.0);
              }
          }
      }

      this.cubes = visibleCubes.length / 4;
      this.cubePositionsF32 = new Float32Array(visibleCubes);
    }
    
    public cubePositions(): Float32Array {
        return this.cubePositionsF32;
    }
    
    
    public numCubes(): number {
        return this.cubes;
    }
}
