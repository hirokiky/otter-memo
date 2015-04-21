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
  update: ko.bindingHandlers['value'].update
};


var Memo = function() {
  var self = this;

  self.text = ko.observable("default");
  self.updatedAt = new Date();
  self.createdAt = new Date();

  self.title = ko.computed(function() {
    // FIXME: Take title from CodeMirror.title
    return self.text().split('\n')[0]
  });
};


var OtterViewModel = function() {
  var self = this;
  self.memos = ko.observableArray().extend({persist: 'otterMemos'});
  self.numMemos = ko.computed(function() {
    return self.memos().length
  });
  self.chosenMemoIdx = ko.observable();
  self.chosenMemo = ko.computed(function() {
    return self.memos()[self.chosenMemoIdx()]
  });

  self.memos([new Memo()]);
  self.chosenMemoIdx(0);
};

window.addEventListener("load", function() {
  ko.applyBindings(new OtterViewModel());
});
