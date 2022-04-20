import GameSceneBase from "../base/GameSceneBase";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { BufferGeometry, DataTexture, InterleavedBufferAttribute, Material, RGBA_ASTC_5x4_Format, Texture, TextureLoader, Vector2 } from "three";
import * as THREE from 'three';
import { Helpers, RaycastData} from "../Helpers";
import  ColorPicker  from "simple-color-picker";

export default class CarScene extends GameSceneBase {

    private readonly carTextureUrl = 'assets/car_garage/audi_r8/car_texture_test.png';
    private _orbitControls: OrbitControls;
    private _fbxLoader: FBXLoader;
    private _textureLoader: TextureLoader;

    private _carMesh: THREE.Mesh;
    private _raycaster: THREE.Raycaster;
    private _currentMousePosition: THREE.Vector2;
    private _carMeshName: string = "Body_Plane001";

    private _carTexture: THREE.Texture | undefined;
    private _currentBrushDataTexture: THREE.DataTexture | undefined;
    private _currentCarUvPosition: THREE.Vector2;

    private _brushSize: THREE.Vector2;

    private _boundedOnMouseMoveFunc: (ev: any) => void;

    private _isCarWasRaycasted: boolean;
    private _isMouseDown: boolean;
    private _colorPickerUi: ColorPicker | undefined;
    private _orbitControlsRotationSpeed: number;
    private _delayToDraw: number;
    private _brushSizeInputElement: HTMLInputElement | undefined;
    private _isDrawActive: boolean;
    private _enableDrawButtonElement: HTMLElement | undefined;

    constructor(renderer: THREE.Renderer, window: Window) {
        super(renderer, window);

        this._fbxLoader = new FBXLoader();
        this._orbitControls = new OrbitControls(this._mainCamera, this._renderer.domElement);
        this._textureLoader = new TextureLoader();

        this._carMesh = null as any;
        this._raycaster = null as any;
        this._currentMousePosition = new Vector2(0, 0);
        this._currentCarUvPosition = new Vector2();
        this._boundedOnMouseMoveFunc = this.onMouseMove.bind(this);

        this._brushSize = new Vector2();

        this._isMouseDown = false;
        this._isCarWasRaycasted = false;
        this._renderer.domElement.addEventListener("pointerdown", (ev) => {
            const btnCode = ev.button;
            if(btnCode === 0) {

                if(this._orbitControls.autoRotate === true) {
                    this._orbitControls.autoRotate = false;
                }

                this._isMouseDown = true;
            }
        });

        this._renderer.domElement.addEventListener("pointerup", (ev) => {
            const btnCode = ev.button;
            if(btnCode === 0) {
                this._isMouseDown = false;
            }
        });

        this._orbitControlsRotationSpeed = 0.8;

        this._orbitControls.rotateSpeed = this._orbitControlsRotationSpeed;

        this._delayToDraw = 2;

        this._isDrawActive = true;
        
    }

    onContentLoaded(): void {
        this.initUi();
    }

    setupRenderWindowSizeFactor() {
        this._renderWindowSizeFactor = new Vector2(1, 0.8);
    }

