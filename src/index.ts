import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import CarScene from './car_garage/CarScene'

import { WebGLRenderer } from 'three';
import GameSceneBase from './base/GameSceneBase';


function startCarScene() {
    const carScene: CarScene = new CarScene(new WebGLRenderer(), window);
    startGameScene(carScene);
}

async function startGameScene(gameScene: GameSceneBase) {
    await gameScene.startGameSceneAsync();
    console.log("Game loaded.");
}

startCarScene();

