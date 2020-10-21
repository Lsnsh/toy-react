## 第三课｜ 虚拟 DOM 的原理和关键实现

第二节课之后，虽然能跑通 `TicTacToe` 最终代码，但是每次重新渲染，都会全量更新 `DOM` 节点。这一节我们通过构建虚拟 `DOM` 树，对新旧 `DOM` 树进行比对，最终实现真实 `DOM` 树的部分更新。

### 如何构建虚拟 DOM 树？

虚拟 `DOM` 是一个 `Object` 对象，以键值对的形式存储了真实 `DOM` 节点的标签名称，属性值、子节点等信息。

将自定义组件类 `Component` 提文件最前面，让包装类 `ElementWrapper`、`TextWrapper` 都继承 `Component`，并给它们添加 `getter vdom()`：

**toy-react.js**

```diff
// ...

export class Component {
  // ...
+ get vdom() {
+   return this.render().vdom;
+ }
  // ...
}

- class ElementWrapper {
+ class ElementWrapper extends Component {
  constructor(type) {
+   super(type);
+   this.type = type;
    this.root = document.createElement(type);
  }
- setAttribute(key, value) {
-   if (key.match(/on([\s\S]*)$/)) {
-     this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, (s) => s.toLocaleLowerCase()), value);
-   } else {
-     if (key === 'className') {
-       key = 'class'
-     }
-     this.root.setAttribute(key, value);
-   }
- }
- appendChild(component) {
-   let range = document.createRange();
-   range.setStart(this.root, this.root.childNodes.length);
-   range.setEnd(this.root, this.root.childNodes.length);
-   component[RENDER_TO_DOM](range);
- }
+ get vdom() {
+   return {
+     type: this.type,
+     props: this.props,
+     children: this.children.map(child => child.vdom)
+   }
+ }
  // ...
}

- class TextWrapper {
+ class TextWrapper extends Component {
  constructor(content) {
+   super(content);
+   this.content = content;
    this.root = document.createTextNode(content);
  }
+ get vdom() {
+   return {
+     type: '#text',
+     content: this.content
+   }
+ }
  // ...
}

// ...
```

看看在控制台打印出来的虚拟 `DOM` 树是怎样的：

**main.js**

```diff
- render(<Game />, document.getElementById("root"));
+ // render(<Game />, document.getElementById("root"));

+ let game = <Game />;
+ console.log(game.vdom);
```

### 如何基于虚拟 DOM 树构建真实 DOM 树？

现在我们已经能基于 JSX 代码构建虚拟 DOM 树了，下面接着修改代码：

- 因为渲染的需要，为了方便访问节点对应的 `RENDER_TO_DOM()` 方法和其他属性，`get vdom()` 直接返回 `this`
- 使用虚拟 DOM 树中的数据来渲染 DOM

**toy-react.js**

```diff
// ...

export class Component {
  // ...
+ get vchildren() {
+   return this.children.map(child => child.vdom);
+ }
  // ...
}

class ElementWrapper extends Component {
  constructor(type) {
    super(type);
    this.type = type;
-   this.root = document.createElement(type);
  }
  get vdom() {
-   return {
-     type: this.type,
-     props: this.props,
-     children: this.children.map(child => child.vdom)
-   }
+   return this;
  }
  [RENDER_TO_DOM](range) {
+   let root = document.createElement(this.type);

+   for (let key in this.props) {
+     let value = this.props[key]
+     if (key.match(/on([\s\S]*)$/)) {
+       root.addEventListener(RegExp.$1.replace(/^[\s\S]/, (s) => s.toLocaleLowerCase()), value);
+     } else {
+       if (key === 'className') {
+         key = 'class'
+       }
+       root.setAttribute(key, value);
+     }
+   }

+   for (let child of this.vchildren) {
+     let range = document.createRange();
+     range.setStart(root, root.childNodes.length);
+     range.setEnd(root, root.childNodes.length);
+     child[RENDER_TO_DOM](range);
+   }

    range.deleteContents();
-   range.insertNode(this.root);
+   range.insertNode(root);
  }
}

class TextWrapper extends Component {
  constructor(content) {
    super(content);
+   this.type = '#text';
    this.content = content;
-   this.root = document.createTextNode(content);
  }
  get vdom() {
-   return {
-     type: '#text',
-     content: this.content
-   }
+   return this;
  }
  [RENDER_TO_DOM](range) {
+   let root = document.createTextNode(this.content);

    range.deleteContents();
-   range.insertNode(this.root);
+   range.insertNode(root);
  }
}

// ...
```

**main.js**

```diff
- // render(<Game />, document.getElementById("root"));
+ render(<Game />, document.getElementById("root"));

- let game = <Game />;
- console.log(game.vdom);
```

