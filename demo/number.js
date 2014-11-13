function createNumber() {
  var node = document.createElement('number');
  node.onwheel = node.onmousewheel = function(e) {
    var delta = e.deltaX !== undefined ? -e.deltaX : e.wheelDeltaX;
    if (delta !== 0) {
      var floatMode = e.metaKey;
      var text = node.innerText !== undefined ? node.innerText : node.textContent;
      var oldValue = parseFloat(text);
      var newValue = oldValue + (floatMode ? 0.01 : 1) * delta / Math.abs(delta);
      newValue = newValue.toFixed(floatMode ? 2 : 0);
      while (this.firstChild) {
        this.removeChild(this.firstChild);
      }
      this.appendChild(document.createTextNode(newValue));
      this.dispatchEvent(new CustomEvent('valuechange', {detail: {oldValue: oldValue, newValue: newValue}}));
    }
    return false;
  };
  return node;
}

