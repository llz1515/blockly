import {Renderer as BaseRenderer} from '../common/renderer.js';
import * as blockRendering from '../common/block_rendering.js';
import type {BlockSvg} from '../../block_svg.js';
import type {BlockStyle} from '../../theme.js';
import type {RenderInfo as BaseRenderInfo} from '../common/info.js';
import type {IPathObject} from '../common/i_path_object.js';
import {Drawer} from './drawer.js';
import {CanvasPathObject} from './path_object.js';
import {ConstantProvider} from './constants.js';

export class Renderer extends BaseRenderer{
    constructor(name: string) {
        super(name);
        console.log("Custom Canvas renderer initialized!");
    }

    /**
     * Create a new instance of the renderer's constant provider.
     */
    protected override makeConstants_(): ConstantProvider {
        return new ConstantProvider();
    }

    /**
     * Create a new instance of the renderer's drawer.
     */
    protected override makeDrawer_(
        block: BlockSvg,
        info: BaseRenderInfo,
    ): Drawer {
        return new Drawer(block, info);
    }    /**
     * Create a new Canvas-based path object instead of SVG.
     */
    override makePathObject(root: SVGElement, style: BlockStyle): IPathObject {
        return new CanvasPathObject(root, style, this.getConstants() as ConstantProvider);
    }
}

blockRendering.register('CustomRenderer', Renderer);