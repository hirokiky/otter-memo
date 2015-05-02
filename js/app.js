function subscribeInnerChanges(target, observableGetter, innerSubscriber) {
  target.subscribe(function(changes) {
    changes.forEach(function(change) {
      if (change.status === 'added') {
        // Subscriber for sorting.
        observableGetter(change.value).subscribe(function(newValue) {
          innerSubscriber(newValue);
        })
      }
    });
  }, null, 'arrayChange');
}

ko.bindingHandlers['codeMirror'] = {
  init: function(element, valueAccessor, allBindings) {
    var value = valueAccessor();
    var doc = value.doc;
    var mainCode = CodeMirror.fromTextArea(
      element,
      {
        mode: "markdown",
        lineNumbers: true
      }
    );
    if (doc.getEditor()) {
      doc = doc.linkedDoc({sharedHist: true});
    }
    mainCode.swapDoc(doc);
    mainCode.focus();
    ko.bindingHandlers['value'].init(element, valueAccessor, allBindings);
  },
  update: ko.bindingHandlers['value'].update
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
  var observableGetter, order;

  if (option.observableGetter) {
    observableGetter = option.observableGetter;
  } else {
    observableGetter = function(value) { return value };
  }
  if (option.order) {
    order = option.order;
  } else {
    order = 'asc'
  }

  target._isSorting = false;  // Not to call recursive.

  // Subscribe added elements to apply subscriber for sorting.
  subscribeInnerChanges(target, observableGetter, function() {
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
        target._isSorting = false;
      }
    }
  });
  return target
};


ko.extenders['arrayLocalStorage'] = function(target, option) {
  var key = option.key || '';
  var innerClass = option.innerClass || undefined;
  var observableGetter = option.observableGetter || function(e) {return e};

  function parseJsonWithClass(jsonValue) {
    var parsed = JSON.parse(jsonValue);
    return parsed.map(function(data) {
      if (innerClass) {
        return new innerClass(data)
      } else {
        return data
      }
    });
  }
  function saveArray() {
    localStorage.setItem(key, ko.toJSON(target()));
  }
  var initialValue = target();

  // Load existing value from localStorage if set
  if (key && localStorage.getItem(key) !== null) {
    try {
      initialValue = parseJsonWithClass(localStorage.getItem(key));
    } catch (e) {
    }
  }
  // Subscribe to new values and add them to localStorage
  target.subscribe(saveArray);
  subscribeInnerChanges(target, observableGetter, saveArray);

  target(initialValue);

  return target;
};


ko.extenders['indexLocalStorage'] = function(target, option) {
  var key = option.key || '';
  var targetObservableArray = option.targetObservableArray;
  function setIndex() {
    var idx = targetObservableArray.indexOf(target());
    localStorage.setItem(key, ko.toJSON(idx));
  }

  var initialValue = target();
  // Load existing value from localStorage if set
  if (key && localStorage.getItem(key) !== null) {
    try {
      var initialIdx = JSON.parse(localStorage.getItem(key));
      initialValue = targetObservableArray()[initialIdx];
    } catch (e) {
    }
  }
  target.subscribe(setIndex);
  targetObservableArray.subscribe(setIndex);

  target(initialValue);

  return target;
};


ko.extenders['asCodeMirrorDoc'] = function(target, option) {
  target.doc = new CodeMirror.Doc("", "markdown", 0);

  target.doc.on('change', function() {
    if (target() != target.doc.getValue()) {
      target(target.doc.getValue())
    }
  });
  target.subscribe(function() {
    if (target() != target.doc.getValue()) {
      target.doc.setValue(target());
    }
  });

  // Initial
  target.doc.setValue(target());
};


var Memo = function(data) {
  var self = this;

  self.text = ko.observable(data.text || "").
    extend({timestamp: "", asCodeMirrorDoc: ""});
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
  self.memos = ko.observableArray([new Memo({})]).
    extend({sortedBy: {observableGetter: function(memo) {return memo.text.updated},
      order: 'desc'},
      arrayLocalStorage: {observableGetter: function(memo) {return memo.text},
        key: "otterMemo-memos",
        innerClass: Memo}});
  self.numMemos = ko.pureComputed(function() {
    return self.memos().length
  });
  // Use observable directly instead of computed,
  // not to flush the memo pad when the memos automatically sorted.
  // Actually this can be implemented by ko.computed with self.memos and self.chosenMemoIdx.
  self.chosenMemo = ko.observable(self.memos()[0]).
    extend({indexLocalStorage: {targetObservableArray: self.memos,
      key: "otterMemo-chosenMemo"}});
  self.isShownDeleteConfirm = ko.observable(false);

  self.chooseMemo = function(memo) {
    self.chosenMemo(memo);
    return true
  };
  self.addMemo = function() {
    var memo = new Memo({});
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
      self.memos([new Memo({})]);
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

  self.undo = function() {
    self.chosenMemo().text.doc.undo();
    return true;
  };
  self.redo = function() {
    self.chosenMemo().text.doc.redo();
    return true;
  };
};

window.addEventListener("load", function() {
  ko.applyBindings(new OtterViewModel());
});
