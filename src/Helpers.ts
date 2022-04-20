import { Object3D, Vector3 } from "three";

export class Helpers {
    static Vector3ToString(vec: THREE.Vector3) {
        return `(${vec.x}, ${vec.y}, ${vec.z} )`;
    }

    static Vector2ToString(vec: THREE.Vector2) {
        return `(${vec.x}, ${vec.y} )`;
    }

}

export class RaycastData {

    private _position: THREE.Vector3;
    private _faceNormal: THREE.Vector3;
    private _object3D: THREE.Object3D;
    private _uv: THREE.Vector2;

    constructor(object3D: THREE.Object3D, position: THREE.Vector3, faceNormal: THREE.Vector3, uv: THREE.Vector2) {
        this._object3D = object3D;
        this._position = position;
        this._faceNormal = faceNormal;
        this._uv = uv;
    }

    getUv(): THREE.Vector2 {
        return this._uv;
    }

    getPosition(): THREE.Vector3 {
        return this._position;
    }
    getFaceNormal(): THREE.Vector3 {
        return this._faceNormal;
    }

    getObject3D(): THREE.Object3D {
        return this._object3D;
    }
}