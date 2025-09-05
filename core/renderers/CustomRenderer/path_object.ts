import type {BlockSvg} from '../../block_svg.js';
import type {Connection} from '../../connection.js';
import {RenderedConnection} from '../../rendered_connection.js';
import type {BlockStyle} from '../../theme.js';
import {Coordinate} from '../../utils/coordinate.js';
import * as dom from '../../utils/dom.js';
import {Svg} from '../../utils/svg.js';
import type {ConstantProvider} from '../common/constants.js';
import type {IPathObject} from '../common/i_path_object.js';

/**
 * An object that handles creating and managing Canvas-based rendering
 * instead of SVG elements.
 */
export class CanvasPathObject implements IPathObject {    svgRoot: SVGElement;
    svgPath: SVGElement;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    constants: ConstantProvider;
    style: BlockStyle;
    
    private foreignObject!: SVGForeignObjectElement;
    private pixelRatio: number;
    private canvasWidth: number = 200;
    private canvasHeight: number = 100;
    
    // Store last rendered paths for re-rendering during state updates
    private lastOutlinePath: string = '';
    private lastInlinePath: string = '';
    
    /** Highlight paths associated with connections. */
    private connectionHighlights = new WeakMap<RenderedConnection, SVGElement>();
    
    /** Locations of connection highlights. */
    private highlightOffsets = new WeakMap<RenderedConnection, Coordinate>();

    /**
     * @param root The root SVG element (kept for compatibility).
     * @param style The style object to use for colouring.
     * @param constants The renderer's constants.
     */
    constructor(
        root: SVGElement,
        style: BlockStyle,
        constants: ConstantProvider,
    ) {
        this.constants = constants;
        this.style = style;
        this.svgRoot = root;
        this.pixelRatio = window.devicePixelRatio || 1;        // Create a hidden SVG path for compatibility and event handling
        this.svgPath = dom.createSvgElement(
            Svg.PATH,
            {
                'class': 'blocklyPath',
                'style': 'opacity: 0; fill: transparent; stroke: transparent; pointer-events: auto;'
            },
            this.svgRoot,
        );// Create high-DPI Canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'blocklyCanvasPath';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        // 关键修复：禁用Canvas的指针事件，让SVG处理所有鼠标交互
        this.canvas.style.pointerEvents = 'none';
        
        // Initialize canvas with proper DPI scaling
        this.setupCanvas();
        
        this.context = this.canvas.getContext('2d')!;
        
        // Setup high quality rendering
        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = 'high';

        // Create container and append canvas
        this.createCanvasContainer();
        
        // 确保Canvas不会干扰事件处理
        this.setupEventHandling();
        
        this.setClass_('blocklyBlock', true);

        console.log('CanvasPathObject created with high-quality canvas rendering');
    }    /**
     * Create a foreignObject container for the canvas within SVG
     */
    private createCanvasContainer() {
        // Create a foreignObject to contain the canvas within SVG
        this.foreignObject = dom.createSvgElement(
            'foreignObject' as any,
            {
                'width': this.canvasWidth + 'px',
                'height': this.canvasHeight + 'px',
                'x': '0',
                'y': '0',
                // 确保foreignObject也不会干扰事件
                'pointer-events': 'none'
            },
            this.svgRoot
        ) as SVGForeignObjectElement;

        this.foreignObject.appendChild(this.canvas);
    }    /**
     * Setup proper event handling to prevent Canvas interference with Blockly events
     */
    private setupEventHandling() {
        // 确保Canvas完全透明化事件处理
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.userSelect = 'none';
        this.canvas.style.touchAction = 'none';
        
        // 如果foreignObject已创建，也设置其事件属性
        if (this.foreignObject) {
            this.foreignObject.style.pointerEvents = 'none';
            // 确保foreignObject不会阻止点击事件传播
            this.foreignObject.style.userSelect = 'none';
            this.foreignObject.style.touchAction = 'none';
        }
        
        // 确保隐藏的SVG路径能够接收事件
        if (this.svgPath) {
            this.svgPath.style.pointerEvents = 'auto';
            this.svgPath.style.display = 'block';
            this.svgPath.style.opacity = '0';
            this.svgPath.style.fill = 'transparent';
            this.svgPath.style.stroke = 'transparent';
            // 确保SVG路径在Canvas之上以便接收事件
            this.svgPath.style.zIndex = '10';
        }
        
        // 确保Canvas在最底层，不影响事件处理
        this.canvas.style.zIndex = '1';
        if (this.foreignObject) {
            (this.foreignObject as any).style.zIndex = '1';
        }
    }