    initUi() {
        
        this._colorPickerUi = new ColorPicker({
            color: '#FF0000',
            background: '#454545',
            el: document.body,
            width: 100,
            height: 100,
            window: this._window
        });
        
        const bottomUi = document.getElementById('ui_bottom') as HTMLElement;
        const colorPickDiv = document.createElement("div");
        colorPickDiv.className = "p-2";
        bottomUi.appendChild(colorPickDiv);
        this._colorPickerUi.appendTo(colorPickDiv);
        
        this._colorPickerUi.$el.style.width = "110px";

        const brushSizeElement = document.createElement("div");
        bottomUi.appendChild(brushSizeElement);
        brushSizeElement.className = "p-2";

        const brushLabel = document.createElement("label");
        brushSizeElement.appendChild(brushLabel);
        brushLabel.setAttribute("for", "brush-range");
        brushLabel.setAttribute("class", "form-label");
        brushLabel.innerHTML = "<h4>Brush size</h4>";

        this._brushSizeInputElement = document.createElement("input");
        brushSizeElement.appendChild(this._brushSizeInputElement);
        this._brushSizeInputElement.setAttribute("type", "range");
        this._brushSizeInputElement.setAttribute("class", "form-range");
        this._brushSizeInputElement.setAttribute("id", "brush-range");
        this._brushSizeInputElement.setAttribute("min", "2");
        this._brushSizeInputElement.setAttribute("max", "64");
        this._brushSizeInputElement.value = "4";
        this._brushSizeInputElement.onchange = this.onSizeInputChanged.bind(this);
        

        const brushActiveContainer = document.createElement("div");
        brushActiveContainer.className = "p-2";
        this._enableDrawButtonElement = document.createElement("button");
        bottomUi.appendChild(brushActiveContainer);
        brushActiveContainer.appendChild(this._enableDrawButtonElement);
        this._enableDrawButtonElement.setAttribute("class", "btn btn-primary");
        this._enableDrawButtonElement.innerHTML = "<h4>DISABLE DRAW</h4>";
        this._enableDrawButtonElement.style.marginTop = "10%";
        this._enableDrawButtonElement.onclick = this.onActiveDrawButtonClicked.bind(this);

        // TODO: Clear button
        const clearButtonContainer = document.createElement("div");
        clearButtonContainer.className = "p-2";
        const clearButton = document.createElement("button");
        bottomUi.appendChild(clearButtonContainer);
        clearButtonContainer.appendChild(clearButton);

        clearButton.setAttribute("class", "btn btn-warning");
        clearButton.style.marginTop = "20%";
        clearButton.innerHTML = "<h4>CLEAR</h4>";

        clearButton.onclick = this.onClearButtonClick.bind(this);
    }

    onClearButtonClick(ev: Event) {
        this.loadCarTextureAsync().then((defaultTexture) => {

            const carMaterial = new THREE.MeshBasicMaterial( 
                {
                    map: defaultTexture
                }    
            );

            this._carMesh.material = carMaterial;
        });
    }

    onActiveDrawButtonClicked(ev: Event) {
        this._isDrawActive = !this._isDrawActive;
        if(this._enableDrawButtonElement) {
            const msg = this._isDrawActive ? "DISABLE DRAW" : "ENABLE DRAW";
            this._enableDrawButtonElement.innerHTML = `<h4>${msg}</h4>`;
        }
    }

    onSizeInputChanged(ev: Event) {
        let size = 1488;
        if(this._brushSizeInputElement)
            size = Number.parseInt(this._brushSizeInputElement.value);
        this.updateBrushSize(new Vector2(size, size));
    }

    onGameLoop(deltaTime: number): void {
    
        // raycasts from mouse      
        this._raycaster.setFromCamera( this._currentMousePosition, this._mainCamera );
        const raycastedObjects = this._raycaster.intersectObjects( this._scene.children );
        this._isCarWasRaycasted = false;

        const isCanDraw = this._clock.elapsedTime > this._delayToDraw && this._isDrawActive;
        if(isCanDraw) {
            if(this._isMouseDown === true) {
                this.handleRaycastedObjects(raycastedObjects);
            }
        }

        const changeSpeed = 25;
        const orbitRotationSpeed = this._isCarWasRaycasted === false ? this._orbitControlsRotationSpeed : 0;
        this._orbitControls.rotateSpeed = THREE.MathUtils.lerp(this._orbitControls.rotateSpeed , orbitRotationSpeed, changeSpeed * deltaTime);
        
        this._orbitControls.update();
        
    }


