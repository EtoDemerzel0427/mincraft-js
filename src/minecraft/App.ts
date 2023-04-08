import { Debugger } from "../lib/webglutils/Debugging.js";
import {
  CanvasAnimation,
  WebGLUtilities
} from "../lib/webglutils/CanvasAnimation.js";
import { GUI } from "./Gui.js";
import {

  blankCubeFSText,
  blankCubeVSText
} from "./Shaders.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Camera } from "../lib/webglutils/Camera.js";
import { Cube } from "./Cube.js";
import { Chunk } from "./Chunk.js";

export class MinecraftAnimation extends CanvasAnimation {
  private gui: GUI;

  // chunk : Chunk;
  chunks : Map<string, Chunk>; // the 3x3 chunks around the player

  /*  Cube Rendering */
  private cubeGeometry: Cube;
  private blankCubeRenderPass: RenderPass;

  /* Global Rendering Info */
  private lightPosition: Vec4;
  private backgroundColor: Vec4;

  private canvas2d: HTMLCanvasElement;

  // Player's head position in world coordinate.
  // Player should extend two units down from this location, and 0.4 units radially.
  private playerPosition: Vec3;


  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.canvas2d = document.getElementById("textCanvas") as HTMLCanvasElement;

    this.ctx = Debugger.makeDebugContext(this.ctx);
    let gl = this.ctx;

    this.gui = new GUI(this.canvas2d, this);
    this.playerPosition = this.gui.getCamera().pos();

    // Generate initial landscape
    // Generate the 3x3 chunks around the player (starting from (0,0)
    // each chunk is 64 x 64
    // todo: to do lazy loading, this should be changed to a map of chunks
    // now for simplicity, we just generate all the chunks in an array
    // this.chunks = [];
    // for (let i = -1; i <= 1; i++) {
    //   for (let j = -1; j <= 1; j++) {
    //     this.chunks.push(new Chunk(i * 64, j * 64, 64));
    //   }
    // }
    this.chunks = new Map();

    // find the chunk that the player is in (the center of the 3x3 chunks)
    const playerChunkX = Math.floor(this.playerPosition.x / 64);
    const playerChunkY = Math.floor(this.playerPosition.z / 64);

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const centerX = playerChunkX + i * 64;
        const centerY = playerChunkY + j * 64;
        const key = `${centerX},${centerY}`; // Use a string as a key for the map
        this.chunks.set(key, new Chunk(centerX, centerY, 64));
      }
    }

    this.blankCubeRenderPass = new RenderPass(gl, blankCubeVSText, blankCubeFSText);
    this.cubeGeometry = new Cube();
    this.initBlankCube();

    this.lightPosition = new Vec4([-1000, 1000, -1000, 1]);
    this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);
  }

  private updateChunks() {
    // Calculate the player's new chunk coordinates
    const playerChunkX = Math.floor(this.playerPosition.x / 64);
    const playerChunkY = Math.floor(this.playerPosition.z / 64);

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
   * Setup the simulation. This can be called again to reset the program.
   */
  public reset(): void {
      this.gui.reset();

      this.playerPosition = this.gui.getCamera().pos();
      this.updateChunks();
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

    this.blankCubeRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
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



  /**
   * Draws a single frame
   *
   */
  public draw(): void {
    //TODO: Logic for a rudimentary walking simulator. Check for collisions and reject attempts to walk into a cube. Handle gravity, jumping, and loading of new chunks when necessary.
    this.playerPosition.add(this.gui.walkDir());
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
      this.blankCubeRenderPass.updateAttributeBuffer("aOffset", chunk.cubePositions());
      this.blankCubeRenderPass.drawInstanced(chunk.cubePositions().length / 4);
    }

  }

  public getGUI(): GUI {
    return this.gui;
  }


  public jump() {
      //TODO: If the player is not already in the lair, launch them upwards at 10 units/sec.
  }
}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  /* Start drawing */
  const canvasAnimation: MinecraftAnimation = new MinecraftAnimation(canvas);
  canvasAnimation.start();
}