### 如何比对新旧虚拟 DOM 树，实现真实 DOM 树的部分更新？

删除 `reRender()` 方法，调用 `setState()` 时，改用新增的 `update()` 方法，来比对新旧虚拟 DOM 树，实现对真实 DOM 树的部分更新。

比对依据的某些特征，相对简单，如果「两个的节点类型（文本节点还要比较内容）、节点属性数量和属性值相同时」就认为是相同的节点，然后递归的比对子节点，完成旧节点更新和新节点插入。

**main.js**

```diff
// ...

export class Component {
  // ...
  get vdom() {
    return this.render().vdom;
  }
- get vchildren() {
-   return this.children.map(child => child.vdom);
- }
  [RENDER_TO_DOM](range) {
    this._range = range;
-   this.render()[RENDER_TO_DOM](range);
+   this._vdom = this.vdom;
+   this._vdom[RENDER_TO_DOM](range);
  }
- reRender() {
-   let oldRange = this._range;
-
-   let range = document.createRange();
-   range.setStart(oldRange.startContainer, oldRange.startOffset);
-   range.setEnd(oldRange.startContainer, oldRange.startOffset);
-   this[RENDER_TO_DOM](range);
-
-   oldRange.setStart(range.endContainer, range.endOffset);
-   oldRange.deleteContents();
- }
+ update() {
+   let isSameNode = (oldNode, newNode) => {
+     if (oldNode.type !== newNode.type) {
+       return false;
+     }
+     if (oldNode.type === '#text' && oldNode.content !== newNode.content) {
+       return false;
+     }
+     if (Object.keys(oldNode.props).length === Object.keys(newNode.props).length) {
+       for (let key in newNode.props) {
+         if (oldNode.props[key] !== newNode.props[key]) {
+           return false;
+         }
+       }
+     } else {
+       return false;
+     }
+     return true;
+   }
+
+   let updateNode = (oldNode, newNode) => {
+     // check root type(#text content) and props
+     if (!isSameNode(oldNode, newNode)) {
+       newNode[RENDER_TO_DOM](oldNode._range);
+       return;
+     }
+     newNode._range = oldNode._range;
+
+     // children
+     let oldChildren = oldNode.vchildren;
+     let newChildren = newNode.vchildren;
+
+     if (!newChildren || !newChildren.length) {
+       return;
+     }
+
+     let tailRange = oldChildren[oldChildren.length - 1]._range;
+
+     for (let i = 0; i < newChildren.length; i++) {
+       let oldChild = oldChildren[i];
+       let newChild = newChildren[i];
+       if (i < oldChildren.length) {
+         updateNode(oldChild, newChild);
+       } else {
+         let range = document.createRange();
+         range.setStart(tailRange.endContainer, tailRange.endOffset);
+         range.setEnd(tailRange.endContainer, tailRange.endOffset);
+         newChild[RENDER_TO_DOM](range);
+         tailRange = range;
+       }
+     }
+   }
+
+   let vdom = this.vdom;
+   updateNode(this._vdom, vdom);
+   this._vdom = vdom;
+ }
  setState(newState) {
    if (!this.state || typeof this.state !== 'object') {
      this.state = newState;
-     this.reRender();
+     this.update();
      return;
    }
    const merge = (oldState, newState) => {
      for (let p in newState) {
        if (oldState[p] === null || typeof oldState[p] !== 'object') {
          oldState[p] = newState[p];
        } else {
          merge(oldState[p], newState[p]);
        }
      }
    }
    merge(this.state, newState);
-   this.reRender();
+   this.update();
  }
}

class ElementWrapper extends Component {
  // ...
  get vdom() {
+   this.vchildren = this.children.map(child => child.vdom);
    return this;
  }
  [RENDER_TO_DOM](range) {
+   this._range = range;
    let root = document.createElement(this.type);

    // ...

+   if (!this.vchildren) {
+     this.vchildren = this.children.map(child => child.vdom);
+   }

    for (let child of this.vchildren) {
      let range = document.createRange();
      range.setStart(root, root.childNodes.length);
      range.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](range);
    }

-   range.deleteContents();
-   range.insertNode(root);
+   replaceRangeContent(range, root);
  }
}

class TextWrapper extends Component {
  // ...
  [RENDER_TO_DOM](range) {
+   this._range = range;
    let root = document.createTextNode(this.content);

-   range.deleteContents();
-   range.insertNode(root);
+   replaceRangeContent(range, root);
  }
}

+ function replaceRangeContent(range, node) {
+  range.insertNode(node);
+  range.setStartAfter(node);
+  range.deleteContents();
+
+  range.setStartBefore(node);
+  range.setEndAfter(node);
+ }

// ...
```
