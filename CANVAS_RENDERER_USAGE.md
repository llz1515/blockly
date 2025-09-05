# 使用说明

## Canvas 渲染器使用指南

我们已经成功实现了一个基于 HTML5 Canvas 的 Blockly 自定义渲染器！

### 主要功能

1. **Canvas 渲染**: 使用 HTML5 Canvas 代替 SVG 来绘制 Blockly 块
2. **路径转换**: 将 SVG 路径命令自动转换为 Canvas 绘制指令
3. **完全兼容**: 与现有 Blockly API 完全兼容
4. **性能优化**: 在复杂场景下可能提供更好的性能

### 实现的核心文件

- `drawer.ts` - Canvas 绘制器，负责将块绘制到 Canvas 上
- `path_object.ts` - Canvas 路径对象，管理 Canvas 元素和绘制
- `renderer.ts` - 自定义渲染器主类
- `constants.ts` - 渲染常量

### 如何使用

1. **在 HTML 中使用**:
```javascript
const workspace = Blockly.inject('blocklyDiv', {
    toolbox: toolbox,
    renderer: 'CustomRenderer'  // 指定使用我们的 Canvas 渲染器
});
```

2. **特性**:
   - 自动 SVG 路径到 Canvas 转换
   - 支持块颜色、高亮、选择状态
   - 支持 RTL（从右到左）布局
   - 连接点高亮
   - 拖拽状态显示

### 技术亮点

1. **SVG 路径解析**: 实现了完整的 SVG 路径命令解析器，支持：
   - M (moveTo) - 移动到
   - L (lineTo) - 直线到
   - H (horizontal line) - 水平线
   - V (vertical line) - 垂直线
   - C (cubic Bezier) - 三次贝塞尔曲线
   - Q (quadratic Bezier) - 二次贝塞尔曲线
   - Z (closePath) - 闭合路径

2. **兼容性设计**: 
   - 保留隐藏的 SVG 元素以维持事件处理
   - 使用 foreignObject 在 SVG 中嵌入 Canvas
   - 实现完整的 IPathObject 接口

3. **性能考虑**:
   - Canvas 绘制通常比复杂 SVG DOM 操作更快
   - 减少了 DOM 元素数量
   - 支持高分辨率显示（devicePixelRatio）

### 测试

运行项目目录下的 `tests/canvas_renderer_test.html` 来查看 Canvas 渲染器的效果。

### 扩展可能性

这个基础实现为以下扩展提供了基础：

1. **视觉效果**: 阴影、渐变、纹理
2. **动画**: 平滑的过渡和动画效果  
3. **性能优化**: 视口裁剪、虚拟化
4. **交互增强**: 更丰富的悬停和拖拽效果

### 下一步

如果你想进一步开发这个渲染器，可以考虑：

1. 添加更多的视觉效果
2. 优化大型工作区的渲染性能
3. 实现更复杂的动画
4. 添加自定义主题支持

这个 Canvas 渲染器展示了 Blockly 渲染系统的灵活性，以及如何使用现代 Web 技术来改进用户体验！