    /**
     * Setup canvas with proper DPI scaling to avoid blurriness
     */
    private setupCanvas() {
        // Set actual canvas size with pixel ratio scaling
        this.canvas.width = this.canvasWidth * this.pixelRatio;
        this.canvas.height = this.canvasHeight * this.pixelRatio;
        
        // Set display size (CSS pixels)
        this.canvas.style.width = this.canvasWidth + 'px';
        this.canvas.style.height = this.canvasHeight + 'px';
    }    /**
     * Render the paths to canvas instead of setting SVG path
     */
    renderToCanvas(outlinePath: string, inlinePath: string) {
        if (!this.context) return;

        // Store paths for later re-rendering during state updates
        this.lastOutlinePath = outlinePath || '';
        this.lastInlinePath = inlinePath || '';

        // 首先更新SVG路径以确保事件处理正确
        if (outlinePath) {
            this.setPath(outlinePath);
        }

        // Setup the rendering context with proper scaling
        this.context.save();
        
        // 确保清除时使用正确的坐标系统
        this.context.setTransform(1, 0, 0, 1, 0, 0); // 重置变换矩阵
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // 使用实际画布尺寸
        
        // 重新应用DPI缩放
        this.context.scale(this.pixelRatio, this.pixelRatio);

        // Set up high-quality canvas properties
        this.context.lineWidth = 1;
        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';
        this.context.imageSmoothingEnabled = true;

        // Draw outline path first (main block shape)
        if (outlinePath) {
            this.context.beginPath();
            this.parseSvgPath(outlinePath);
            this.context.fillStyle = this.style.colourPrimary || '#fff';
            this.context.fill();
            this.context.strokeStyle = this.style.colourTertiary || '#000';
            this.context.lineWidth = 1;
            this.context.stroke();
        }

        // Draw inline path (if any)
        if (inlinePath) {
            this.context.beginPath();
            this.parseSvgPath(inlinePath);
            this.context.strokeStyle = this.style.colourTertiary || '#000';
            this.context.lineWidth = 1;
            this.context.stroke();
        }
        
        this.context.restore();
        
        console.log('Canvas rendered with paths:', { outlinePath: outlinePath?.substring(0, 50), inlinePath: inlinePath?.substring(0, 50) });
    }/**
     * Draw a single path on the canvas
     */
    private drawPath(path: string, fillStyle: string, strokeStyle: string) {
        if (!this.context || !path) return;

        this.context.beginPath();
        
        // Parse and execute SVG path commands
        this.parseSvgPath(path);
        
        // Apply styles and draw
        if (fillStyle && fillStyle !== 'none') {
            this.context.fillStyle = fillStyle;
            this.context.fill();
        }
        
        if (strokeStyle && strokeStyle !== 'none') {
            this.context.strokeStyle = strokeStyle;
            this.context.lineWidth = 1;
            this.context.stroke();
        }
    }    /**
     * Draw text labels on the canvas (for block text content)
     * 
     * NOTE: This method is disabled to prevent duplicate text rendering.
     * Blockly's native Field system handles text rendering through SVG,
     * while Canvas only handles the block shapes.
     */
    private drawText(text: string, x: number, y: number) {
        // Intentionally disabled - text is handled by Blockly's Field system in SVG
        return;
    }
    /**
     * Parse SVG path string and execute equivalent Canvas commands with improved precision
     */
    private parseSvgPath(path: string) {
        if (!path) return;
        
        // More robust regex for SVG path commands
        const commands = path.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
        let currentX = 0;
        let currentY = 0;
        let subpathStartX = 0;
        let subpathStartY = 0;
        let lastControlX = 0;
        let lastControlY = 0;

        for (const cmd of commands) {
            const type = cmd[0];
            const params = this.parsePathParams(cmd.slice(1));

            switch (type) {
                case 'M': // Move to (absolute)
                    if (params.length >= 2) {
                        currentX = params[0];
                        currentY = params[1];
                        subpathStartX = currentX;
                        subpathStartY = currentY;
                        this.context.moveTo(currentX, currentY);
                        
                        // Handle multiple coordinate pairs as line-to commands
                        for (let i = 2; i < params.length; i += 2) {
                            if (i + 1 < params.length) {
                                currentX = params[i];
                                currentY = params[i + 1];
                                this.context.lineTo(currentX, currentY);
                            }
                        }
                    }
                    break;
                
                case 'm': // Move to (relative)
                    if (params.length >= 2) {
                        currentX += params[0];
                        currentY += params[1];
                        subpathStartX = currentX;
                        subpathStartY = currentY;
                        this.context.moveTo(currentX, currentY);
                        
                        // Handle multiple coordinate pairs as line-to commands
                        for (let i = 2; i < params.length; i += 2) {
                            if (i + 1 < params.length) {
                                currentX += params[i];
                                currentY += params[i + 1];
                                this.context.lineTo(currentX, currentY);
                            }
                        }
                    }
                    break;
                
                case 'L': // Line to (absolute)
                    for (let i = 0; i < params.length; i += 2) {
                        if (i + 1 < params.length) {
                            currentX = params[i];
                            currentY = params[i + 1];
                            this.context.lineTo(currentX, currentY);
                        }
                    }
                    break;
                
                case 'l': // Line to (relative)
                    for (let i = 0; i < params.length; i += 2) {
                        if (i + 1 < params.length) {
                            currentX += params[i];
                            currentY += params[i + 1];
                            this.context.lineTo(currentX, currentY);
                        }
                    }
                    break;
                
                case 'H': // Horizontal line (absolute)
                    for (const x of params) {
                        currentX = x;
                        this.context.lineTo(currentX, currentY);
                    }
                    break;
                
                case 'h': // Horizontal line (relative)
                    for (const dx of params) {
                        currentX += dx;
                        this.context.lineTo(currentX, currentY);
                    }
                    break;
                
                case 'V': // Vertical line (absolute)
                    for (const y of params) {
                        currentY = y;
                        this.context.lineTo(currentX, currentY);
                    }
                    break;
                
                case 'v': // Vertical line (relative)
                    for (const dy of params) {
                        currentY += dy;
                        this.context.lineTo(currentX, currentY);
                    }
                    break;
                
                case 'C': // Cubic Bezier (absolute)
                    for (let i = 0; i < params.length; i += 6) {
                        if (i + 5 < params.length) {
                            const cp1x = params[i];
                            const cp1y = params[i + 1];
                            const cp2x = params[i + 2];
                            const cp2y = params[i + 3];
                            currentX = params[i + 4];
                            currentY = params[i + 5];
                            
                            this.context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentX, currentY);
                            lastControlX = cp2x;
                            lastControlY = cp2y;
                        }
                    }
                    break;
                
                case 'c': // Cubic Bezier (relative)
                    for (let i = 0; i < params.length; i += 6) {
                        if (i + 5 < params.length) {
                            const cp1x = currentX + params[i];
                            const cp1y = currentY + params[i + 1];
                            const cp2x = currentX + params[i + 2];
                            const cp2y = currentY + params[i + 3];
                            currentX += params[i + 4];
                            currentY += params[i + 5];
                            
                            this.context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentX, currentY);
                            lastControlX = cp2x;
                            lastControlY = cp2y;
                        }
                    }
                    break;
                
                case 'S': // Smooth cubic Bezier (absolute)
                    for (let i = 0; i < params.length; i += 4) {
                        if (i + 3 < params.length) {
                            // Reflect the last control point
                            const cp1x = 2 * currentX - lastControlX;
                            const cp1y = 2 * currentY - lastControlY;
                            const cp2x = params[i];
                            const cp2y = params[i + 1];
                            currentX = params[i + 2];
                            currentY = params[i + 3];
                            
                            this.context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentX, currentY);
                            lastControlX = cp2x;
                            lastControlY = cp2y;
                        }
                    }
                    break;
                
