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


ko.extenders['timestamp'] = function(target, option) {
  target.created = ko.observable(new Date());
  target.updated = ko.observable(new Date());

  target.subscribe(function() {
    target.updated(new Date());
  });
  return target
};


ko.extenders['sortedBy'] = function(target, option) {
  var observableGetter, postSorted, order;

  if (option.observableGetter) {
    observableGetter = option.observableGetter;
  } else {
    observableGetter = function(value) { return value };
  }
  if (option.postSorted) {
    postSorted = option.postSorted;
  } else {
    postSorted = function() {};
  }
  if (option.order) {
    order = option.order;
  } else {
    order = 'asc'
  }

  target._isSorting = false;  // Not to call recursive.

  // Subscribe added elements to apply subscriber for sorting.
  target.subscribe(function(changes) {
    changes.forEach(function(change) {
      if (change.status === 'added') {
        // Subscriber for sorting.
        observableGetter(change.value).subscribe(function() {
          if (!target._isSorting) {  // Not to call recursive.

            // Get the current array value and try to sort.
            var originalArray = target();
            var sorted = originalArray.concat().sort(function(left, right) {
              if (observableGetter(left)() == observableGetter(right)){
                return 0
              }
              if (order === 'asc') {
                return observableGetter(left)() < observableGetter(right)() ? -1 : 1
              } else {
                return observableGetter(left)() > observableGetter(right)() ? -1 : 1
              }
            });

            // If the sorted value is as same as original, won't change the observable.
            var shouldBeSorted = false;
            sorted.forEach(function(sortedElement, idx) {
              if (sortedElement !== originalArray[idx]) {
                shouldBeSorted = true;
              }
            });
            if (shouldBeSorted) {
              target._isSorting = true;
              target(sorted);
              postSorted();
              target._isSorting = false;
            }
          }
        })
      }
    });
  }, null, 'arrayChange');
  return target
};


var Memo = function() {
  var self = this;

  self.text = ko.observable("").extend({timestamp: ""});
  self.title = ko.pureComputed(function() {
    // FIXME: Take title from CodeMirror.title
    var title = self.text().split('\n')[0];
    if (!title.trim()) {
      return '(no title)'
    }
    return title
  });
};


var OtterViewModel = function() {
  var self = this;
  self.memos = ko.observableArray().
    extend({persist: 'otterMemos'}).
    extend({sortedBy: {observableGetter: function(memo) {return memo.text.updated},
                       order: 'desc'}});
  self.numMemos = ko.computed(function() {
    return self.memos().length
  });
  // Use observable directly instead of computed,
  // not to flush the memo pad when the memos automatically sorted.
  // Actually this can be implemented by ko.computed with self.memos and self.chosenMemoIdx.
  self.chosenMemo = ko.observable();
  self.isShownDeleteConfirm = ko.observable(false);

  self.chooseMemo = function(memo) {
    self.chosenMemo(memo);
    return true
  };
  self.addMemo = function() {
    var memo = new Memo();
    self.memos.unshift(memo);
    self.chosenMemo(memo);
    return true
  };
  self.deleteMemo = function() {
    //     +-- idx
    //     |
    // [a, b, c, d]
    //        |
    //        +-----last_idx
    var idx = self.memos.indexOf(self.chosenMemo());
    var last_idx = self.numMemos() - 2;

    self.memos.remove(self.chosenMemo());

    if (idx > last_idx) {
      self.chosenMemo(self.memos()[last_idx]);
    } else {
      self.chosenMemo(self.memos()[idx])
    }
    if (self.numMemos() == 0) {
      self.memos.removeAll();
      self.memos([new Memo()]);
      self.chosenMemo(self.memos()[0]);
    }
    self.isShownDeleteConfirm(false);
  };

  self.showDeleteConfirm = function() {
    self.isShownDeleteConfirm(true);
  };
  self.hideDeleteConfirm = function() {
    self.isShownDeleteConfirm(false);
  };

  self.memos([new Memo()]);
  self.chosenMemo(self.memos()[0])
};

window.addEventListener("load", function() {
  ko.applyBindings(new OtterViewModel());
});
