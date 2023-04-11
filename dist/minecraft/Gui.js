import { Camera } from "../lib/webglutils/Camera.js";
import { Vec3, Vec4 } from "../lib/TSM.js";
/**
 * Handles Mouse and Button events along with
 * the the camera.
 */
class GUI {
    /**
     *
     * @param canvas required to get the width and height of the canvas
     * @param animation required as a back pointer for some of the controls
     */
    constructor(canvas, animation) {
        this.height = canvas.height;
        this.width = canvas.width;
        this.prevX = 0;
        this.prevY = 0;
        this.dragging = false;
        this.thetaPerHour = 2 * Math.PI / 24.0;
        this.animation = animation;
        this.reset();
        this.registerEventListeners(canvas);
    }
    /**
     * Resets the state of the GUI
     */
    reset() {
        this.camera = new Camera(new Vec3([0, 100, 0]), new Vec3([0, 100, -1]), new Vec3([0, 1, 0]), 45, this.width / this.height, 0.1, 1000.0);
    }
    /**
     * Sets the GUI's camera to the given camera
     * @param cam a new camera
     */
    setCamera(pos, target, upDir, fov, aspect, zNear, zFar) {
        this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
    }
    /**
     * Returns the view matrix of the camera
     */
    viewMatrix() {
        return this.camera.viewMatrix();
    }
    /**
     * Returns the projection matrix of the camera
     */
    projMatrix() {
        return this.camera.projMatrix();
    }
    getCamera() {
        return this.camera;
    }
    dragStart(mouse) {
        this.prevX = mouse.screenX;
        this.prevY = mouse.screenY;
        this.dragging = true;
    }
    dragEnd(mouse) {
        this.dragging = false;
    }
    /**
     * The callback function for a drag event.
     * This event happens after dragStart and
     * before dragEnd.
     * @param mouse
     */
    drag(mouse) {
        let x = mouse.offsetX;
        let y = mouse.offsetY;
        const dx = mouse.screenX - this.prevX;
        const dy = mouse.screenY - this.prevY;
        this.prevX = mouse.screenX;
        this.prevY = mouse.screenY;
        if (this.dragging) {
            this.camera.rotate(new Vec3([0, 1, 0]), -GUI.rotationSpeed * dx);
            this.camera.rotate(this.camera.right(), -GUI.rotationSpeed * dy);
        }
    }
    changeLight(theta) {
        this.animation.angle = (this.animation.angle + theta) > (2 * Math.PI) ? (this.animation.angle + theta - 2 * Math.PI) : (this.animation.angle + theta);
        this.animation.lightPosition = new Vec4([Math.sin(this.animation.angle) * this.animation.sunRadius,
            Math.cos(this.animation.angle) * this.animation.sunRadius,
            Math.sin(this.animation.angle) * this.animation.sunRadius,
            1.0]);
        if (this.animation.angle <= (10 / 6 * Math.PI) || this.animation.angle >= (1 / 3 * Math.PI)) {
            this.animation.lightColor = new Vec3([1.0, 0.95, 0.95]); //new Vec3([0.2,0.1,0.1]);//more red at morning and afternoon
        }
        else {
            this.animation.lightColor = new Vec3([1.0, 1.0, 1.0]); //new Vec3([0.1,0.1,0.1]);
        }
        if (this.animation.angle >= (Math.PI / 2) && this.animation.angle <= (3 / 2 * Math.PI)) {
            this.animation.ambientColor = new Vec3([0.05, 0.05, 0.05]); // darker at night
        }
        else {
            this.animation.ambientColor = new Vec3([0.5, 0.5, 0.5]); // lighter at daytime
        }
    }
    walkDir() {
        let answer = new Vec3;
        if (this.Wdown)
            answer.add(this.camera.forward().negate());
        if (this.Adown)
            answer.add(this.camera.right().negate());
        if (this.Sdown)
            answer.add(this.camera.forward());
        if (this.Ddown)
            answer.add(this.camera.right());
        answer.y = 0;
        answer.normalize();
        return answer;
    }
    /**
     * Callback function for a key press event
     * @param key
     */
    onKeydown(key) {
        switch (key.code) {
            case "KeyW": {
                this.Wdown = true;
                break;
            }
            case "KeyA": {
                this.Adown = true;
                break;
            }
            case "KeyS": {
                this.Sdown = true;
                break;
            }
            case "KeyD": {
                this.Ddown = true;
                break;
            }
            case "KeyR": {
                this.animation.reset();
                break;
            }
            case "Space": {
                this.animation.jump();
                break;
            }
            case "KeyC": {
                break;
            }
            case "Digit1": {
                break;
            }
            case "Digit0": {
                break;
            }
            default: {
                console.log("Key : '", key.code, "' was pressed.");
                break;
            }
        }
    }
    onKeyup(key) {
        switch (key.code) {
            case "KeyW": {
                this.Wdown = false;
                break;
            }
            case "KeyA": {
                this.Adown = false;
                break;
            }
            case "KeyS": {
                this.Sdown = false;
                break;
            }
            case "KeyD": {
                this.Ddown = false;
                break;
            }
            case "Digit1": {
                window.clearInterval(this.run2);
                window.clearInterval(this.run3);
                var self = this;
                // 30 s = 24 hours
                this.run1 = setInterval(function () {
                    self.changeLight(self.thetaPerHour * 0.8 * 0.5);
                }, 500);
                break;
            }
            case "Digit2": {
                window.clearInterval(this.run1);
                window.clearInterval(this.run3);
                var self = this;
                // 1 min = 24 hours
                this.run2 = setInterval(function () {
                    self.changeLight(self.thetaPerHour * 0.4 * 0.5);
                }, 500);
                break;
            }
            case "Digit3": {
                window.clearInterval(this.run2);
                window.clearInterval(this.run1);
                var self = this;
                // 2 min = 24 hours
                this.run3 = setInterval(function () {
                    self.changeLight(self.thetaPerHour * 0.2 * 0.5);
                }, 500);
                break;
            }
            case "Digit0": {
                // reset, and no day-night cycle
                window.clearInterval(this.run1);
                window.clearInterval(this.run2);
                window.clearInterval(this.run3);
                this.animation.lightColor = new Vec3([1.0, 1.0, 1.0]);
                this.animation.ambientColor = new Vec3([0.1, 0.1, 0.1]);
                this.animation.angle = 7.0 * 2.0 * Math.PI / 8.0 + Math.PI / 18.0;
                this.animation.sunRadius = 1000 * Math.sqrt(2);
                this.animation.lightPosition = new Vec4([Math.sin(this.animation.angle) * this.animation.sunRadius,
                    Math.cos(this.animation.angle) * this.animation.sunRadius,
                    Math.sin(this.animation.angle) * this.animation.sunRadius,
                    1.0]);
                break;
            }
        }
    }
    /**
     * Registers all event listeners for the GUI
     * @param canvas The canvas being used
     */
    registerEventListeners(canvas) {
        /* Event listener for key controls */
        window.addEventListener("keydown", (key) => this.onKeydown(key));
        window.addEventListener("keyup", (key) => this.onKeyup(key));
        /* Event listener for mouse controls */
        canvas.addEventListener("mousedown", (mouse) => this.dragStart(mouse));
        canvas.addEventListener("mousemove", (mouse) => this.drag(mouse));
        canvas.addEventListener("mouseup", (mouse) => this.dragEnd(mouse));
        /* Event listener to stop the right click menu */
        canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    }
}
GUI.rotationSpeed = 0.01;
GUI.walkSpeed = 1;
GUI.rollSpeed = 0.1;
GUI.panSpeed = 0.1;
export { GUI };
//# sourceMappingURL=Gui.js.map