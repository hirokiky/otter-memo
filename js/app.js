ko.bindingHandlers['codeMirror'] = {
  init: function(element, valueAccessor, allBindings) {
    this.mainCode = CodeMirror.fromTextArea(
      element,
      {
        mode: "markdown",
        lineNumbers: true
      }
    );
    this.mainCode.on('change', function (cm) {
      var value = valueAccessor();
      value(cm.getValue());
    });
    ko.bindingHandlers['value'].init(element, valueAccessor, allBindings);
  },
  update: ko.bindingHandlers['value'].update
};

var OtterViewModel = function() {
  var self = this;
  self.code = ko.observable().extend({persist: 'otterCode'});
};

window.addEventListener("load", function() {
  ko.applyBindings(new OtterViewModel());
});
