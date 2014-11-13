function createTreeEditor() {
  var self = editor.create();
  self.setAttribute('id', 'tree');

  var g = ohm.namespace('demo').getGrammar('Arithmetic');

  var render = {
    _default: function(ruleName, args) {
      for (var idx = 0; idx < args.length; idx++) {
        args[idx].value;
      }
      if (ruleName.indexOf('_') === -1) {
        self.nest(this.interval, document.createElement(ruleName));
      }
    }
  };

  self.render = function(text) {
    var thunk = g.matchContents(text, 'Expr');
    if (thunk) {
      thunk(render);
      setTimeout(function() { self.removeAttribute('class'); }, 0);
    } else if (text.length > 0) {
      setTimeout(function() { self.setAttribute('class', 'oops'); }, 0);
    }
  };

  return self;
}

