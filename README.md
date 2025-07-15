# eshop-playground

## 实现一个拖拽式邮件编辑器

技术栈：
1. https://github.com/SortableJS/Vue.Draggable【拖拽组件】
2. https://lexical.dev/ 【富文本编辑器】
3. https://playground.lexical.dev/
4. https://mjml.io/【邮件标记语言】
5. https://vuemail.net/getting-started/usage 【Nuxt Vue Email】

编辑器核心技术
1. 拖拽功能
javascript// 推荐库
- react-dnd / @dnd-kit/core (React)
- Vue.Draggable (Vue)
- SortableJS (框架无关)
2. 富文本编辑
javascript// 现代编辑器
- Lexical (Facebook，现代架构)
- Slate.js (高度可定制)
- Quill.js (功能丰富)
- TinyMCE (商业友好)
3. 画布渲染
javascript// 视觉编辑器
- Fabric.js (2D 画布操作)
- Konva.js (2D 画布，性能好)
- 或直接使用 HTML/CSS 布局
邮件特殊挑战
1. HTML 兼容性处理
邮件客户端支持的 HTML/CSS 非常有限：
javascript// 需要处理的限制
- 只支持 table 布局
- CSS 内联样式
- 不支持 JavaScript
- 不支持现代 CSS 特性
- 各客户端渲染差异巨大