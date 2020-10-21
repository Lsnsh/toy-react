const RENDER_TO_DOM = Symbol('render to dom');

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
  get vdom() {
    return this.render().vdom;
  }
  [RENDER_TO_DOM](range) {
    this._range = range;
    this._vdom = this.vdom;
    this._vdom[RENDER_TO_DOM](range);
  }
  update() {
    let isSameNode = (oldNode, newNode) => {
      if (oldNode.type !== newNode.type) {
        return false;
      }
      if (oldNode.type === '#text' && oldNode.content !== newNode.content) {
        return false;
      }
      if (Object.keys(oldNode.props).length === Object.keys(newNode.props).length) {
        for (let key in newNode.props) {
          if (oldNode.props[key] !== newNode.props[key]) {
            return false;
          }
        }
      } else {
        return false;
      }
      return true;
    }

    let updateNode = (oldNode, newNode) => {
      // check root type(#text content) and props
      if (!isSameNode(oldNode, newNode)) {
        newNode[RENDER_TO_DOM](oldNode._range);
        return;
      }
      newNode._range = oldNode._range;

      // children
      let oldChildren = oldNode.vchildren;
      let newChildren = newNode.vchildren;

      if (!newChildren || !newChildren.length) {
        return;
      }

      let tailRange = oldChildren[oldChildren.length - 1]._range;

      for (let i = 0; i < newChildren.length; i++) {
        let oldChild = oldChildren[i];
        let newChild = newChildren[i];
        if (i < oldChildren.length) {
          updateNode(oldChild, newChild);
        } else {
          let range = document.createRange();
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          newChild[RENDER_TO_DOM](range);
          tailRange = range;
        }
      }
    }

    let vdom = this.vdom;
    updateNode(this._vdom, vdom);
    this._vdom = vdom;
  }
  setState(newState) {
    if (!this.state || typeof this.state !== 'object') {
      this.state = newState;
      this.update();
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
    this.update();
  }
}

class ElementWrapper extends Component {
  constructor(type) {
    super(type);
    this.type = type;
  }
  get vdom() {
    this.vchildren = this.children.map(child => child.vdom);
    return this;
  }
  [RENDER_TO_DOM](range) {
    this._range = range;
    let root = document.createElement(this.type);

    for (let key in this.props) {
      let value = this.props[key]
      if (key.match(/on([\s\S]*)$/)) {
        root.addEventListener(RegExp.$1.replace(/^[\s\S]/, (s) => s.toLocaleLowerCase()), value);
      } else {
        if (key === 'className') {
          key = 'class'
        }
        root.setAttribute(key, value);
      }
    }

    if (!this.vchildren) {
      this.vchildren = this.children.map(child => child.vdom);
    }

    for (let child of this.vchildren) {
      let range = document.createRange();
      range.setStart(root, root.childNodes.length);
      range.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](range);
    }

    replaceRangeContent(range, root);
  }
}

class TextWrapper extends Component {
  constructor(content) {
    super(content);
    this.type = '#text';
    this.content = content;
  }
  get vdom() {
    return this;
  }
  [RENDER_TO_DOM](range) {
    this._range = range;
    let root = document.createTextNode(this.content);

    replaceRangeContent(range, root);
  }
}

function replaceRangeContent(range, node) {
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();

  range.setStartBefore(node);
  range.setEndAfter(node);
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
