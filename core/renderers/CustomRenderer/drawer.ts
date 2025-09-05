import type {BlockSvg} from '../../block_svg.js';
import {Drawer as BaseDrawer} from '../common/drawer.js';
import type {RenderInfo} from '../common/info.js';
import type {Row} from '../measurables/row.js';

/**
 * An object that draws a block using HTML5 Canvas instead of SVG
 */
export class Drawer extends BaseDrawer {
    /**
     * @param block The block to render.
     * @param info An object containing all information needed to render this block.
     */
    constructor(block: BlockSvg, info: RenderInfo) {
        super(block, info);
        console.log('Canvas-based CustomRenderer Drawer initialized!');
    }    /**
     * Override the main draw method to use Canvas rendering
     */
    override draw() {
        console.log('Drawing block with Canvas renderer...');
        
        // First, let the base class generate the paths
        this.drawOutline_();
        this.drawInternals_();
        this.updateConnectionHighlights();
        
        // Get the path object and ensure it's our canvas implementation
        const pathObject = this.block_.pathObject as any;
        
        if (pathObject && pathObject.renderToCanvas) {
            // Update canvas size based on block dimensions
            const blockWidth = this.info_.width;
            const blockHeight = this.info_.height;
            
            if (pathObject.updateSize) {
                pathObject.updateSize(blockWidth, blockHeight);
            }
            
            // 重要：先设置SVG路径以确保事件处理正确
            const fullPath = this.outlinePath_ + (this.inlinePath_ || '');
            if (pathObject.setPath) {
                pathObject.setPath(fullPath);
            }
            
            // Render the paths to canvas
            pathObject.renderToCanvas(this.outlinePath_, this.inlinePath_);
            
            // Render block text and labels if available
            this.renderBlockText(pathObject);
            
            console.log('Canvas paths rendered:', {
                width: blockWidth,
                height: blockHeight,
                outlineLength: this.outlinePath_?.length || 0,
                inlineLength: this.inlinePath_?.length || 0
            });
        }

        if (this.info_.RTL) {
            // Handle RTL flipping for canvas
            this.flipCanvasRTL();
        }
        
        this.recordSizeOnBlock_();
    }    /**
     * Render text labels and field content on the canvas
     * 
     * NOTE: Disabled to prevent duplicate text rendering.
     * Blockly's native Field system will handle text rendering through SVG.
     * The Canvas renderer only handles the block shapes, not the text content.
     */
    private renderBlockText(pathObject: any) {
        // Intentionally disabled to prevent text duplication
        // Blockly's Field objects will handle text rendering in SVG
        // The Canvas only renders the block shapes/paths
        return;
    }/**
     * Override drawOutline_ to add Canvas-specific optimizations
     */
    override drawOutline_() {
        // Call parent implementation to generate paths
        super.drawOutline_();
        
        // Add Canvas-specific path optimizations
        this.optimizePathsForCanvas();
    }

    /**
     * Override drawInternals_ to handle canvas-specific inline rendering
     */
    override drawInternals_() {
        // Call parent implementation first
        super.drawInternals_();
        
        // Add any Canvas-specific internal rendering logic
        this.handleCanvasInlineInputs();
    }

    /**
     * Optimize SVG paths for better Canvas rendering
     */
    private optimizePathsForCanvas() {
        if (this.outlinePath_) {
            // Remove redundant commands and simplify paths for Canvas
            this.outlinePath_ = this.simplifyPath(this.outlinePath_);
        }
        
        if (this.inlinePath_) {
            this.inlinePath_ = this.simplifyPath(this.inlinePath_);
        }
    }

    /**
     * Simplify SVG path for Canvas rendering
     */
    private simplifyPath(path: string): string {
        if (!path) return path;
        
        return path
            // Remove unnecessary spaces
            .replace(/\s+/g, ' ')
            // Combine consecutive moves
            .replace(/M\s*([^M]*)\s*M/g, 'M$1M')
            // Remove zero-length lines
            .replace(/[LlHhVv]\s*0\s*/g, '')
            .trim();
    }

    /**
     * Handle Canvas-specific inline input rendering
     */
    private handleCanvasInlineInputs() {
        // Process each row to handle inline inputs on Canvas
        for (const row of this.info_.rows) {
            if (row.hasExternalInput) {
                this.processCanvasValueInput(row);
            } else if (row.hasStatement) {
                this.processCanvasStatementInput(row);
            }
        }
    }

