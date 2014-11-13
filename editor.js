/*

TODO:

-- The cursor should always be visible
  * Right now I'm using node.scrollIntoView(). This is annoying b/c it always happens, even when the editor
    doesn't have focus.
  * The check to see if it's already showing doesn't seem to be right.

-- up and down arrow keys
-- selections
-- copy and paste

*/

var k = key.noConflict();

// ---------------------------

var editor = {
  create: function() {
    var ed = document.createElement('editor');
    for (var p in editorProto) {
      if (editorProto.hasOwnProperty(p)) {
        ed[p] = editorProto[p];
      }
    }
    editorInit.call(ed);
    return ed;
  }
};

var editorProto = {
  cursorLeft: function() {
    var info = this.getCursorInfo();
    if (this.cursorPos === 0) {
      // no-op
    } else if (info.offset > 0) {
      this.cursorPos -= info.nodeAtCursor instanceof Text ? 1 : this.numCharsIn(info.nodeAtCursor);
    } else {
      var prevNode = this.getNodeBefore(info.nodeAtCursor);
      this.cursorPos -= prevNode instanceof Text ? 1 : this.numCharsIn(prevNode);
    }
    this.updateCursor();
    this.showState();
  },

  cursorRight: function() {
    var info = this.getCursorInfo();
    var text = this.getText();
    if (this.cursorPos === text.length) {
      // no-op
    } else {
      this.cursorPos += info.nodeAtCursor instanceof Text ? 1 : this.numCharsIn(info.nodeAtCursor);
    }
    this.updateCursor();
    this.showState();
  },

  cursorUp: function() {
    // TODO
  },

  cursorDown: function() {
    // TODO
  },

  home: function() {
    var pos = this.getCursorPos();
    if (pos > 0) {
      var text = this.getText();
      while (pos > 0 && text.charAt(pos - 1) !== '\n') {
        pos--;
      }
      this.setCursorPos(pos);
      this.updateCursor();
      this.showState();
    }
  },

  end: function() {
    var pos = this.getCursorPos();
    var text = this.getText();
    if (pos < text.length) {
      while (pos < text.length && text.charAt(pos) !== '\n') {
        pos++;
      }
      this.setCursorPos(pos);
      this.updateCursor();
      this.showState();
    }
  },

  backspace: function() {
    var info = this.getCursorInfo();
    if (this.cursorPos === 0) {
      // op-op
    } else {
      var oldText = this.getText();
      var node, offset;
      if (info.offset === 0) {
        node = this.getNodeBefore(info.nodeAtCursor);
        offset = this.numCharsIn(node);
      } else {
        node = info.nodeAtCursor;
        offset = info.offset;
      }
      if (node instanceof Text) {
        node.parentNode.replaceChild(
            document.createTextNode(node.data.substr(0, offset - 1) + node.data.substr(offset)),
            node
        );
        this.cursorPos--;
      } else {
        node.parentNode.removeChild(node);
        this.cursorPos -= offset;
      }
      this.changed(oldText, this.getText(), true);
    }
  },

  getNodeBefore: function(node) {
    var prevNode;
    var done = false;
    this.collectText(
        this,
        function(t, n) {
          if (n === node) {
            done = true;
          } else if (!done) {
            prevNode = n;
          }
        }
    );
    return prevNode;
  },

  changed: function(oldText, text, fireEvents) {
    var self = this;
    this.nestCalled = false;
    this.beforeNest = function() {
      self.nestCalled = true;
      self._setText(text);
      self.beforeNest = function() {};
    };
    this.render(text);
    if (!this.nestCalled && text.length === 0) {
      self._setText('');
    }
    this.updateCursor();
    this.showState();
    if (fireEvents) {
      this.dispatchEvent(new CustomEvent('valuechange', {detail: {oldValue: oldText, newValue: text}}));
    }
  },

  nest: function(interval, node) {
    var self = this;
    this.beforeNest();
    var pos = 0;
    node.interval = interval;
    var intervalIsEmpty = interval.startIdx === interval.endIdx;
    this.collectText(
        this,
        function(t, n) {
          if (intervalIsEmpty && interval.startIdx === pos) {
            n.parentNode.insertBefore(node, n);
          } else if (interval.startIdx <= pos && pos + t.length <= interval.endIdx) {
            if (node.parentNode === null) {
              n.parentNode.replaceChild(node, n);
            }
            node.appendChild(n);
          } else if (n instanceof Text && (pos <= interval.startIdx && interval.startIdx < pos + t.length ||
                                           pos <  interval.endIdx   && interval.endIdx <=  pos + t.length)) {
            if (node.parentNode === null) {
              n.parentNode.replaceChild(node, n);
            } else {
              n.parentNode.removeChild(n);
            }
            var startPos = Math.max(interval.startIdx, pos);
            var endPos =   Math.min(interval.endIdx, pos + t.length);
            var beforeText = document.createTextNode(t.substr(0, startPos - pos));
            var nestedText = document.createTextNode(t.substr(startPos - pos, endPos - startPos));
            var afterText = document.createTextNode(t.substr(endPos - pos));
            node.appendChild(nestedText);
            node.parentNode.insertBefore(beforeText, node);
            node.parentNode.insertBefore(afterText, node.nextSibling);
          }
          pos += t.length;
        },
        true
    );
    if (intervalIsEmpty && interval.startIdx === pos) {
      this.appendChild(node);
    }

    if (node.parentNode === null) {
      throw 'uh-oh, never added node! ' + node.tagName;
    }

    return node;
  },

  decorate: function(interval, node /*, childNode1, childNode2, ... */) {
    for (var idx = 2; idx < arguments.length; idx++) {
      var childNode = arguments[idx];
      node.appendChild(typeof childNode === 'string' ? document.createTextNode(childNode) : childNode);
    }
    var lastChild = node.lastChild;
    this.nest(interval, node);
    while (node.lastChild !== lastChild) {
      node.removeChild(node.lastChild);
    }
    node.setAttribute('source', interval.contents);
    return node;
  },

  createInterval: function(startIdx, endIdx) {
    var text = this.getText();
    return {
      startIdx: startIdx,
      endIdx: endIdx,
      source: text,
      contents: text.substr(startIdx, endIdx - startIdx)
    };
  },

  render: function(text) {},

  setText: function(text, fireEvents) {
    var oldText = this.getText();
    this._setText(text);
    this.setCursorPos(text.length);
    this.changed(oldText, text, fireEvents);
  },

  _setText: function(text) {
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
    this.appendChild(document.createTextNode(text));
  },

  showState: function() {
    //console.log('[' + this.getText(true) + '], cursorPos =', this.cursorPos);
  },

  getCursorPos: function(optNode) {
    if (optNode) {
      var currPos = 0, pos;
      this.collectText(
          this,
          function(t, n) {
             if (pos === undefined && optNode.contains(n)) {
               pos = currPos;
             }
             currPos += t.length;
          }
      );
      return pos;
    } else {
      return this.cursorPos;
    }
  },

  setCursorPos: function(pos) {
    this.cursorPos = Math.max(0, Math.min(pos, this.getText().length));
    this.updateCursor();
    this.showState();
  },

  numCharsIn: function(node) {
    var count = 0;
    this.collectText(
        node,
        function(t) {
          count += t.length;
        }
    );
    return count;
  },

  getTextIn: function(node) {
    var ts = [];
    this.collectText(
        node,
        function(t) {
          ts.push(t);
        }
    );
    return ts.join(''); 
  },

  getText: function(showCursor) {
    var ts = [];
    var n = this.cursorPos;
    if (n === 0 && showCursor) {
      ts.push('|');
    }
    this.collectText(
        this,
        function(t) {
          if (0 < n && n <= t.length && showCursor) {
            ts.push(t.substr(0, n));
            ts.push('|');
            ts.push(t.substr(n));
          }
          else {
            ts.push(t);
          }
          n -= t.length;
        }
    );
    return ts.join('');
  },

  getCursorInfo: function() {
    var count = this.cursorPos;
    var info = {};
    this.collectText(
        this,
        function(t, n) {
          if (0 <= count && count < t.length) {
            info.nodeAtCursor = n;
            info.offset = count;
          } else if (count === 0) {
            info.nodeAtCursor = n;
            info.offset = t.length;
          }
          count -= t.length;
          if (count === 0) {
            info.nodeAtCursor = n;
            info.offset = t.length;
          }
        }
    );
    if (info.nodeAtCursor === undefined) {
      info.offset = 0;
    }
    return info;
  },

  updateCursor: function() {
    var info = this.getCursorInfo();
    var node = info.nodeAtCursor;
    var offset = info.offset;
    this.appendChild(this.cursor);  // ensure cursor is in the DOM tree

    var rect;
    if (node === undefined) {
      var placeholder = document.createTextNode('|');
      this.insertBefore(placeholder, this.firstChild);
      this.scrollToShow(placeholder);
      rect = this.getBoundingRect(placeholder);
      rect.left -= rect.width;
      rect.right -= rect.width;
      this.removeChild(placeholder);
    } else if (node instanceof Text && 0 < offset && offset < node.data.length) {
      this.scrollToShow(node);
      rect = this.getBoundingRect(node, offset);
    } else if (offset === 0) {
      this.scrollToShow(node);
      rect = this.getBoundingRect(node);
    } else {
      var placeholder = document.createTextNode('|');
      node.parentNode.insertBefore(placeholder, node.nextSibling);
      this.scrollToShow(placeholder);
      rect = this.getBoundingRect(placeholder);
      rect.left -= rect.width;
      rect.right -= rect.width;
      placeholder.parentNode.removeChild(placeholder);
    }

    var editorRect = this.getBoundingClientRect();
    this.cursor.style.top = (rect.top - editorRect.top + this.scrollTop) + 'px';
    this.cursor.style.left = (rect.left - editorRect.left + this.scrollLeft - 1) + 'px';
    this.cursor.style.height = rect.height + 'px';
  },

  scrollToShow: function(node) {
    var rect = this.getBoundingRect(node);
    var isAlreadyShowing =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
        rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    if (isAlreadyShowing) {
      // no-op
    } else if (node instanceof Text) {
      var span = document.createElement('editorSpan');
      node.parentNode.insertBefore(span, node);
      //span.scrollIntoView();
      span.parentNode.replaceChild(node, span);
    } else {
      //node.scrollIntoView();
    }
  },

  collectText: function(node, collectFn, optTreatNestingsAsAtomic) {
    if (node instanceof Text) {
      if (node.data.length > 0) {
        collectFn(node.data, node);
      }
    } else if (node.hasAttribute('source')) {
      var source = node.getAttribute('source');
      if (source.length > 0) {
        collectFn(source, node);
      }
    } else if (optTreatNestingsAsAtomic && node.interval !== undefined) {
      var contents = node.interval.contents;
      if (contents.length > 0) {
        collectFn(contents, node);
      }
    } else {
      node = node.firstChild;
      while (node) {
        var next = node.nextSibling;
        this.collectText(node, collectFn, optTreatNestingsAsAtomic);
        node = next;
      }
    }
  },

  insert: function(thing) {
    var oldText = this.getText();
    if (typeof thing === 'string') {
      thing = document.createTextNode(thing);
    }
    thing = this.createNode('unrecognizedInput', thing);
    var info = this.getCursorInfo();
    if (info.nodeAtCursor === undefined) {
       this.appendChild(thing);
    } else if (info.offset === 0) {
      info.nodeAtCursor.parentNode.insertBefore(thing, info.nodeAtCursor);
    } else if (info.nodeAtCursor instanceof Text) {
      var text = info.nodeAtCursor.data;
      var newTextBefore = document.createTextNode(text.substr(0, info.offset));
      var newTextAfter = document.createTextNode(text.substr(info.offset));
      info.nodeAtCursor.parentNode.insertBefore(newTextAfter, info.nodeAtCursor);
      info.nodeAtCursor.parentNode.insertBefore(thing, newTextAfter);
      info.nodeAtCursor.parentNode.insertBefore(newTextBefore, thing);
      info.nodeAtCursor.parentNode.removeChild(info.nodeAtCursor);
    } else {
      info.nodeAtCursor.parentNode.insertBefore(thing, info.nodeAtCursor.nextSibling);
    }
    this.cursorPos += this.numCharsIn(thing);
    this.changed(oldText, this.getText(), true);
  },

  onfocus: function() {
    var self = this;
    k.setScope(this.editorID);
    this.appendChild(this.cursor);
    setTimeout(function() { self.updateCursor(); }, 0);
  },

  onblur: function() {
    k.setScope('');
  },

  onkeypress: function(e) {
    if (e.charCode > 0 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      this.insert(String.fromCharCode(e.charCode));
      return false;
    } else {
      return true;
    }
  },

  onmousedown: function(e) {
    var target = this.getNodeAt(e.clientX, e.clientY);
    var pos = this.getCursorPosFor(target, e.clientX, e.clientY);
    if (pos >= 0) {
      this.setCursorPos(pos);
    }
  },

  // Helper methods (should be top-level functions once this is turned into a node module)

  getCursorPosFor: function(node, x, y) {
    var self = this;
    var pos = 0;
    var ans = -1;
    this.collectText(
        this,
        function(t, n) {
          if (ans < 0 && n === node) {
            ans = pos + self.indexForPoint(n, x, y);
          }
          pos += t.length;
        }
    );
    return ans;
  },

  indexForPoint: function(node, x, y) {
    if (node instanceof Text && node.data.length > 1) {
      for (var idx = 0; idx < node.data.length; idx++) {
        var rect = this.getBoundingRect(node, idx);
        if (this.boundingRectContains(rect, x, y)) {
          // TODO: do we need to take this.scrollLeft into account?
          return (x - rect.left <= rect.width / 2) ? idx : idx + 1;
        }
      }
      return node.data.length;
    } else {
      var rect = this.getBoundingRect(node);
      return (x - rect.left <= rect.width / 2) ? 0 : this.numCharsIn(node);
    }
  },

  getNodeAt: function(x, y) {
    var self = this;
    var ans;
    this.collectText(
        this,
        function(t, n) {
          if (ans === undefined) {
            if (self.boundingRectContains(self.getBoundingRect(n), x, y)) {
              ans = n;
            }
          }
        }
    );
    return ans;
  },

  getBoundingRect: function(node, optIndex) {
    var rect;
    if (node instanceof Text && typeof optIndex === 'number') {
      var text = node;
      var idx = optIndex;
      var textBefore = document.createTextNode(node.data.substr(0, idx));
      var currChar = document.createElement('editorSpan');
      currChar.appendChild(document.createTextNode(node.data.charAt(idx)));
      var textAfter = document.createTextNode(node.data.substr(idx + 1));
      var replacement = document.createElement('editorSpan');
      replacement.appendChild(textBefore);
      replacement.appendChild(currChar);
      replacement.appendChild(textAfter);
      node.parentNode.replaceChild(replacement, node);
      rect = currChar.getBoundingClientRect();
      replacement.parentNode.replaceChild(node, replacement);
    } else if (node instanceof Text) {
      var span = document.createElement('editorSpan');
      node.parentNode.insertBefore(span, node);
      span.appendChild(node);
      rect = span.getBoundingClientRect();
      span.parentNode.insertBefore(node, span);
      span.parentNode.removeChild(span);
    } else {
      rect = node.getBoundingClientRect();
    }
    return rect;
  },

  boundingRectContains: function(rect, x, y) {
    return rect.left <= x && x <= rect.right &&
           rect.top <= y && y <= rect.bottom;
  },

  createNode: function(tagName /* child1, child2, ... */) {
    var node = document.createElement(tagName);
    for (var idx = 1; idx < arguments.length; idx++) {
      var child = arguments[idx];
      node.appendChild(child);
    }
    return node;
  },

  showTextNodes: function() {
    this.collectText(
        this,
        function(t, n) {
          var cont = document.createElement('cont');
          cont.style.border = "1px solid blue";
          n.parentNode.insertBefore(cont, n);
          cont.appendChild(n);
        }
    );
  }
};

var nextIdNum = 0;

function editorInit() {
  var self = this;

  this.editorID = 'editor_id_' + nextIdNum++;

  var cursor = document.createElement('editorCursor');
  this.cursor = cursor;
  this.cursorPos = 0;
  setInterval(
      function() {
        self.updateCursor();
        cursor.style.visibility = cursor.style.visibility == 'visible' ? 'hidden' : 'visible';
      },
      350
  );

  this.setAttribute('tabindex', '0');  // make it focusable

  k('left',               this.editorID, function() { self.cursorLeft();  return false; });
  k('right',              this.editorID, function() { self.cursorRight(); return false; });
  k('up',                 this.editorID, function() { self.cursorUp();    return false; });
  k('down',               this.editorID, function() { self.cursorDown();  return false; });
  k('home, command+left', this.editorID, function() { self.home();        return false; });
  k('end, command+right', this.editorID, function() { self.end();         return false; });
  k('backspace',          this.editorID, function() { self.backspace();   return false; });
  k('enter',              this.editorID, function() { self.insert('\n');  return false; });
}

