import { compileContext } from './src/injector/compiler.js';

const state = {
  session_id: 's1',
  groups: ['frontend'],
  items: [
    { tag: 'note', content: 'test 1', group: 'frontend' },
    { tag: 'decision', content: 'test 2', group: 'frontend' },
    { tag: 'task', content: 'test 3', group: 'frontend' },
    { tag: 'constraint', content: 'test 4', group: 'frontend' },
    { tag: 'note', content: 'test 5', group: 'frontend' }
  ]
};

console.time('compile');
const res = compileContext(state, { checkedGroups: ['frontend'] });
console.timeEnd('compile');
console.log('Result length:', res.length);