    /**
     * Process value inputs for Canvas rendering
     */
    private processCanvasValueInput(row: Row) {
        const input = row.getLastInput();
        if (!input) return;
        
        // Add Canvas-specific rendering hints for value inputs
        console.log('Processing Canvas value input:', input);
    }    /**
     * Process statement inputs for Canvas rendering
     */
    private processCanvasStatementInput(row: Row) {
        const input = row.getLastInput();
        if (!input) return;
        
        // Add Canvas-specific rendering hints for statement inputs
        console.log('Processing Canvas statement input:', input);
    }

    /**
     * Handle RTL flipping for canvas-based rendering
     */
    private flipCanvasRTL() {
        const pathObject = this.block_.pathObject as any;
        if (pathObject && pathObject.flipRTL) {
            pathObject.flipRTL();
        }
    }    /**
     * Advanced Canvas path rendering with improved SVG compatibility
     */
    private renderAdvancedCanvasPath(context: CanvasRenderingContext2D, path: string, fillStyle?: string, strokeStyle?: string) {
        if (!context || !path) return;

        context.save();
        context.beginPath();
        
        // Use the improved path parser from CanvasPathObject
        this.parseAdvancedSvgPath(path, context);
        
        // Apply enhanced styling
        if (fillStyle && fillStyle !== 'none') {
            context.fillStyle = fillStyle;
            context.fill();
        }
        
        if (strokeStyle && strokeStyle !== 'none') {
            context.strokeStyle = strokeStyle;
            context.lineWidth = 1.5; // Slightly thicker for better visibility
            context.stroke();
        }
        
        context.restore();
    }

    /**
     * Enhanced SVG path parser for Canvas with better Blockly compatibility
     */
    private parseAdvancedSvgPath(path: string, context: CanvasRenderingContext2D) {
        if (!path) return;
        
        // More robust command parsing
        const commands = this.tokenizeSvgPath(path);
        let currentX = 0;
        let currentY = 0;
        let subpathStartX = 0;
        let subpathStartY = 0;
        let lastControlX = 0;
        let lastControlY = 0;

        for (const command of commands) {
            this.executeCanvasCommand(command, context, {
                currentX,
                currentY,
                subpathStartX,
                subpathStartY,
                lastControlX,
                lastControlY
            });
        }
    }

    /**
     * Tokenize SVG path into command objects
     */
    private tokenizeSvgPath(path: string): Array<{type: string, params: number[]}> {
        const commands: Array<{type: string, params: number[]}> = [];
        const matches = path.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
        
        for (const match of matches) {
            const type = match[0];
            const paramString = match.slice(1).trim();
            const params = this.parsePathParameters(paramString);
            commands.push({type, params});
        }
        
        return commands;
    }

    /**
     * Parse path parameters with better number handling
     */
    private parsePathParameters(paramString: string): number[] {
        if (!paramString.trim()) return [];
        
        return paramString
            .replace(/,/g, ' ')
            .replace(/([+-])/g, ' $1')
            .replace(/([eE])([+-])/g, '$1$2') // Handle scientific notation
            .split(/\s+/)
            .filter(s => s && s !== '+' && s !== '-')
            .map(s => {
                const num = parseFloat(s);
                return isNaN(num) ? 0 : num;
            });
    }

