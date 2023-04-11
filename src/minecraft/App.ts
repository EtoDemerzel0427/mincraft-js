import { Debugger } from "../lib/webglutils/Debugging.js";
import {
  CanvasAnimation,
  WebGLUtilities
} from "../lib/webglutils/CanvasAnimation.js";
import { GUI } from "./Gui.js";
import {
  blankCubeFSText,
  blankCubeVSText,
  grassVSText,
  grassFSText,
  rockVSText,
  rockFSText
} from "./Shaders.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Camera } from "../lib/webglutils/Camera.js";
import { Cube } from "./Cube.js";
import { Grass } from "./Grass.js";
import { BigRock } from "./BigRock.js";
import { Chunk } from "./Chunk.js";

export class MinecraftAnimation extends CanvasAnimation {
  private gui: GUI;

  // chunk : Chunk;
  chunks : Map<string, Chunk>; // the 3x3 chunks around the player

  /*  Cube Rendering */
  private cubeGeometry: Cube;
  private grassGeometry: Grass;
  private rockGeometry: BigRock;
  private blankCubeRenderPass: RenderPass;
  private GrassRenderPass: RenderPass;
  private RockRenderPass: RenderPass;

  /* Global Rendering Info */
  public sunRadius: number;
  public angle: number;
  public lightPosition: Vec4;
  public lightColor:Vec3;
  public ambientColor:Vec3;
  private backgroundColor: Vec4;

  private canvas2d: HTMLCanvasElement;

  // Player's head position in world coordinate.
  // Player should extend two units down from this location, and 0.4 units radially.
  private playerPosition: Vec3;
  private curMinHeight: number;
  private lastTimeStamp: number;
  private vertical_velocity: number;
  static readonly CHUNK_SIZE = 64;
  static readonly PLAYER_HEIGHT = 2.0;
  static readonly PLAYER_RADIUS = 0.4;
  static GRAVITY = -9.8;


  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.canvas2d = document.getElementById("textCanvas") as HTMLCanvasElement;

    this.ctx = Debugger.makeDebugContext(this.ctx);
    let gl = this.ctx;

    this.gui = new GUI(this.canvas2d, this);
    this.playerPosition = this.gui.getCamera().pos();

    this.chunks = new Map();

