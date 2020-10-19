## 第一课｜ JSX 的原理和关键实现

### 如何实现 `JSX` 语法转换后的 createElement 函数？

```js
document.body.appendChild(
  createElement(
    "div",
    {
      id: "a",
      class: "c",
    },
    createElement("div", null, "123"),
    createElement("div", null),
    createElement("div", null)
  )
);
```

在仅使用 `@babel/plugin-transform-react-jsx` 插件的情况下，让以下 `JSX` 语法正常运行，配置插件的 `{pragma: 'createElement'}`，指定为自定义的函数名称，默认为 `React.createElement`：

**main.js**

```js
function createElement(tagName, attribute, ...children) {
  let ele = document.createElement(tagName);
  for (name in attribute) {
    ele.setAttribute(name, attribute[name]);
  }
  for (child of children) {
    if (typeof child === "string") {
      child = document.createTextNode(child);
    }
    ele.appendChild(child);
  }
  return ele;
}

document.body.appendChild(
  <div id="a" class="c">
    <div>123</div>
    <div></div>
    <div></div>
  </div>
);
```

### 如何支持 `JSX` 的自定义组件语法？

```js
document.body.appendChild(
  <MyComponent id="a" class="c">
    <div>123</div>
    <div></div>
    <div></div>
  </MyComponent>
);
```

目前已经能够正常转换使用原生 `DOM` 的 `JSX` 语法，当使用自定义组件语法（大写字母），`createElement` 函数该如何实现？

通过封装包装类 `ElementWrapper`、`TextWrapper` 和自定义组件类，使原生 `DOM` 和自定义组件在 `createElement` 时的实现一定程度上的写法兼容、逻辑复用

**main.js**

```js
import { createElement, render, Component } from "./toy-react.js";

class MyComponent extends Component {
  render() {
    return (
      <div>
        <h1>my component</h1>
        {this.children}
      </div>
    );
  }
}

render(
  <MyComponent id="a" class="c">
    <div>123</div>
    <div></div>
    <div></div>
  </MyComponent>,
  document.body
);
```

**toy-react.js**

```js
class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }
  setAttribute(key, value) {
    this.root.setAttribute(key, value);
  }
  appendChild(component) {
    this.root.appendChild(component.root);
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
  }
}

export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
  }
  setAttribute(key, value) {
    this.props[key] = value;
  }
  appendChild(component) {
    this.children.push(component);
  }
  get root() {
    if (!this._root) {
      this._root = this.render().root;
      for (let key in this.props) {
        this._root.setAttribute(key, this.props[key]);
      }
    }
    return this._root;
  }
}

export function createElement(type, attribute, ...children) {
  let ele;
  if (typeof type === "string") {
    ele = new ElementWrapper(type);
  } else {
    ele = new type();
  }
  for (let key in attribute) {
    ele.setAttribute(key, attribute[key]);
  }
  let insertChildren = (children) => {
    for (let child of children) {
      if (typeof child === "string") {
        child = new TextWrapper(child);
      }
      if (typeof child === "object" && child instanceof Array) {
        insertChildren(child);
      } else {
        ele.appendChild(child);
      }
    }
  };
  insertChildren(children);
  return ele;
}

export function render(component, parentElement) {
  parentElement.appendChild(component.root);
}
```

### 自问自答

1. 为什么不安装 webpack 错误提示中给定 `@babel/plugin-syntax-jsx` 而要安装 `@babel/plugin-transform-react-jsx`？

转换插件会自动启用语法插件，语法插件仅解析特定类型的语法（不转换）

参考链接：https://babeljs.io/docs/en/plugins#transform-plugins