    /**
     * Execute a single Canvas command
     */
    private executeCanvasCommand(
        command: {type: string, params: number[]}, 
        context: CanvasRenderingContext2D,
        state: any
    ) {
        const {type, params} = command;
        
        switch (type) {
            case 'M': // Move to (absolute)
                if (params.length >= 2) {
                    state.currentX = params[0];
                    state.currentY = params[1];
                    state.subpathStartX = state.currentX;
                    state.subpathStartY = state.currentY;
                    context.moveTo(state.currentX, state.currentY);
                }
                break;
                
            case 'm': // Move to (relative)
                if (params.length >= 2) {
                    state.currentX += params[0];
                    state.currentY += params[1];
                    state.subpathStartX = state.currentX;
                    state.subpathStartY = state.currentY;
                    context.moveTo(state.currentX, state.currentY);
                }
                break;
                
            case 'L': // Line to (absolute)
                for (let i = 0; i < params.length; i += 2) {
                    if (i + 1 < params.length) {
                        state.currentX = params[i];
                        state.currentY = params[i + 1];
                        context.lineTo(state.currentX, state.currentY);
                    }
                }
                break;
                
            case 'l': // Line to (relative)
                for (let i = 0; i < params.length; i += 2) {
                    if (i + 1 < params.length) {
                        state.currentX += params[i];
                        state.currentY += params[i + 1];
                        context.lineTo(state.currentX, state.currentY);
                    }
                }
                break;
                
            case 'H': // Horizontal line (absolute)
                for (const x of params) {
                    state.currentX = x;
                    context.lineTo(state.currentX, state.currentY);
                }
                break;
                
            case 'h': // Horizontal line (relative)
                for (const dx of params) {
                    state.currentX += dx;
                    context.lineTo(state.currentX, state.currentY);
                }
                break;
                
            case 'V': // Vertical line (absolute)
                for (const y of params) {
                    state.currentY = y;
                    context.lineTo(state.currentX, state.currentY);
                }
                break;
                
            case 'v': // Vertical line (relative)
                for (const dy of params) {
                    state.currentY += dy;
                    context.lineTo(state.currentX, state.currentY);
                }
                break;
                
            case 'C': // Cubic Bezier (absolute)
                for (let i = 0; i < params.length; i += 6) {
                    if (i + 5 < params.length) {
                        const cp1x = params[i];
                        const cp1y = params[i + 1];
                        const cp2x = params[i + 2];
                        const cp2y = params[i + 3];
                        state.currentX = params[i + 4];
                        state.currentY = params[i + 5];
                        
                        context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, state.currentX, state.currentY);
                        state.lastControlX = cp2x;
                        state.lastControlY = cp2y;
                    }
                }
                break;
                
            case 'c': // Cubic Bezier (relative)
                for (let i = 0; i < params.length; i += 6) {
                    if (i + 5 < params.length) {
                        const cp1x = state.currentX + params[i];
                        const cp1y = state.currentY + params[i + 1];
                        const cp2x = state.currentX + params[i + 2];
                        const cp2y = state.currentY + params[i + 3];
                        state.currentX += params[i + 4];
                        state.currentY += params[i + 5];
                        
                        context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, state.currentX, state.currentY);
                        state.lastControlX = cp2x;
                        state.lastControlY = cp2y;
                    }
                }
                break;
                
            case 'Q': // Quadratic Bezier (absolute)
                for (let i = 0; i < params.length; i += 4) {
                    if (i + 3 < params.length) {
                        const cpx = params[i];
                        const cpy = params[i + 1];
                        state.currentX = params[i + 2];
                        state.currentY = params[i + 3];
                        
                        context.quadraticCurveTo(cpx, cpy, state.currentX, state.currentY);
                        state.lastControlX = cpx;
                        state.lastControlY = cpy;
                    }
                }
                break;
                
            case 'q': // Quadratic Bezier (relative)
                for (let i = 0; i < params.length; i += 4) {
                    if (i + 3 < params.length) {
                        const cpx = state.currentX + params[i];
                        const cpy = state.currentY + params[i + 1];
                        state.currentX += params[i + 2];
                        state.currentY += params[i + 3];
                        
                        context.quadraticCurveTo(cpx, cpy, state.currentX, state.currentY);
                        state.lastControlX = cpx;
                        state.lastControlY = cpy;
                    }
                }
                break;
                
            case 'A': // Arc (absolute) - improved implementation
            case 'a': // Arc (relative)
                this.drawCanvasArc(context, params, type === 'a', state);
                break;
                
            case 'Z':
            case 'z': // Close path
                context.closePath();
                state.currentX = state.subpathStartX;
                state.currentY = state.subpathStartY;
                break;
        }
    }

    /**
     * Improved arc drawing for Canvas
     */
    private drawCanvasArc(context: CanvasRenderingContext2D, params: number[], relative: boolean, state: any) {
        if (params.length < 7) return;
        
        const rx = Math.abs(params[0]);
        const ry = Math.abs(params[1]);
        const xAxisRotation = params[2] * Math.PI / 180;
        const largeArcFlag = params[3];
        const sweepFlag = params[4];
        const endX = relative ? state.currentX + params[5] : params[5];
        const endY = relative ? state.currentY + params[6] : params[6];
        
        // For now, use a simplified arc implementation
        // A full implementation would require complex arc-to-bezier conversion
        const centerX = (state.currentX + endX) / 2;
        const centerY = (state.currentY + endY) / 2;
        const radius = Math.sqrt(Math.pow(endX - state.currentX, 2) + Math.pow(endY - state.currentY, 2)) / 2;
        
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        
        state.currentX = endX;
        state.currentY = endY;
    }
}
