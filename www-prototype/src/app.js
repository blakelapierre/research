import { h, render } from 'preact-cycle';

import {filter, groupBy, mapValues} from 'lodash';

function logged (name, fn) {
  return (state, ...args) => {
    state.log.push([name, ...filter(args, arg => !(arg instanceof Event))]);
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
    return externalMutation(name)(...args);
  }
}

const previousElementSiblingValue = ({target}) => target.previousElementSibling.value;

const {
  ADD_UNIT,
  CHECK_SELECTED_TEXT,
  INSERT_SELECTED_TEXT,
  HIGHLIGHT_TAG,
  REMOVE_SELECTION,
  SET_TAG,
  SET_NOTES,
  TAG_SELECTION,
  TOGGLE_LOG_DISPLAY
} = loggedUnits(FIRE_EVENT => ({
  'ADD_UNIT': (state, value) => {
    if (value !== '') state.units.push(value);
    return state;
  },
  'CHECK_SELECTED_TEXT': (state) => {
    const selection = getSelectedText().trim();
    if (selection !== undefined
        && !selection.match(/^\s*$/)
        && selection !== (state.selections.length > 0 ? state.selections[0] : '')) {
      return FIRE_EVENT(INSERT_SELECTED_TEXT, selection);
    }
    return state;
  },
  'INSERT_SELECTED_TEXT': (state, selection) => {
    state.selections.unshift(selection);
    return state;
  },
  'HIGHLIGHT_TAG': (state, tag) => {
    state.highlightedTag = tag;
    console.log('highlighted', tag);
    return state;
  },
  'REMOVE_SELECTION': (state, selection) => {
    const index = state.selections.indexOf(selection);
    if (index >= 0) state.selections.splice(index, 1);
    return state;
  },
  'SET_TAG': (state, tag, {target:{value}}) => {
    tag.tag = value;
    return state;
  },
  'SET_NOTES': (state, tag, {target:{value}}) => {
    tag.notes = value;
    return state;
  },
  'TAG_SELECTION': (state, selection, tag) => {
    const notes = '';
    state.tags.push({selection, tag, notes});
    return state;
  },
  'TOGGLE_LOG_DISPLAY': (state) => {
    state.logDisplay = state.logDisplay === 'full' ? 'summary' : 'full';
    return state;
  }
}));

const UnitsDisplay = ({}, {units, mutation}) => (
  <units-display onMouseUp={mutation(CHECK_SELECTED_TEXT)}>
    {units.map(unit => <Unit unit={unit} />)}
  </units-display>
);

const Unit = ({unit}) => (
  <unit>
    {unit}
  </unit>
);

const UnitAnnotator = ({selection}, {tags, mutation}) => (
  <unit-annotator>
    <remove-button onClick={mutation(REMOVE_SELECTION, selection)} title="Remove">Remove Selection</remove-button>
    <selection>{selection}</selection>
    <inputs>
      <input type="text" placeholder="add a tag..." autoFocus />
      <button onClick={(m => event => {m(previousElementSiblingValue(event)); event.target.previousElementSibling.value = ''; event.target.previousElementSibling.focus();})(mutation(TAG_SELECTION, selection))}>Tag</button>
    </inputs>
    <unit-tags>
      {(Object.values(groupBy(tags, 'selection')[selection] || []).map(tag => <TagEditor tag={tag} />))}
    </unit-tags>
  </unit-annotator>
);

const TagEditor = ({tag}, {mutation}) => (
  <tag-editor>
    <input type="text" value={tag.tag} onBlur={mutation(SET_TAG, tag)} />
    <textarea placeholder="notes" onBlur={mutation(SET_NOTES, tag)}></textarea>
  </tag-editor>
);

const InputArea = ({}, {mutation}) => (
  <input-area>
    <textarea autoFocus></textarea>
    <button onClick={(m => event => {m(previousElementSiblingValue(event)); event.target.previousElementSibling.value = ''; event.target.previousElementSibling.focus();})(mutation(ADD_UNIT))}>Add</button>
  </input-area>
);

const Selections = ({selections}) => (
  <selections>
    Active Selections:
    {selections.map(selection => <UnitAnnotator selection={selection} />)}
  </selections>
);

const Tags = ({tags}, {}) => (
  <tags>
    <span>Tags:</span>
    {Object.values(mapValues(groupBy(tags, 'tag'), (selections, tag) => <Tag tag={tag} selections={selections} />))}
  </tags>
);

const Tag = ({tag, selections}, {highlightedTag, mutation}) => (
  <tag className={{'highlighted': tag === highlightedTag}} onClick={mutation(HIGHLIGHT_TAG, tag)}>
    <name>{tag}</name>
    <count>({selections.length})</count>
  </tag>
);

const TagDetail = ({tag}, {tags}) => (
  <tag-detail>
    {JSON.stringify(filter(tags, ({tag: tag2}) => tag === tag2))}
  </tag-detail>
);

const LogDisplay = ({}, {log, logDisplay, mutation}) => (
  <log>
    <span onClick={mutation(TOGGLE_LOG_DISPLAY)}>Action Log:</span>
    {logDisplay === 'full' ?
       (log.map((v, k) => <entry>{k}: {JSON.stringify(v)}</entry>))
     : <summary>{log.length} items</summary>
    }
  </log>
);

const WWWPrototype = ({highlightedTag, selections, tags}, {mutation}) => (
  <www-prototype>
    {externalMutation = mutation}
    <left>
      <UnitsDisplay />
      <InputArea />
    </left>
    <right>
      <side-by-side>
        {selections.length > 0 ? <Selections selections={selections} /> : undefined}
        &nbsp;
        {tags.length > 0 ? <Tags tags={tags} /> : undefined}
        {highlightedTag ? <TagDetail tag={highlightedTag} /> : undefined}
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