                case 's': // Smooth cubic Bezier (relative)
                    for (let i = 0; i < params.length; i += 4) {
                        if (i + 3 < params.length) {
                            // Reflect the last control point
                            const cp1x = 2 * currentX - lastControlX;
                            const cp1y = 2 * currentY - lastControlY;
                            const cp2x = currentX + params[i];
                            const cp2y = currentY + params[i + 1];
                            currentX += params[i + 2];
                            currentY += params[i + 3];
                            
                            this.context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentX, currentY);
                            lastControlX = cp2x;
                            lastControlY = cp2y;
                        }
                    }
                    break;
                
                case 'Q': // Quadratic Bezier (absolute)
                    for (let i = 0; i < params.length; i += 4) {
                        if (i + 3 < params.length) {
                            const cpx = params[i];
                            const cpy = params[i + 1];
                            currentX = params[i + 2];
                            currentY = params[i + 3];
                            
                            this.context.quadraticCurveTo(cpx, cpy, currentX, currentY);
                            lastControlX = cpx;
                            lastControlY = cpy;
                        }
                    }
                    break;
                
                case 'q': // Quadratic Bezier (relative)
                    for (let i = 0; i < params.length; i += 4) {
                        if (i + 3 < params.length) {
                            const cpx = currentX + params[i];
                            const cpy = currentY + params[i + 1];
                            currentX += params[i + 2];
                            currentY += params[i + 3];
                            
                            this.context.quadraticCurveTo(cpx, cpy, currentX, currentY);
                            lastControlX = cpx;
                            lastControlY = cpy;
                        }
                    }
                    break;
                
                case 'T': // Smooth quadratic Bezier (absolute)
                    for (let i = 0; i < params.length; i += 2) {
                        if (i + 1 < params.length) {
                            // Reflect the last control point
                            const cpx = 2 * currentX - lastControlX;
                            const cpy = 2 * currentY - lastControlY;
                            currentX = params[i];
                            currentY = params[i + 1];
                            
                            this.context.quadraticCurveTo(cpx, cpy, currentX, currentY);
                            lastControlX = cpx;
                            lastControlY = cpy;
                        }
                    }
                    break;
                
                case 't': // Smooth quadratic Bezier (relative)
                    for (let i = 0; i < params.length; i += 2) {
                        if (i + 1 < params.length) {
                            // Reflect the last control point
                            const cpx = 2 * currentX - lastControlX;
                            const cpy = 2 * currentY - lastControlY;
                            currentX += params[i];
                            currentY += params[i + 1];
                            
                            this.context.quadraticCurveTo(cpx, cpy, currentX, currentY);
                            lastControlX = cpx;
                            lastControlY = cpy;
                        }
                    }
                    break;
                
                case 'A': // Arc (absolute) - simplified implementation
                case 'a': // Arc (relative) - simplified implementation
                    // For now, use approximation with quadratic curves
                    // A full implementation would require complex arc-to-bezier conversion
                    if (params.length >= 7) {
                        const endX = type === 'A' ? params[5] : currentX + params[5];
                        const endY = type === 'A' ? params[6] : currentY + params[6];
                        
                        // Simple approximation - draw a line for now
                        // TODO: Implement proper arc drawing
                        this.context.lineTo(endX, endY);
                        currentX = endX;
                        currentY = endY;
                    }
                    break;
                
                case 'Z':
                case 'z': // Close path
                    this.context.closePath();
                    currentX = subpathStartX;
                    currentY = subpathStartY;
                    break;
            }
        }
    }

    /**
     * Parse path parameters more reliably
     */
    private parsePathParams(paramString: string): number[] {
        if (!paramString.trim()) return [];
        
        // Handle commas, spaces, and scientific notation
        return paramString
            .trim()
            .replace(/,/g, ' ')
            .replace(/([+-])/g, ' $1')
            .split(/\s+/)
            .filter(s => s && s !== '+' && s !== '-')
            .map(Number)
            .filter(n => !isNaN(n));
    }    /**
     * Set the path (compatibility with SVG interface)
     * 确保SVG路径与Canvas形状同步，以便正确处理事件
     */
    setPath(pathString: string) {
        if (this.svgPath) {
            this.svgPath.setAttribute('d', pathString);
            // 确保SVG路径能接收事件但不可见
            this.svgPath.style.display = 'block';
            this.svgPath.style.opacity = '0';
            this.svgPath.style.fill = 'transparent';
            this.svgPath.style.stroke = 'transparent';
            this.svgPath.style.pointerEvents = 'auto';
        }
    }    /**
     * Flip the canvas in RTL mode
     */
    flipRTL() {
        if (this.context) {
            this.context.save();
            this.context.scale(-1, 1);
            this.context.translate(-this.canvas.width, 0);
        }
        
        // 确保SVG路径也正确翻转以保持事件区域一致
        if (this.svgPath) {
            this.svgPath.setAttribute('transform', 'scale(-1 1)');
        }
        
        // 重新应用事件处理设置
        this.setupEventHandling();
    }/**
     * Apply colours to the canvas
     */
    applyColour(block: BlockSvg) {
        // Store the current colors for next render
        this.updateShadow_(block.isShadow());
        this.updateDisabled_(!block.isEnabled() || block.getInheritedDisabled());
        
        // 确保事件处理在颜色更新后仍然正确
        this.setupEventHandling();
        
        // Re-render with new colors
        // This would typically be called after color changes
    }

    /**
     * Set the style
     */
    setStyle(blockStyle: BlockStyle) {
        this.style = blockStyle;
    }    /**
     * Update canvas size based on block dimensions
     */
    updateSize(width: number, height: number) {
        // Update stored dimensions
        this.canvasWidth = Math.max(width, 50);  // Minimum size
        this.canvasHeight = Math.max(height, 30);
        
        // Update canvas element
        this.setupCanvas();
        
        // Update foreign object size
        if (this.foreignObject) {
            this.foreignObject.setAttribute('width', this.canvasWidth + 'px');
            this.foreignObject.setAttribute('height', this.canvasHeight + 'px');
        }
        
        // Re-setup context after size change
        if (this.context) {
            this.context.imageSmoothingEnabled = true;
            this.context.imageSmoothingQuality = 'high';
        }
        
        // 重新应用事件处理设置
        this.setupEventHandling();
        
        console.log('Canvas resized to:', this.canvasWidth, 'x', this.canvasHeight);
    }

    // Compatibility methods with SVG interface
    setClass_(className: string, add: boolean) {
        if (add) {
            dom.addClass(this.canvas, className);
        } else {
            dom.removeClass(this.canvas, className);
        }
    }

    private updateShadow_(shadow: boolean) {
        if (shadow) {
            this.canvas.style.filter = 'opacity(0.6)';
        } else {
            this.canvas.style.filter = 'none';
        }
    }

    private updateDisabled_(disabled: boolean) {
        if (disabled) {
            this.canvas.style.filter = 'grayscale(1) opacity(0.6)';
        }
    }    // Required interface methods for compatibility
    updateMovable(enabled: boolean) {
        // Canvas-specific movable logic
        if (this.canvas) {
            this.canvas.style.cursor = enabled ? 'move' : 'default';
        }
    }    updateSelected(enabled: boolean) {
        if (!this.context) return;
        
        // 完全重新渲染Canvas以确保选择状态正确更新
        this.context.save();
        
        // 确保使用正确的坐标系统进行清除
        this.context.setTransform(1, 0, 0, 1, 0, 0); // 重置变换矩阵
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // 使用实际画布尺寸清除
        
        // 重新应用DPI缩放
        this.context.scale(this.pixelRatio, this.pixelRatio);
        
        // 设置渲染属性
        this.context.lineWidth = 1;
        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';
        this.context.imageSmoothingEnabled = true;
        
        // 重新绘制基础block形状
        if (this.lastOutlinePath) {
            this.context.beginPath();
            this.parseSvgPath(this.lastOutlinePath);
            this.context.fillStyle = this.style.colourPrimary || '#fff';
            this.context.fill();
            this.context.strokeStyle = this.style.colourTertiary || '#000';
            this.context.lineWidth = 1;
            this.context.stroke();
        }
        
        if (this.lastInlinePath) {
            this.context.beginPath();
            this.parseSvgPath(this.lastInlinePath);
            this.context.strokeStyle = this.style.colourTertiary || '#000';
            this.context.lineWidth = 1;
            this.context.stroke();
        }
        
        // 如果启用选择，绘制选择高亮
        if (enabled) {
            this.context.strokeStyle = '#fc3'; // 黄色选择框
            this.context.lineWidth = 2;
            this.context.setLineDash([3, 3]); // 虚线效果
            this.context.strokeRect(1, 1, this.canvasWidth - 2, this.canvasHeight - 2);
            this.context.setLineDash([]); // 重置线型
        }
        
        this.context.restore();
        
        // 记录状态用于调试
        console.log('Canvas selection updated:', { enabled, canvasSize: `${this.canvasWidth}x${this.canvasHeight}` });
    }    updateHighlighted(highlighted: boolean) {
        if (!this.context) return;
        
        // 完全重新渲染Canvas以确保高亮状态正确更新
        this.context.save();
        
        // 确保使用正确的坐标系统进行清除
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 重新应用DPI缩放
        this.context.scale(this.pixelRatio, this.pixelRatio);
        
        // 设置渲染属性
        this.context.lineWidth = 1;
        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';
        this.context.imageSmoothingEnabled = true;
        
        // 重新绘制基础block形状
        if (this.lastOutlinePath) {
            this.context.beginPath();
            this.parseSvgPath(this.lastOutlinePath);
            this.context.fillStyle = this.style.colourPrimary || '#fff';
            this.context.fill();
            this.context.strokeStyle = this.style.colourTertiary || '#000';
            this.context.lineWidth = 1;
            this.context.stroke();
        }
        
        if (this.lastInlinePath) {
            this.context.beginPath();
            this.parseSvgPath(this.lastInlinePath);
            this.context.strokeStyle = this.style.colourTertiary || '#000';
            this.context.lineWidth = 1;
            this.context.stroke();
        }
        
        // 如果启用高亮，绘制执行高亮
        if (highlighted) {
            this.context.strokeStyle = '#fff';
            this.context.lineWidth = 3;
            this.context.strokeRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        this.context.restore();
    }

    updateDraggingDelete(enabled: boolean) {
        if (this.canvas) {
            this.canvas.style.opacity = enabled ? '0.5' : '1';
        }
    }

    updateInsertionMarker(enabled: boolean) {
        if (this.canvas) {
            this.canvas.style.opacity = enabled ? '0.3' : '1';
        }
    }    updateReplaceable(replaceable: boolean) {
        // Canvas-specific replaceable logic
        if (this.canvas) {
            this.canvas.style.filter = replaceable ? 'opacity(0.5)' : 'none';
        }
    }

    updateReplacementFade(enabled: boolean) {
        // Canvas-specific replacement fade logic
        if (this.canvas) {
            this.canvas.style.opacity = enabled ? '0.5' : '1';
            this.setClass_('blocklyReplaceable', enabled);
        }
    }

    updateShapeForInputHighlight(connection: RenderedConnection, add: boolean) {
        // Canvas-specific connection highlight logic
    }

    removeHighlight() {
        // Remove canvas highlights - re-render without highlights
        if (this.context) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    addMarker(id: string) {
        // Canvas-specific marker logic
    }

    removeMarker(id: string) {
        // Canvas-specific marker removal
    }

    // Optional interface methods
    addConnectionHighlight(
        connection: RenderedConnection,
        connectionPath: string,
        offset: Coordinate,
        rtl: boolean,
    ): SVGElement {
        // For compatibility, create a hidden SVG element
        const highlight = dom.createSvgElement(
            Svg.PATH,
            {'class': 'blocklyConnectionHighlight', 'style': 'display: none;'},
            this.svgRoot,
        );
        this.connectionHighlights.set(connection, highlight);
        this.highlightOffsets.set(connection, offset);
        return highlight;
    }

    removeConnectionHighlight(connection: RenderedConnection) {
        const highlight = this.connectionHighlights.get(connection);        if (highlight && highlight.parentNode) {
            highlight.parentNode.removeChild(highlight);
        }
        this.connectionHighlights.delete(connection);
        this.highlightOffsets.delete(connection);
    }
}
