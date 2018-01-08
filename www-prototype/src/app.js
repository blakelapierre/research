import { h, render } from 'preact-cycle';

const ADD_POST = (state, {target}) => {
  const textarea = target.previousElementSibling;
  state.posts.push(textarea.value);
  textarea.value = '';
  textarea.focus();
  return state;
};

const POSTSDisplay = ({}, {posts}) => (
  <posts-display>
    {posts.map(POST)}
  </posts-display>
);

const POST = post => (
  <post>
    <overlay><span onClick={() => console.log('statistics view')}>s</span></overlay>
    {post}
  </post>
);

const InputArea = ({}, {mutation}) => (
  <input-area>
    <textarea autoFocus></textarea>
    <button onClick={mutation(ADD_POST)}>Post</button>
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

const WWWPrototype = () => (
  <www-prototype>
    <left>
      <POSTSDisplay />
      <InputArea />
    </left>
    <right>
      <Tags />
      <TagDetail /> // ?
    </right>
  </www-prototype>
);

render(
  WWWPrototype, {posts: []}, document.body
);