    handleRaycastedObjects(raycastedObjects: any[]) {
        for(let i = 0; i < raycastedObjects.length; i++) {
            const raycastedObject = raycastedObjects[i].object as THREE.Object3D;
            if(raycastedObject) {
                const raycastData = new RaycastData(
                    raycastedObject,
                    raycastedObjects[i].point,
                    raycastedObjects[i].face.normal,
                    raycastedObjects[i].uv
                );
                this.handleSingleRaycastedObject(raycastData);
            }

        }
    }

    handleSingleRaycastedObject(data: RaycastData) {
        if(data.getObject3D())
        {
            if(data.getObject3D().name === this._carMeshName)
            {
                this.onCarObjectRaycasted(data);               
            }
        }
    }

    onCarObjectRaycasted(data: RaycastData) {
        const webGlRenderer = this._renderer as THREE.WebGLRenderer;
        if(webGlRenderer) {
            const dataTexture = this._currentBrushDataTexture as DataTexture;
            const currentCarTexture = this._carTexture as Texture;

            const uv = data.getUv();

            const carTextureWidth = 1024;
            const carTextureHeight = 1024;


            let coordX = (carTextureWidth * uv.x) - this._brushSize.x / 2;
            let coordY = (carTextureHeight * uv.y) - this._brushSize.y / 2;

            coordX = THREE.MathUtils.clamp(coordX, 0, carTextureWidth - this._brushSize.x / 2);
            coordY = THREE.MathUtils.clamp(coordY, 0, carTextureHeight - this._brushSize.y / 2);

            this._currentCarUvPosition.set(
                coordX,
                coordY
                );
            

            this.updateCarDataTexture(dataTexture);
            
            webGlRenderer.copyTextureToTexture(this._currentCarUvPosition, dataTexture, currentCarTexture);
            
        }

        this._isCarWasRaycasted = true;

    }

    updateCarDataTexture(dataTexture: DataTexture) {
        const size = dataTexture.image.width * dataTexture.image.height;
        const data = dataTexture.image.data;

        // generate a random color and update texture data
        const color = new THREE.Color(0.0, 0.0, 0.0);
        if(this._colorPickerUi) {
            const rgb = this._colorPickerUi.color.rgb;
            color.r = rgb.r;
            color.g = rgb.g;
            color.b = rgb.b;
        }
        const r = Math.floor( color.r * 255 );
        const g = Math.floor( color.g * 255 );
        const b = Math.floor( color.b * 255 );

        for ( let i = 0; i < size; i ++ ) {

            const stride = i * 4;

            data[ stride ] = r;
            data[ stride + 1 ] = g;
            data[ stride + 2 ] = b;
            data[ stride + 3 ] = 1;

        }
    }


    onMouseMove(ev: any) {
        //normalize to Normalized Device Coordinates (opengl)
        this._currentMousePosition.x = ( ev.clientX  / (this._window.innerWidth * this._renderWindowSizeFactor.x) ) * 2 - 1;
        this._currentMousePosition.y = - ( ev.clientY / (this._window.innerHeight * this._renderWindowSizeFactor.y) ) * 2 + 1;
    }


    async loadCarTextureAsync() {
        const carTexture = await this._textureLoader.loadAsync(this.carTextureUrl);
        this._carTexture = carTexture;    
        carTexture.mapping = THREE.UVMapping;
        carTexture.wrapS = THREE.RepeatWrapping;    
        carTexture.wrapT = THREE.RepeatWrapping;    

        return carTexture;
    }

