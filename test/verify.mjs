// Headless verification for index.html — run with: npm test
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const file = process.argv[2] || 'index.html';
const html = readFileSync(file, 'utf8').replace(/<script src="https:[^"]*"><\/script>/g, '');
const failures = [];
const check = (name, ok) => { console.log((ok ? '  ok  ' : ' FAIL ') + name); if (!ok) failures.push(name); };
const load = (hash = '') => {
  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'file:///x.html' + hash });
  dom.window.onerror = m => errors.push(String(m));
  return { dom, errors };
};
const tick = ms => new Promise(r => setTimeout(r, ms));

{
  const { dom, errors } = load();
  await tick(400);
  const d = dom.window.document;
  check('no runtime errors (fresh)', errors.length === 0);
  check('quiz shows on fresh load', !d.getElementById('quizOverlay').hidden);
  [0, 0, 0, 0, 0, 0, 1, 1].forEach(a => d.querySelectorAll('#quizOpts .quiz-opt')[a].click());
  check('quiz completes', d.getElementById('quizOverlay').hidden);
  check('persona set', d.getElementById('personaName').textContent === 'Your quiz result');
  check('hash written', dom.window.location.hash.startsWith('#w='));
  check('40 hood cards', d.querySelectorAll('#hoodList .card').length === 40);
  check('63 school cards', d.querySelectorAll('#schoolList .card').length === 63);
  d.getElementById('openSettings').click();
  check('drawer opens', d.getElementById('settingsDrawer').classList.contains('open'));
  check('14 sliders', d.querySelectorAll('.slider-row').length === 14);
  d.querySelector('.crit-toggle[data-tkey="schools"]').click();
  check('criterion toggle -> hash', dom.window.location.hash.startsWith('#w=0,'));
  d.getElementById('fPersonal').click();
  check('personal entry hides', ![...d.querySelectorAll('#hoodList .card .name')].some(n => /current home/.test(n.textContent)));
  const card = d.querySelector('#hoodList .card');
  card.click();
  check('card expands', card.classList.contains('open'));
  d.querySelectorAll('script,style').forEach(el => el.remove());
  check('no literal \\u escapes in visible text', !/\\u[0-9a-fA-F]{4}/.test(d.body.textContent));
}
{
  const { dom, errors } = load('#w=10,4,8,6,1,6,8,4,5,6,4,2,6,5&a=boulder&p=0');
  await tick(400);
  const d = dom.window.document;
  check('no runtime errors (shared)', errors.length === 0);
  check('shared link bypasses quiz', d.getElementById('quizOverlay').hidden);
  check('shared anchor applied', d.getElementById('anchorSel').value === 'boulder');
  check('shared hides personal', ![...d.querySelectorAll('#hoodList .card .name')].some(n => /current home/.test(n.textContent)));
}
console.log(failures.length ? `\n${failures.length} FAILURE(S)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
