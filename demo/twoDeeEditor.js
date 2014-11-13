function createTwoDeeEditor() {
  var self = editor.create();
  self.setAttribute('id', 'twoDee');

  var g = ohm.namespace('demo').getGrammar('Arithmetic');
  
  var constants = {pi: Math.PI, e: Math.E};
  var interpret = {
    Expr:           function(expr)           { return expr.value; },
    AddExpr:        function(expr)           { return expr.value; },
    AddExpr_plus:   function(x, op, y)       { return x.value + y.value; },
    AddExpr_minus:  function(x, op, y)       { return x.value - y.value; },
    MulExpr:        function(expr)           { return expr.value; },
    MulExpr_times:  function(x, op, y)       { return x.value * y.value; },
    MulExpr_divide: function(x, op, y)       { return x.value / y.value; },
    ExpExpr:        function(expr)           { return expr.value; },
    ExpExpr_power:  function(x, op, y)       { return Math.pow(x.value, y.value); },
    PriExpr:        function(expr)           { return expr.value; },
    PriExpr_paren:  function(open, e, close) { return e.value; },
    ident:          function()               { return constants[this.interval.contents]; },
    number:         function()               { return parseFloat(this.interval.contents); }
  };

  var render = {
    Expr: function(expr) {
      expr.value;
    },

    AddExpr: function(expr) {
      expr.value;
    },
    AddExpr_plus: function(x, op, y) {
      x.value;
      op.value;
      y.value;
      self.nest(op.interval, document.createElement('operator'));
      self.nest(this.interval, document.createElement('plus'));
    },
    AddExpr_minus: function(x, op, y) {
      x.value;
      op.value;
      y.value;
      self.decorate(op.interval, document.createElement('operator'), '\u2212');
      self.nest(this.interval, document.createElement('minus'));
    },
    MulExpr: function(expr) {
      return expr.value;
    },
    MulExpr_times: function(x, op, y) {
      x.value;
      op.value;
      y.value;
      self.decorate(op.interval, document.createElement('operator'), '\u00D7');
      self.nest(this.interval, document.createElement('times'));
    },
    MulExpr_divide: function(x, op, y) {
      x.value;
      op.value;
      y.value;
      self.decorate(op.interval, document.createElement('span'));
      self.nest(x.interval.coverageWith(op.interval), document.createElement('numerator'));
      self.nest(y.interval, document.createElement('denominator'));
      self.nest(this.interval, document.createElement('fraction'));
    },
    ExpExpr: function(expr) {
      return expr.value;
    },
    ExpExpr_power: function(x, op, y) {
      x.value;
      op.value;
      y.value;
      self.nest(x.interval, document.createElement('theBase'));
      self.nest(op.interval, document.createElement('gray'));
      self.nest(op.interval.coverageWith(y.interval), document.createElement('exponent'));
      self.nest(this.interval, document.createElement('power'));
    },
    PriExpr: function(expr) {
      return expr.value;
    },
    PriExpr_paren: function(open, e, close) {
      open.value;
      e.value;
      close.value;
      self.nest(open.interval, document.createElement('gray'));
      self.nest(close.interval, document.createElement('gray'));
      self.nest(this.interval, document.createElement('paren'));
    },
    ident: function() {
      if (this.interval.contents === 'pi') {
        self.decorate(this.interval, document.createElement('ident'), '\u03C0');
      } else {
        self.nest(this.interval, document.createElement('ident'));
      }
    },
    number: function() {
      var n = createNumber();
      n.valueChangeEventListener = function(e) {
        var pos = self.getCursorPos(n) + self.numCharsIn(n);
        self.changed('', self.getText(), true);
        self.setCursorPos(pos);
      };
      n.addEventListener('valuechange', n.valueChangeEventListener, false);
      numbers.push(n);
      self.nest(this.interval, n);
    }
  };

  var numbers = [];
  self.render = function(text) {
    var thunk = g.matchContents(text, 'Expr');
    if (thunk) {
      while (numbers.length > 0) {
        var n = numbers.pop();
        n.removeEventListener('valuechange', n.valueChangeEventListener);
      }
      this.removeAttribute('class');
      this.setAttribute('value', ' = ' + thunk(interpret));
      thunk(render);
    } else {
      if (text.length > 0) {
        this.setAttribute('class', 'oops');
      }
      this.setAttribute('value', '');
    }
  };

  return self;
}

