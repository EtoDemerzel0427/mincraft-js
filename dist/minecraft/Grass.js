import { Vec3, Vec4 } from "../lib/TSM.js";
export class Grass {
    constructor() {
        this.positionsRay = [
            new Vec4([0.0, 0.2, 0.0, 1.0]),
            new Vec4([0.09, 0.0, 0.0, 1.0]),
            new Vec4([-0.09, 0.0, 0.0, 1.0]),
            new Vec4([0.15, 0.1, 0.0, 1.0]),
            new Vec4([0.2, 0.0, 0.0, 1.0]),
            new Vec4([0.1, 0.0, 0.0, 1.0]),
            new Vec4([-0.15, 0.1, 0.0, 1.0]),
            new Vec4([-0.1, 0.0, 0.0, 1.0]),
            new Vec4([-0.2, 0.0, 0.0, 1.0]),
            new Vec4([0.0, 0.2, 0.01, 1.0]),
            new Vec4([0.09, 0.0, 0.01, 1.0]),
            new Vec4([-0.09, 0.0, 0.01, 1.0]),
            new Vec4([0.15, 0.1, 0.01, 1.0]),
            new Vec4([0.2, 0.0, 0.01, 1.0]),
            new Vec4([0.1, 0.0, 0.01, 1.0]),
            new Vec4([-0.15, 0.1, 0.01, 1.0]),
            new Vec4([-0.1, 0.0, 0.01, 1.0]),
            new Vec4([-0.2, 0.0, 0.01, 1.0]),
        ];
        this.positionsF32 = new Float32Array(this.positionsRay.length * 4);
        this.positionsRay.forEach((v, i) => {
            this.positionsF32.set(v.xyzw, i * 4);
        });
        this.indicesRay = [
            //Center Grass
            // new Vec3([0, 1, 2]),
            new Vec3([0, 1, 2]),
            new Vec3([3, 4, 5]),
            new Vec3([6, 7, 8]),
            new Vec3([9, 11, 10]),
            new Vec3([12, 14, 13]),
            new Vec3([15, 17, 16]),
        ];
        this.indicesU32 = new Uint32Array(this.indicesRay.length * 3);
        this.indicesRay.forEach((v, i) => {
            this.indicesU32.set(v.xyz, i * 3);
        });
        this.normalsRay = [
            //Center Grass
            // new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
        ];
        this.normalsF32 = new Float32Array(this.normalsRay.length * 4);
        this.normalsRay.forEach((v, i) => {
            this.normalsF32.set(v.xyzw, i * 4);
        });
    }
    positionsFlat() {
        return this.positionsF32;
    }
    indices() {
        return this.indicesRay;
    }
    indicesFlat() {
        return this.indicesU32;
    }
    normals() {
        return this.normalsRay;
    }
    normalsFlat() {
        return this.normalsF32;
    }
}
//# sourceMappingURL=Grass.js.map