    async initSceneAsync(): Promise<void> {
        
        try {

            await super.initSceneAsync();

            document.addEventListener('mousemove', this._boundedOnMouseMoveFunc);

            document.body.appendChild(this._renderer.domElement);
            this._mainCamera.position.set(0, 3, 10);
            this._orbitControls.autoRotate = true;
            this._orbitControls.update();

            const carModelUrl = 'assets/car_garage/audi_r8/audi_r8_baked_reduced.fbx';

            const carTexture = await this.loadCarTextureAsync();

            const carModel: THREE.Group = await this.loadModelAync(carModelUrl) as THREE.Group;


            const carMaterial = new THREE.MeshBasicMaterial(
                {
                    map: carTexture
                }
            );

            const carObj = carModel;

            carModel.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                    child.material = carMaterial;
                }
            });

            this._scene.add(carObj);
            carObj.name = "audi_car";
            this._carMesh = carObj.children[0] as THREE.Mesh;

            if (!this._carMesh) {
                console.error("Cannot fetch car mesh from carModel!");
            }
            carObj.scale.set(0.025, 0.025, 0.025);

            const currentTextureGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);
            const currentTextureMaterial = new THREE.MeshBasicMaterial(
                { map: carTexture }
            )
            const currentTextureObj = new THREE.Mesh(currentTextureGeometry, currentTextureMaterial);

            this._scene.add(currentTextureObj);
            currentTextureObj.position.set(0, 6, -10);

            // enable debug only
            currentTextureObj.visible = false;


            const skyboxTextures = {
                front: this._textureLoader.load("assets/blue_clouds_skybox/bluecloud_ft.jpg"),
                back: this._textureLoader.load("assets/blue_clouds_skybox/bluecloud_bk.jpg"),
                up: this._textureLoader.load("assets/blue_clouds_skybox/bluecloud_up.jpg"),
                down: this._textureLoader.load("assets/blue_clouds_skybox/bluecloud_dn.jpg"),
                right: this._textureLoader.load("assets/blue_clouds_skybox/bluecloud_rt.jpg"),
                left: this._textureLoader.load("assets/blue_clouds_skybox/bluecloud_lf.jpg"),
            }

            const skyboxMaterialsArray: Array<THREE.MeshBasicMaterial> = [
                new THREE.MeshBasicMaterial({ map: skyboxTextures.front, side: THREE.BackSide }),
                new THREE.MeshBasicMaterial({ map: skyboxTextures.back, side: THREE.BackSide }),
                new THREE.MeshBasicMaterial({ map: skyboxTextures.up, side: THREE.BackSide }),
                new THREE.MeshBasicMaterial({ map: skyboxTextures.down, side: THREE.BackSide }),
                new THREE.MeshBasicMaterial({ map: skyboxTextures.right, side: THREE.BackSide }),
                new THREE.MeshBasicMaterial({ map: skyboxTextures.left, side: THREE.BackSide }),
            ]

            const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
            const skyboxObj = new THREE.Mesh(skyboxGeometry, skyboxMaterialsArray);
            this._scene.add(skyboxObj);


            const floorGeometry = new THREE.BoxGeometry(20, 1, 20);
            const floorObj = new THREE.Mesh(floorGeometry,
                new THREE.MeshBasicMaterial({
                    map: this._textureLoader.load("assets/car_garage/audi_r8/floor_texture.jpg")
                })
            );
            floorObj.name = "floor";

            floorObj.position.set(0, -0.51, 0);
            this._scene.add(floorObj);

            this._raycaster = new THREE.Raycaster();

            this.updateBrushSize(new Vector2(4, 4));
        } catch (err) {
            console.error("ERROR! " + err);
        }
    }

    updateBrushSize(size: Vector2) {
        const brushWidth = size.x;
        const brushHeight = size.y;
        this._brushSize.set(brushWidth, brushHeight);
        const textureData = new Uint8Array(brushWidth * brushHeight * 4);

        this._currentBrushDataTexture = new THREE.DataTexture(textureData, brushWidth, brushHeight);
    }

    async loadModelAync(url: string) {

        try {
            const modelObject = await this._fbxLoader.loadAsync(url);
            if(modelObject instanceof THREE.Group) {
                return modelObject as THREE.Group;
            }
            else {
                console.error("Incorrect return type loading of: " + url);
            }
            console.log("Load has been succefull!")
            return new THREE.Group();
        }
        catch(err)
        {
            console.error('Load model error! : ' + err);
        }
    }
}