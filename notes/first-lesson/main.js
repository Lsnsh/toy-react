import { createElement, render, Component } from './toy-react.js';

class MyComponent extends Component {
  render() {
    return <div>
      <h1>my component</h1>
      {this.children}
    </div>
  }
}

render(<MyComponent id="a" class="c">
  <div>123</div>
  <div></div>
  <div></div>
</MyComponent>, document.body);
