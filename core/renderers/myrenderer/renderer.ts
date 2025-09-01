import {Renderer as BaseRenderer} from '../common/renderer.js';
import * as blockRendering from '../common/block_rendering.js';

export class Renderer extends BaseRenderer{
    constructor(name: string) {
        super(name);

        console.warn("Custom renderer start!");
    }
}

blockRendering.register('myrenderer', Renderer);