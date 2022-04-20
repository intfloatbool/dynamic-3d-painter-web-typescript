import * as THREE from 'three';
import { Vector2 } from 'three';

export default abstract class GameSceneBase {
    protected _renderer: THREE.Renderer;
    protected _scene: THREE.Scene;
    protected _clock: THREE.Clock;
    protected _window: Window;
    protected _mainCamera: THREE.PerspectiveCamera;

    protected MainCameraFov = 75;
    protected MainCameraNearClipPlane = 0.1;
    protected MainCameraFarClipPlane = 1000;
    
    protected _boundRenderFunction: () => void;
    protected _onWindowResizeEvFunction: (ev: any) => void;
    protected _onDomContentLoaded: () => void;

    protected _renderWindowSizeFactor: Vector2;

    constructor(renderer: THREE.Renderer, window: Window) {
        this._renderWindowSizeFactor = new Vector2(1, 1);
        this.setupRenderWindowSizeFactor();
        this._renderer = renderer;
        this._scene = new THREE.Scene();
        this._clock = new THREE.Clock();
        this._window = window;
        
        this._renderer.setSize(this._window.innerWidth * this._renderWindowSizeFactor.x, this._window.innerHeight * this._renderWindowSizeFactor.y);
        
        this._mainCamera = new THREE.PerspectiveCamera( this.MainCameraFov, (this._window.innerWidth * this._renderWindowSizeFactor.x) / (this._window.innerHeight * this._renderWindowSizeFactor.y), this.MainCameraNearClipPlane, this.MainCameraFarClipPlane ); 

        this._boundRenderFunction = this.startGameLoop.bind(this);
        this._onWindowResizeEvFunction = this.onWindowResize.bind(this);
        this._onDomContentLoaded = this.onContentLoaded.bind(this);

        document.addEventListener("DOMContentLoaded", this._onDomContentLoaded);
    }

    setupRenderWindowSizeFactor() {
        this._renderWindowSizeFactor = new Vector2(1, 1);
    }

    onContentLoaded() {
        console.log("Document loaded!");
    }


    async startGameSceneAsync() {
        await this.initSceneAsync();
        this.startGameLoop();
    }

    async initSceneAsync() {
        this._window.addEventListener('resize', this._onWindowResizeEvFunction, false);
    }

    onWindowResize() {
        this._mainCamera.aspect = (this._window.innerWidth * this._renderWindowSizeFactor.x) / (this._window.innerHeight * this._renderWindowSizeFactor.y);
        this._mainCamera.updateProjectionMatrix();

        this._renderer.setSize(this._window.innerWidth * this._renderWindowSizeFactor.x, this._window.innerHeight * this._renderWindowSizeFactor.y);
    }


    startGameLoop() {
        requestAnimationFrame(this._boundRenderFunction);
        const deltaTime = this._clock.getDelta();
        this.onGameLoop(deltaTime);
        this._renderer.render(this._scene, this._mainCamera);
    }

    onGameLoop(deltaTime: number) {

    }
}