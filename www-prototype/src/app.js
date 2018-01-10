import { h, render } from 'preact-cycle';

import {throttle, filter, find, groupBy, mapValues} from 'lodash';

const sessionId = getLastSessionId() + 1,
      sessionMeta = {sessionId, start: new Date().getTime(), actions: 0};

localStorage.setItem('research-last-session-id', sessionId);
saveSessionMeta(sessionMeta);

const previousSessions = [];
loadPreviousSessions();
function loadPreviousSessions() {
  previousSessions.splice(0, previousSessions.length);

  for (let i = sessionId - 1; i >= 0; i--) {
    const session = localStorage.getItem(`research-session-${i}-meta`);
    if (session) {
      const meta = JSON.parse(session);
      if (meta.actions > 0) previousSessions.push(meta);
    }
  }
}

function getLastSessionId() {
  const id = localStorage.getItem('research-last-session-id') || '-1';
  try {
    return parseInt(id);
  }
  catch (e) { return -1; }
  return -1;
}

function saveSessionMeta(sessionMeta) {
  localStorage.setItem(`research-session-${sessionId}-meta`, JSON.stringify(sessionMeta));
}

function saveSession(log) {
  sessionMeta.actions = log.length;
  localStorage.setItem(`research-session-${sessionId}`, JSON.stringify(log));
  saveSessionMeta(sessionMeta);
}

window.addEventListener('close', () => saveSession(state.log))

const saveSessionThrottled = throttle(saveSession, 1000);

function logged (name, fn) {
  return (state, ...args) => {
    state.log.push([name, ...filter(args, arg => !(arg instanceof Event))]);
    saveSessionThrottled(state.log);
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

const actions = loggedUnits(FIRE_EVENT => ({
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
  'LOAD_SESSION': (state, session) => {
    const logData = localStorage.getItem(`research-session-${session.sessionId}`);
    if (logData) {
      const parsedData = JSON.parse(logData);

      parsedData.forEach(([name, ...args]) => {
        FIRE_EVENT(actions[name], ...args);
      });
    }
    return state;
  },
  'REMOVE_SELECTION': (state, selection) => {
    const index = state.selections.indexOf(selection);
    if (index >= 0) state.selections.splice(index, 1);
    return state;
  },
  'REMOVE_SESSION': (state, sessionId) => {
    localStorage.removeItem(`research-session-${sessionId}`);
    localStorage.removeItem(`research-session-${sessionId}-meta`);
    loadPreviousSessions();
    return state;
  },
  'SET_TAG': (state, tag, value) => {
    find(state.tags, {tag: tag.tag, selection: tag.selection}).tag = value;
    // tag.tag = value;
    return state;
  },
  'SET_NOTES': (state, tag, value) => {
    const t = find(state.tags, {tag: tag.tag, selection: tag.selection});
    // const t = find(state.tags, t => t.tag === tag.tag && t.selection === tag.selection );

    if (t) t.notes = value;
    // tag.notes = value;
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

const {
  ADD_UNIT,
  CHECK_SELECTED_TEXT,
  INSERT_SELECTED_TEXT,
  HIGHLIGHT_TAG,
  LOAD_SESSION,
  REMOVE_SELECTION,
  REMOVE_SESSION,
  SET_TAG,
  SET_NOTES,
  TAG_SELECTION,
  TOGGLE_LOG_DISPLAY
} = actions;

const PreviousSessions = ({}, {previousSessions, mutation}) => (
  <previous-sessions>
    <span>Saved Sessions</span>
    {previousSessions.map(session => <session onClick={mutation(LOAD_SESSION, session)}>({session.actions}) {new Date(session.start).toString()} <button onClick={event => {
      event.stopPropagation();
      if (confirm("Are you sure you want to remove this session?")) {
        return mutation(REMOVE_SESSION)(session.sessionId);
      }
    }}>Remove</button></session>)}
  </previous-sessions>
);

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
    <input type="text" value={tag.tag} onBlur={(m => event => m(event.target.value))(mutation(SET_TAG, tag))} />
    <textarea placeholder="notes" value={tag.notes} onBlur={(m => event => m(event.target.value))(mutation(SET_NOTES, tag))}></textarea>
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
  {filter(tags, ({tag: tag2}) => tag === tag2).map(t => <selection>{t.selection} {t.notes}</selection>)}
  </tag-detail>
);

const Log = ({}, {log, logDisplay, mutation}) => (
  <log>
    <span onClick={mutation(TOGGLE_LOG_DISPLAY)}>Action Log:</span>
    {logDisplay === 'full' ?
      <FullLog log={log} /> :
      <LogSummary log={log} />}
  </log>
);

const FullLog = ({log}) => (
  <full-log>
    {log.map((v, k) => <entry>{k}: {JSON.stringify(v)}</entry>)}
  </full-log>
);

const LogSummary = ({log}) => (
  <summary>
    {log.length} items

    <button>Save File</button>
    <button>Load File</button>
  </summary>
);

const WWWPrototype = ({highlightedTag, previousSessions, selections, tags}, {mutation}) => (
  <www-prototype>
    {externalMutation = mutation}
    {previousSessions.length > 0 ? <PreviousSessions /> : undefined}
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
      <Log />
    </right>
  </www-prototype>
);

const state = {selections: [], tags: [], units: [], log: [], previousSessions};
render(
  WWWPrototype, state, document.body
);
console.dir(state);


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
