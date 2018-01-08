import { h, render } from 'preact-cycle';

const POST = (state, {target}) => {
  state.posts.push(target.previousElementSibling.value);
  target.previousElementSibling.value = '';
  return state;
};

const POSTSDisplay = ({}, {posts}) => (
  <posts-display>
    {posts.map(post => post)}
  </posts-display>
);

const InputArea = ({}, {mutation}) => (
  <input-area>
    <textarea autoFocus></textarea>
    <button onClick={mutation(POST)}>Post</button>
  </input-area>
);

const WWWPrototype = () => (
  <www-prototype>
    <InputArea />
    <POSTSDisplay />
  </www-prototype>
);

render(
  WWWPrototype, {posts: []}, document.body
);