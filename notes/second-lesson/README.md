## 第二课｜ 给 ToyReact 添加对应的生命周期，实现动态修改内容的功能

第一节课之后，已经可以将 React JSX 语法正确的渲染，但是是静态的，当数据发生变化时并不能重新渲染，重新渲染时需要将新的元素，插入在旧的元素的各个位置上，在这里我们通过借助 [Range API][1] 来完成。

### 如何改造为基于 Range 来绘制 DOM ？

在实现数据发生变化重新渲染 DOM 前，先改为为基于 Range 来绘制 DOM，给包装类 `ElementWrapper`、`TextWrapper` 和自定义组件类 `Component` 实现 `renderToDom` 方法：

**toy-react.js**

```diff
+ const RENDER_TO_DOM = Symbol('render to dom');

class ElementWrapper {
  // ...
  appendChild(component) {
-   this.root.appendChild(component.root);
+   let range = document.createRange();
+   range.setStart(this.root, this.root.childNodes.length);
+   range.setEnd(this.root, this.root.childNodes.length);
+   component[RENDER_TO_DOM](range);
  }
+ [RENDER_TO_DOM](range) {
+   range.deleteContents();
+   range.insertNode(this.root);
+ }
}

class TextWrapper {
  // ...
+ [RENDER_TO_DOM](range) {
+   range.deleteContents();
+   range.insertNode(this.root);
+ }
}

export class Component {
  constructor() {
    // ...
+   this._range = null;
  }
  // ...
- get root() {
-   if (!this._root) {
-     this._root = this.render().root;
-     for (let key in this.props) {
-       this._root.setAttribute(key, this.props[key]);
-     }
-   }
-   return this._root;
- }
+ [RENDER_TO_DOM](range) {
+   this._range = range;
+   this.render()[RENDER_TO_DOM](range);
+ }
}

// ...

export function render(component, parentElement) {
- parentElement.appendChild(component.root);
+ let range = document.createRange();
+ range.setStart(parentElement, 0);
+ range.setEnd(parentElement, parentElement.childNodes.length);
+ range.deleteContents();
+ component[RENDER_TO_DOM](range);
}
```

### 实现调用 setState 时，重新渲染 DOM ？

**main.js**

```diff
import { createElement, render, Component } from './toy-react.js';

class MyComponent extends Component {
+ constructor() {
+   super();
+   this.state = {
+     a: 1,
+     b: 2
+   }
+ }
  render() {
    return <div>
      <h1>my component</h1>
+     <button onClick={() => { this.setState({ a: this.state.a + 1 }) }}>add</button>
+     <p>{this.state.a.toString()}</p>
+     <p>{this.state.b.toString()}</p>
      {this.children}
    </div>
  }
}

render(<MyComponent id="a" class="c">
  <div>123</div>
  <div></div>
  <div></div>
</MyComponent>, document.body);
```

**toy-react.js**

```diff
// ...

class ElementWrapper {
  // ...
  setAttribute(key, value) {
+   if (key.match(/on([\s\S]*)$/)) {
+     this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, (s) => s.toLocaleLowerCase()), value);
+   } else {
      this.root.setAttribute(key, value);
+   }
  }
  // ...
}

// ...

export class Component {
  // ...
  [RENDER_TO_DOM](range) {
    this._range = range;
    this.render()[RENDER_TO_DOM](range);
  }
+ reRender() {
+   this._range.deleteContents();
+   this[RENDER_TO_DOM](this._range);
+ }
+ setState(newState) {
+   if (!this.state || typeof this.state !== 'object') {
+     this.state = newState;
+     this.reRender();
+     return;
+   }
+   const merge = (oldState, newState) => {
+     for (let p in newState) {
+       if (oldState[p] === null || typeof oldState[p] !== 'object') {
+         oldState[p] = newState[p];
+       } else {
+         merge(oldState[p], newState[p]);
+       }
+     }
+   }
+   merge(this.state, newState);
+   this.reRender();
+ }
}

// ...
```

### 尝试跑通 TicTacToe 最终代码

> TicTacToe - 井字游戏 - 最终代码：https://codepen.io/gaearon/pen/gWWZgR

从最终代码中将 CSS、HTML 拷贝到 `main.html`中：

**main.html**

```html
<style>
  /* ... */
</style>

<body>
  <div id="root"></div>
</body>
<script src="main.js"></script>
```

将 JS 拷贝到 `main.js` 中，需要将组件 function 写法改为 class 写法，然后将 `React.Component` 和 `ReactDOM.render` 改为，手动引入的 `Component` 和 `render`：

**main.js**

```js
import { createElement, render, Component } from "./toy-react.js";

class Square extends Component {
  render() {
    return (
      <button className="square" onClick={this.props.onClick}>
        {this.props.value}
      </button>
    );
  }
}
// ...
```

### 基于 Range 重新渲染的坑？

数据更新时，基于 Range 重新渲染，由于元素插入位置的不同，`deleteContents` 时会删除不应该删除的节点。

修改 `reRender` 方法，先将新的节点插入到 `range` 中，然后重新渲染，最后再删除旧的节点内容：

```diff
// ...

export class Component {
  // ...
  reRender() {
-   this._range.deleteContents();
-   this[RENDER_TO_DOM](this._range);
+   let oldRange = this._range;

+   let range = document.createRange();
+   range.setStart(oldRange.startContainer, oldRange.startOffset);
+   range.setEnd(oldRange.startContainer, oldRange.startOffset);
+   this[RENDER_TO_DOM](range);

+   oldRange.setStart(range.endContainer, range.endOffset);
+   oldRange.deleteContents();
  }
}

// ...
```

[1]: https://developer.mozilla.org/zh-CN/docs/Web/API/Range
