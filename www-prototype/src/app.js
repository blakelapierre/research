import { h, render } from 'preact-cycle';

import {groupBy, mapValues} from 'lodash';

function logged (name, fn) {
  return (state, ...args) => {
    state.log.push({name, args});
    return fn(state, ...args);
  };
}

function loggedUnit(obj) {
  for (let key in obj) {
    obj[key] = logged(key, obj[key]);
  }
  return obj;
}

let externalMutation;
function loggedUnits(fn) {
  return loggedUnit(fn(FIRE_EVENT));

  function FIRE_EVENT(name, ...args) {
    externalMutation(name)(...args);
  }
}

const {
  ADD_UNIT,
  PUSH_UNIT,
  CAPTURE_SELECTED_TEXT,
  INSERT_SELECTED_TEXT,
  REMOVE_SELECTION,
  TAG,
  TAG_SELECTION,
  TOGGLE_LOG_DISPLAY
} = loggedUnits(FIRE_EVENT => ({
  'ADD_UNIT': (state, {target}) => {
    const textarea = target.previousElementSibling;
    FIRE_EVENT(PUSH_UNIT, textarea.value);
    textarea.value = '';
    textarea.focus();
    return state;
  },
  'PUSH_UNIT': (state, value) => {
    state.units.push(value);
  },
  'CAPTURE_SELECTED_TEXT': (state) => {
    const selection = getSelectedText().trim();
    if (selection !== undefined && !selection.match(/^\s*$/) && selection !== (state.selections.length > 0 ? state.selections[0] : '')) FIRE_EVENT(INSERT_SELECTED_TEXT, selection);
    return state;
  },
  'INSERT_SELECTED_TEXT': (state, selection) => {
    state.selections.unshift(selection);
    return state;
  },
  'REMOVE_SELECTION': (state, selection) => {
    const index = state.selections.indexOf(selection);
    if (index >= 0) state.selections.splice(index, 1);
    return state;
  },
  'TAG': (state, selection, tag) => {
    state.tags.push({selection, tag});
    return state;
  },
  'TAG_SELECTION': (state, selection, {target}) => {
    const tagInput = target.previousElementSibling;
    FIRE_EVENT(TAG, selection, tagInput.value);
    tagInput.value = '';
    tagInput.focus();
    return state;
  },
  'TOGGLE_LOG_DISPLAY': (state) => {
    state.logDisplay = state.logDisplay === 'full' ? 'summary' : 'full';
    return state;
  }
}));

const UnitsDisplay = ({}, {units, mutation}) => (
  <units-display onMouseUp={mutation(CAPTURE_SELECTED_TEXT)}>
    {units.map(unit => <Unit unit={unit} />)}
  </units-display>
);

const Unit = ({unit}) => (
  <unit>
    {unit}
  </unit>
);

const UnitAnnotator = ({selection}, {mutation}) => (
  <unit-annotator>
    <selection>{selection}</selection>
    <input type="text" placeholder="tag" />
    <button onClick={mutation(TAG_SELECTION, selection)}>Tag</button>
    <button onClick={mutation(REMOVE_SELECTION, selection)}>Remove</button>
  </unit-annotator>
);

const InputArea = ({}, {mutation}) => (
  <input-area>
    <textarea autoFocus></textarea>
    <button onClick={mutation(ADD_UNIT)}>Add</button>
  </input-area>
);

const Selections = ({selections}) => (
  <selections>
    Selections:
    {selections.map(selection => <UnitAnnotator selection={selection} />)}
  </selections>
);

const Tags = ({}, {tags}) => (
  <tags>
    {Object.values(mapValues(groupBy(tags, 'tag'), (selections, tag) => <tag>{tag} {selections.map(s => <selection>{s.selection}</selection>)}</tag>))}
  </tags>
);

const TagDetail = () => (
  <tag-detail>

  </tag-detail>
);

const LogDisplay = ({}, {log, logDisplay, mutation}) => (
  <log onClick={mutation(TOGGLE_LOG_DISPLAY)}>
    Action Log:
    {logDisplay === 'full' ?
       (log.map((v, k) => <entry>{k}: {JSON.stringify(v)}</entry>))
     : <summary>{log.length} items</summary>
    }
  </log>
);

const WWWPrototype = ({selections}, {mutation}) => (
  <www-prototype>
    {externalMutation = mutation}
    <left>
      <UnitsDisplay />
      <InputArea />
    </left>
    <right>
      <side-by-side>
        {selections.length > 0 ? <Selections selections={selections} /> : undefined}
        <Tags />
        <TagDetail />
      </side-by-side>
      <LogDisplay />
    </right>
  </www-prototype>
);

render(
  WWWPrototype, {selections: [], tags: [], units: [], log: []}, document.body
);


function getSelectedText() {
  if (window.getSelection) return window.getSelection().toString();
}

//https://stackoverflow.com/questions/4176923/html-of-selected-text

function getSelectionHtml() {
    var html = "";
    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var container = document.createElement("div");
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }
            html = container.innerHTML;
        }
    } else if (typeof document.selection != "undefined") {
        if (document.selection.type == "Text") {
            html = document.selection.createRange().htmlText;
        }
    }
    return html;
}