    // find the chunk that the player is in (the center of the 3x3 chunks)
    const playerChunkX = Math.round(this.playerPosition.x / 64);
    const playerChunkY = Math.round(this.playerPosition.z / 64);

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const centerX = playerChunkX + i * 64;
        const centerY = playerChunkY + j * 64;
        const key = `${centerX},${centerY}`; // Use a string as a key for the map
        this.chunks.set(key, new Chunk(centerX, centerY, 64));
      }
    }

    // print the heightmap of (0, 64) chunk
    // this.chunks.get("0,64").printHeightMap();

    this.curMinHeight = this.getMinStandingHeight(this.playerPosition.x, this.playerPosition.z)
    this.lastTimeStamp = Date.now();
    this.vertical_velocity = 0;

    this.blankCubeRenderPass = new RenderPass(gl, blankCubeVSText, blankCubeFSText);
    this.GrassRenderPass = new RenderPass(gl,grassVSText,grassFSText);
    this.RockRenderPass = new RenderPass(gl,rockVSText,rockFSText);
    this.cubeGeometry = new Cube();
    this.grassGeometry = new Grass();
    this.rockGeometry = new BigRock();

    this.initBlankCube();
    this.initGrass();
    this.initRock();

    this.lightColor = new Vec3([1.0,1.0,1.0]);
    this.ambientColor = new Vec3([0.1,0.1,0.1]);
    this.angle = 7.0*2.0*Math.PI/8.0+Math.PI/18.0;
    this.sunRadius = 1000*Math.sqrt(2);
    this.lightPosition = new Vec4([Math.sin(this.angle)*this.sunRadius,
                                  Math.cos(this.angle)*this.sunRadius,
                                  Math.sin(this.angle)*this.sunRadius,
                                  1.0]);
    //this.lightPosition = new Vec4([-1000, 1000, -1000, 1]);
    this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);
  }

  private updateChunks() {
    // Calculate the player's new chunk coordinates
    const playerChunkX = Math.round(this.playerPosition.x / 64);
    const playerChunkY = Math.round(this.playerPosition.z / 64);

    // Remove chunks that are outside the 3x3 area around the player's new chunk
    this.chunks.forEach((chunk, key) => {
      const [chunkX, chunkY] = key.split(',').map(Number);
      if (Math.abs(chunkX - playerChunkX * 64) > 64 || Math.abs(chunkY - playerChunkY * 64) > 64) {
        this.chunks.delete(key);
      }
    });

    // Add chunks that are inside the 3x3 area around the player's new chunk, but not in the current `chunks` Map
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const centerX = playerChunkX * 64 + i * 64;
        const centerY = playerChunkY * 64 + j * 64;
        const key = `${centerX},${centerY}`;

        if (!this.chunks.has(key)) {
          this.chunks.set(key, new Chunk(centerX, centerY, 64));
        }
      }
    }
  }

  /**
   * Given the global coordinates of a point, return the height of the current cell.
   * This function is only called for points around the player, so the chunk must be in the map.
   * @param x
   * @param y
   * @private
   */
  private getHeightFromGlobalCoordinates(x: number, y: number): number {
    // get the chunk that includes the point
    const cur_chunk_x = Math.round(x / 64) * 64;
    const cur_chunk_y = Math.round(y / 64) * 64;

    const chunk = this.chunks.get(`${cur_chunk_x},${cur_chunk_y}`);
    if (!chunk) {
      // if implementation is correct, this should never happen
      throw new Error("Chunk not found");
    }

    // get the coordinates of the point in the chunk
    const topleftX = cur_chunk_x - MinecraftAnimation.CHUNK_SIZE / 2;
    const topleftY = cur_chunk_y - MinecraftAnimation.CHUNK_SIZE / 2;

    const curCellX = Math.floor(x - topleftX);
    const curCellY = Math.floor(y - topleftY);

    return chunk.getHeight(curCellX, curCellY);
  }

  /**
   * Given the global coordinates of a point, return the minimum height that the player can stand on.
   * @param x
   * @param y Note that in WebGL, y is the vertical axis, so this is actually the z coordinate.
   * @private
   */
  private getMinStandingHeight(x: number, y: number): number {
    const cur_height = this.getHeightFromGlobalCoordinates(x, y);
    const curCellX = Math.floor(x);
    const curCellY = Math.floor(y);

    // the center of the chunk that the player is in
    const cur_chunk_x = Math.round(x / 64) * 64;
    const cur_chunk_y = Math.round(y / 64) * 64;

    const topleftX = cur_chunk_x - MinecraftAnimation.CHUNK_SIZE / 2;
    const topleftY = cur_chunk_y - MinecraftAnimation.CHUNK_SIZE / 2;

    const chunk = this.chunks.get(`${cur_chunk_x},${cur_chunk_y}`);  // for most of the time, this should be the chunk for every neighbor (except the boundary)

    // iterate through all the cubes around the player
    // check if the circle of radius 0.4 intersects with the cubes and update the min height
    let min_height = cur_height;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;  // this case is handled above
        // the global coordinates of the square's top left corner
        const cellX = curCellX + i;
        const cellY = curCellY + j;

        // test if the circle intersects with the square
        let test_x = x;
        let test_y = y;
        if (x < cellX) test_x = cellX;
        else if (x > cellX + 1) test_x = cellX + 1;
        if (y < cellY) test_y = cellY;
        else if (y > cellY + 1) test_y = cellY + 1;

        const dist_x = x - test_x;
        const dist_y = y - test_y;
        const distance = Math.sqrt((dist_x * dist_x) + (dist_y * dist_y));

        if (distance <= MinecraftAnimation.PLAYER_RADIUS) {
          // the circle intersects with the square
          // we need to check if the height of the square is higher than the current min height
          let height = chunk.getHeight(cellX - topleftX, cellY - topleftY);
          if (height === -1) {
            // cross chunk, need the neighboring chunk's heightMap
            height = this.getHeightFromGlobalCoordinates(cellX, cellY);
          }
          if (height > min_height) {
            min_height = height;
          }
        }
      }
    }

    return min_height;
  }


  /**
   * Setup the simulation. This can be called again to reset the program.
   */
  public reset(): void {
      this.gui.reset();
      this.lightColor = new Vec3([1.0,1.0,1.0]);
      this.ambientColor = new Vec3([0.1,0.1,0.1]);
      this.angle = 7.0*2.0*Math.PI/8.0+Math.PI/18.0;
      this.sunRadius = 1000*Math.sqrt(2);
      this.lightPosition = new Vec4([Math.sin(this.angle)*this.sunRadius,
                                    Math.cos(this.angle)*this.sunRadius,
                                    Math.sin(this.angle)*this.sunRadius,
                                    1.0]);
      
      this.playerPosition = this.gui.getCamera().pos();
      this.updateChunks();

      this.lastTimeStamp = Date.now();
      this.vertical_velocity = 0;
  }


  /**
   * Sets up the blank cube drawing
   */
  private initBlankCube(): void {
    this.blankCubeRenderPass.setIndexBufferData(this.cubeGeometry.indicesFlat());
    this.blankCubeRenderPass.addAttribute("aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cubeGeometry.positionsFlat()
    );

    this.blankCubeRenderPass.addAttribute("aNorm",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cubeGeometry.normalsFlat()
    );

    this.blankCubeRenderPass.addAttribute("aUV",
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cubeGeometry.uvFlat()
    );

    this.blankCubeRenderPass.addInstancedAttribute("aOffset",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.blankCubeRenderPass.addInstancedAttribute("blockType",
    1,
    this.ctx.FLOAT,
    false,
    Float32Array.BYTES_PER_ELEMENT,
    0,
    undefined,
    new Float32Array(0)
  );

    this.blankCubeRenderPass.addInstancedAttribute("inSeed",
    1,
    this.ctx.FLOAT,
    false,
    Float32Array.BYTES_PER_ELEMENT,
    0,
    undefined,
    new Float32Array(0)
    );

    this.blankCubeRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
    });
    this.blankCubeRenderPass.addUniform("lightColor",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniform3fv(loc, this.lightColor.xyz);
    });
    this.blankCubeRenderPass.addUniform("ambientColor",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniform3fv(loc, this.ambientColor.xyz);
    });
    this.blankCubeRenderPass.addUniform("uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.blankCubeRenderPass.addUniform("uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });

    this.blankCubeRenderPass.setDrawData(this.ctx.TRIANGLES, this.cubeGeometry.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
    this.blankCubeRenderPass.setup();
  }

  private initGrass():void{
    this.GrassRenderPass.setIndexBufferData(this.grassGeometry.indicesFlat());
    this.GrassRenderPass.addAttribute("aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.grassGeometry.positionsFlat()
    );

    this.GrassRenderPass.addAttribute("aNorm",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.grassGeometry.normalsFlat()
    )
    this.GrassRenderPass.addInstancedAttribute("aOffset",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.GrassRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
    });
    this.GrassRenderPass.addUniform("lightColor",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniform3fv(loc, this.lightColor.xyz);
    });
    this.GrassRenderPass.addUniform("ambientColor",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniform3fv(loc, this.ambientColor.xyz);
    });
    this.GrassRenderPass.addUniform("uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.GrassRenderPass.addUniform("uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });

    this.GrassRenderPass.setDrawData(this.ctx.TRIANGLES, this.grassGeometry.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
    this.GrassRenderPass.setup();

  }

  public initRock():void{
    this.RockRenderPass.setIndexBufferData(this.rockGeometry.indicesFlat());
    this.RockRenderPass.addAttribute("aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.rockGeometry.positionsFlat()
    );

    this.RockRenderPass.addAttribute("aNorm",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.rockGeometry.normalsFlat()
    )
    this.RockRenderPass.addInstancedAttribute("aOffset",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.RockRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
    });
    this.RockRenderPass.addUniform("lightColor",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniform3fv(loc, this.lightColor.xyz);
    });
    this.RockRenderPass.addUniform("ambientColor",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniform3fv(loc, this.ambientColor.xyz);
    });
    this.RockRenderPass.addUniform("uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.RockRenderPass.addUniform("uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });

    this.RockRenderPass.setDrawData(this.ctx.TRIANGLES, this.rockGeometry.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
    this.RockRenderPass.setup();

  }
  private updatePlayerPosition(delta_time: number): void {
    // vertical movement
    if (this.playerPosition.y > this.curMinHeight + MinecraftAnimation.PLAYER_HEIGHT || this.vertical_velocity > 0) {
        // falling
        this.vertical_velocity -= 9.8 * delta_time;
        this.playerPosition.y += (this.vertical_velocity + MinecraftAnimation.GRAVITY * delta_time / 2) * delta_time;  // accurate, since the delta time is small, you can also use this.vertical_velocity * delta_time
        this.playerPosition.y = Math.max(this.playerPosition.y, this.curMinHeight + MinecraftAnimation.PLAYER_HEIGHT);
    } else {
      // standing on the ground
      this.vertical_velocity = 0;
      this.playerPosition.y = this.curMinHeight + MinecraftAnimation.PLAYER_HEIGHT;

    }

    const next_pos = this.playerPosition.copy().add(this.gui.walkDir());
    const next_min_height = this.getMinStandingHeight(next_pos.x, next_pos.z);

    // debug code
    //console.log("cur_pos: " + this.playerPosition.x + ", " + this.playerPosition.y + ", " + this.playerPosition.z);
    // console.log("next_pos: " + next_pos.x + ", " + next_pos.y + ", " + next_pos.z);
    // console.log("next_min_height: " + next_min_height);

    if (next_pos.y >= next_min_height + MinecraftAnimation.PLAYER_HEIGHT) {
        // no collision, update the position
        this.playerPosition = next_pos;
        this.curMinHeight = next_min_height;
    } else {
        // collision, stop the player
        console.log("collision");
    }
  }



  /**
   * Draws a single frame
   *
   */
  public draw(): void {
    //TODO: Logic for a rudimentary walking simulator. Check for collisions and reject attempts to walk into a cube. Handle gravity, jumping, and loading of new chunks when necessary.
    const curTime = Date.now();
    const dt = (curTime - this.lastTimeStamp) / 1000;
    // this.playerPosition.add(this.gui.walkDir());
    this.updatePlayerPosition(dt);
    this.updateChunks();

    this.gui.getCamera().setPos(this.playerPosition);

    // Drawing
    const gl: WebGLRenderingContext = this.ctx;
    const bg: Vec4 = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
    this.drawScene(0, 0, 1280, 960);

    this.lastTimeStamp = curTime;
  }

  private drawScene(x: number, y: number, width: number, height: number): void {
    const gl: WebGLRenderingContext = this.ctx;
    gl.viewport(x, y, width, height);

    //TODO: Render multiple chunks around the player, using Perlin noise shaders
    // const positionArrays = this.chunks.map((chunk) => chunk.cubePositions());
    // const totalLength = positionArrays.reduce((acc, cur) => acc + cur.length, 0);
    // const allPositions = new Float32Array(totalLength);
    // let offset = 0;
    // for (const positions of positionArrays) {
    //     allPositions.set(positions, offset);
    //     offset += positions.length;
    // }
    //
    // this.blankCubeRenderPass.updateAttributeBuffer("aOffset", allPositions);
    // this.blankCubeRenderPass.drawInstanced(totalLength / 4);
    for (const chunk of this.chunks.values()) {
      if(this.gui.PDownStatus()){
        const inRanSeed = [];
        for(let i=0;i<chunk.numCubes();++i){
           let r = Math.round(Math.random()*100.0);
           inRanSeed.push(r);
        }
        let inSeedF32 = new Float32Array(inRanSeed);
        this.blankCubeRenderPass.updateAttributeBuffer("inSeed", inSeedF32);
      }
     
      this.blankCubeRenderPass.updateAttributeBuffer("aOffset", chunk.cubePositions());
      this.blankCubeRenderPass.updateAttributeBuffer("blockType", chunk.cubeTypes());
      this.blankCubeRenderPass.drawInstanced(chunk.cubePositions().length / 4);

      this.GrassRenderPass.updateAttributeBuffer("aOffset",chunk.grassPositions());
      this.GrassRenderPass.drawInstanced(chunk.grassPositions().length / 4);

      this.RockRenderPass.updateAttributeBuffer("aOffset",chunk.rockPositions());
      this.RockRenderPass.drawInstanced(chunk.rockPositions().length / 4);
    }

  }

  public getGUI(): GUI {
    return this.gui;
  }


  public jump() {
      //TODO: If the player is not already in the lair, launch them upwards at 10 units/sec.
      if (this.playerPosition.y <= this.curMinHeight + MinecraftAnimation.PLAYER_HEIGHT) {
          this.vertical_velocity = 10;
      } else {
         console.log(this.playerPosition.y, this.curMinHeight + MinecraftAnimation.PLAYER_HEIGHT);
      }
  }
}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  /* Start drawing */
  const canvasAnimation: MinecraftAnimation = new MinecraftAnimation(canvas);
  canvasAnimation.start();
}
