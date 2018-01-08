import { h, render } from 'preact-cycle';

const ADD_UNIT = (state, {target}) => {
  const textarea = target.previousElementSibling;
  state.units.push(textarea.value);
  textarea.value = '';
  textarea.focus();
  return state;
};

const SET_SELECTION = (state) => {
  state.selections.unshift(getSelectionHtml());
  return state;
};

const UnitsDisplay = ({}, {units, mutation}) => (
  <units-display onMouseUp={mutation(SET_SELECTION)}>
    {units.map(Unit)}
  </units-display>
);

const Unit = unit => (
  <unit>
    <overlay><span onClick={() => console.log('statistics view')}>s</span></overlay>
    {unit}
  </unit>
);

const UnitAnnotator = ({selection}, {mutation}) => (
  <unit-annotator>
    {selection ? <selection>{selection}</selection> : undefined}
  </unit-annotator>
);

const InputArea = ({}, {mutation}) => (
  <input-area>
    <textarea autoFocus></textarea>
    <button onClick={mutation(ADD_UNIT)}>Add</button>
  </input-area>
);

const Tags = () => (
  <tags>

  </tags>
);

const TagDetail = () => (
  <tag-detail>

  </tag-detail>
);

const WWWPrototype = ({selections}) => (
  <www-prototype>
    <left>
      <UnitsDisplay />
      <InputArea />
    </left>
    <right>
      {selections.map(selection => <UnitAnnotator selection={selection} />)}
      <Tags />
      <TagDetail /> // ?
    </right>
  </www-prototype>
);

render(
  WWWPrototype, {selections: [], units: []}, document.body
);


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
