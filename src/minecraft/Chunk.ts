// import {Mat3, Mat4, Vec2, Vec3, Vec4} from "../lib/TSM.js";
// import Rand from "../lib/rand-seed/Rand.js"

import MultiOctaveNoise from "./noise.js";


export class Chunk {
    private cubes: number; // Number of cubes that should be *drawn* each frame
    private cubePositionsF32: Float32Array; // (4 x cubes) array of cube translations, in homogeneous coordinates
    private cubeTypeF32: Float32Array; // the type of cube (grass=0.0, marble=1.0,creek=2.0, snow mountain=3.0,  stone in creek=4.0)
    private x : number; // Center of the chunk
    private y : number;
    private size: number; // Number of cubes along each side of the chunk
    private maxHeight: number;
    private minHeight: number;
    private heightMap: Float32Array;
    static readonly PLAYER_RADIUS = 0.4;
    static readonly PLAYER_HEIGHT = 2.0;
    
    constructor(centerX : number, centerY : number, size: number) {
        this.x = centerX;
        this.y = centerY;
        this.size = size;
        this.cubes = size*size;       
        this.maxHeight = -1; 
        this.minHeight = Number.MAX_SAFE_INTEGER;
        this.generateCubes();
        this.generateCubeType();
    }
    
    private generateCubes() {
        const topleftx = this.x - this.size / 2;
        const toplefty = this.y - this.size / 2;
        
      //TODO: The real landscape-generation logic. The example code below shows you how to use the pseudorandom number generator to create a few cubes.
      const visibleCubes = [];

      // let noises = new ValueNoise(this.x, this.y, 8, 64);
      let noises = new MultiOctaveNoise(this.x, this.y, this.size, [2, 4, 8]);
      this.heightMap = noises.generateHeightMap();

      for(let i= 0; i < this.size; i++) {
          for(let j= 0; j < this.size; j++) {
              const height = this.heightMap[i * this.size + j];
              if(height > this.maxHeight) this.maxHeight = height;
              if(height < this.minHeight) this.minHeight = height;
              
              // get neighbors
              // todo: note that currently we still need to handle the boundary, but after we implement the boundary loading,
              // we can remove the boundary handling here, because you will never see the boundary
              const left = (j == 0) ? 0 : this.heightMap[i * this.size + j - 1];
              const right = (j == this.size - 1) ? 0: this.heightMap[i * this.size + j + 1];
              const up = (i == 0) ? 0: this.heightMap[(i - 1) * this.size + j];
              const down = (i == this.size - 1) ? 0: this.heightMap[(i + 1) * this.size + j];

              // get the minimum height of the neighbors
              const min = Math.min(left, right, up, down);

              // render from min + 1 to height
              // if the current height is lower than all its neighbors, we just render the uppermost cube
              for (let k = Math.min(min + 1, height) ; k <= height; k++) {
                  visibleCubes.push(topleftx + i);
                  visibleCubes.push(k);
                  visibleCubes.push(toplefty + j);
                  visibleCubes.push(0.0);
              }
          }
      }

      this.cubes = visibleCubes.length / 4;
      this.cubePositionsF32 = new Float32Array(visibleCubes);
    }
    
    private generateCubeType(){
        // Generate cube type according to the position of chunk and cube height
        //grass=0.0, marble=1.0,creek=2.0, snow mountain=3.0, stone in creek=4.0
        const visibleCubeTypes = [];
        for(let i=0; i < this.cubes; ++i){
            let h :number= this.cubePositionsF32[i * 4 + 1] + 1;
            let heightRange = (this.maxHeight - this.minHeight) + this.minHeight;
            let grass = 0.0 ;
            let marble = Number(h > 0.4 * heightRange && h < 0.5 * heightRange) ;
            let creek = Number(h >= 0.25 * heightRange && h <= 0.3 * heightRange) * 2.0;
            let snow = Number(h >= 0.85 * heightRange) * 3.0 ;
            let stone = Number(h < 0.25 * heightRange) * 4.0 ;
            let res = grass + marble + creek + snow + stone ;
            visibleCubeTypes.push(res);
        }
        this.cubeTypeF32 = new Float32Array(visibleCubeTypes);
    }

    public cubePositions(): Float32Array {
        return this.cubePositionsF32;
    }

    public cubeTypes(): Float32Array {
        return this.cubeTypeF32;
    }
    
    public numCubes(): number {
        return this.cubes;
    }

    /**
     * Get the height of the chunk at the given x, y position
     * @param x the x position from the top left corner of the chunk
     * @param y the y position from the top left corner of the chunk
     */
    public getHeight(x: number, y: number): number {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
            return -1;
        }
        return this.heightMap[x * this.size + y];
    }

    // for debug
    public printHeightMap() {
        for(let i = 0; i < this.size; i++) {
            let str = "";
            for(let j = 0; j < this.size; j++) {
                str += this.heightMap[i * this.size + j] + " ";
            }
            console.log(str);
        }
    }
}
