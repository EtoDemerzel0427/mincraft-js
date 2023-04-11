import { Vec3, Vec4 } from "../lib/TSM.js";
export class BigRock {
    constructor() {
        this.positionsRay = [
            new Vec4([0.45, 0.0, 0.0, 1.0]),
            new Vec4([0.25, 0.5, 0.0, 1.0]),
            new Vec4([0.0, 0.0, 0.0, 1.0]),
            new Vec4([-0.25, 0.5, 0.0, 1.0]),
            new Vec4([-0.45, 0.0, 0.0, 1.0]),
            new Vec4([0.45, 0.0, 0.01, 1.0]),
            new Vec4([0.25, 0.5, 0.01, 1.0]),
            new Vec4([0.0, 0.0, 0.01, 1.0]),
            new Vec4([-0.25, 0.5, 0.01, 1.0]),
            new Vec4([-0.45, 0.0, 0.01, 1.0]),
        ];
        this.positionsF32 = new Float32Array(this.positionsRay.length * 4);
        this.positionsRay.forEach((v, i) => {
            this.positionsF32.set(v.xyzw, i * 4);
        });
        this.indicesRay = [
            new Vec3([0, 1, 2]),
            new Vec3([2, 1, 3]),
            new Vec3([2, 3, 4]),
            new Vec3([5, 7, 6]),
            new Vec3([7, 8, 6]),
            new Vec3([7, 9, 8]),
        ];
        this.indicesU32 = new Uint32Array(this.indicesRay.length * 3);
        this.indicesRay.forEach((v, i) => {
            this.indicesU32.set(v.xyz, i * 3);
        });
        this.normalsRay = [
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
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
//# sourceMappingURL=BigRock.js.map