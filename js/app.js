ko.bindingHandlers['codeMirror'] = {
  init: function(element, valueAccessor, allBindings) {
    var value = valueAccessor();
    var mainCode = CodeMirror.fromTextArea(
      element,
      {
        mode: "markdown",
        lineNumbers: true
      }
    );
    mainCode.on('change', function (cm) {
      value(cm.getValue());
    });

    value.mainCode = mainCode;

    ko.bindingHandlers['value'].init(element, valueAccessor, allBindings);
  },
  update: function(element, valueAccessor, allBindings){
    var value = valueAccessor();
    if (value() != value.mainCode.getValue()) {
      value.mainCode.setValue(value());
    }
    ko.bindingHandlers['value'].update(element, valueAccessor, allBindings)
  }
};


var Memo = function() {
  var self = this;

  self.text = ko.observable("");
  self.updatedAt = new Date();
  self.createdAt = new Date();

  self.title = ko.computed(function() {
    // FIXME: Take title from CodeMirror.title
    var title = self.text().split('\n')[0];
    if (!title) {
      return '(no title)'
    }
    return title
  });
};


var OtterViewModel = function() {
  var self = this;
  // TODO: Sort it by ordering updateAt.
  self.memos = ko.observableArray().extend({persist: 'otterMemos'});
  self.numMemos = ko.computed(function() {
    return self.memos().length
  });
  self.chosenMemoIdx = ko.observable();
  self.chosenMemo = ko.computed(function() {
    return self.memos()[self.chosenMemoIdx()]
  });

  self.chooseMemo = function(memo) {
    self.chosenMemoIdx(self.memos.indexOf(memo));
    return true
  };
  self.addMemo = function() {
    self.memos.unshift(new Memo());
    return true
  };

  self.memos([new Memo()]);
  self.chosenMemoIdx(0);
};

window.addEventListener("load", function() {
  ko.applyBindings(new OtterViewModel());
});
