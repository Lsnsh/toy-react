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
  if (typeof type === 'string') {
    ele = new ElementWrapper(type);
  } else {
    ele = new type;
  }
  for (let key in attribute) {
    ele.setAttribute(key, attribute[key]);
  }
  let insertChildren = (children) => {
    for (let child of children) {
      if (typeof child === 'string') {
        child = new TextWrapper(child);
      }
      if (typeof child === 'object' && child instanceof Array) {
        insertChildren(child);
      } else {
        ele.appendChild(child);
      }
    }
  }
  insertChildren(children);
  return ele;
}

export function render(component, parentElement) {
  parentElement.appendChild(component.root);
}
