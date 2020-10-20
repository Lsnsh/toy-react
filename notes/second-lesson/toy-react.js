const RENDER_TO_DOM = Symbol('render to dom');

class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }
  setAttribute(key, value) {
    if (key.match(/on([\s\S]*)$/)) {
      this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, (s) => s.toLocaleLowerCase()), value);
    } else {
      if (key === 'className') {
        key = 'class'
      }
      this.root.setAttribute(key, value);
    }
  }
  appendChild(component) {
    let range = document.createRange();
    range.setStart(this.root, this.root.childNodes.length);
    range.setEnd(this.root, this.root.childNodes.length);
    component[RENDER_TO_DOM](range);
  }
  [RENDER_TO_DOM](range) {
    range.deleteContents();
    range.insertNode(this.root);
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
  }
  [RENDER_TO_DOM](range) {
    range.deleteContents();
    range.insertNode(this.root);
  }
}

export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = null;
  }
  setAttribute(key, value) {
    this.props[key] = value;
  }
  appendChild(component) {
    this.children.push(component);
  }
  [RENDER_TO_DOM](range) {
    this._range = range;
    this.render()[RENDER_TO_DOM](range);
  }
  reRender() {
    let oldRange = this._range;

    let range = document.createRange();
    range.setStart(oldRange.startContainer, oldRange.startOffset);
    range.setEnd(oldRange.startContainer, oldRange.startOffset);
    this[RENDER_TO_DOM](range);

    oldRange.setStart(range.endContainer, range.endOffset);
    oldRange.deleteContents();
  }
  setState(newState) {
    if (!this.state || typeof this.state !== 'object') {
      this.state = newState;
      this.reRender();
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
    this.reRender();
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
      if (child === null) {
        continue;
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
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();
  component[RENDER_TO_DOM](range);
}
