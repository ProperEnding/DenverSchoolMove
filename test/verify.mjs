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
  check('44 hood cards', d.querySelectorAll('#hoodList .card').length === 44);
  check('63 school cards', d.querySelectorAll('#schoolList .card').length === 63);
  d.getElementById('openSettings').click();
  check('drawer opens', d.getElementById('settingsDrawer').classList.contains('open'));
  check('15 sliders', d.querySelectorAll('.slider-row').length === 15);
  d.querySelector('.crit-toggle[data-tkey="schools"]').click();
  check('criterion toggle -> hash', dom.window.location.hash.startsWith('#w=0,'));
  const card = d.querySelector('#hoodList .card');
  card.click();
  check('card expands', card.classList.contains('open'));
  check('card has criteria wheel', !!card.querySelector('.wheel svg'));
  check('ideal path shows E/M/H rows', card.querySelectorAll('.ex-path .ex-lvl').length === 3);
  const privCb = d.querySelector('input[name="schoolType"][value="private"]');
  privCb.click();
  check('uncheck private -> hash t=public,charter', dom.window.location.hash.includes('t=public,charter'));
  check('uncheck private hides private schools', !d.querySelector('#schoolList .chip.t-private'));
  check('type filter hides type seg buttons', d.getElementById('segType').style.display === 'none');
  check('type filter keeps 44 areas', d.querySelectorAll('#hoodList .card').length === 44);
  privCb.click();
  check('recheck private restores schools', d.querySelectorAll('#schoolList .card').length === 63);
  dom.window.renderDetail('hood', 'City Park West');
  const det = d.getElementById('detail');
  check('map detail embeds full hood card', !!det.querySelector('.card.hcard.open'));
  check('map detail card names the hood', det.querySelector('.card .name').textContent === 'City Park West');
  check('map detail card has wheel + ideal path', !!det.querySelector('.wheel svg') && det.querySelectorAll('.ex-path .ex-lvl').length === 3);
  check('map detail card shows live score', /\d\.\d\d/.test(det.querySelector('.score').textContent));
  d.querySelectorAll('script,style').forEach(el => el.remove());
  check('no literal \\u escapes in visible text', !/\\u[0-9a-fA-F]{4}/.test(d.body.textContent));
  check('no personal references in visible text', !/current home|your current life|nicky/i.test(d.body.textContent));
}
{
  const { dom, errors } = load('#w=10,4,8,5,6,1,6,8,4,5,6,4,2,6,5&a=boulder&p=0');
  await tick(400);
  const d = dom.window.document;
  check('no runtime errors (shared)', errors.length === 0);
  check('shared link bypasses quiz', d.getElementById('quizOverlay').hidden);
  check('shared anchor applied', d.getElementById('anchorSel').value === 'boulder');
  check('legacy p= param tolerated, all areas shown', d.querySelectorAll('#hoodList .card').length === 44);
}
{
  const { dom, errors } = load('#w=10,4,8,5,6,1,6,8,4,5,6,4,2,6,5&a=downtown&m=private');
  await tick(400);
  const d = dom.window.document;
  check('no runtime errors (m=private)', errors.length === 0);
  check('legacy m=private maps to private-only checkboxes', d.querySelector('input[name="schoolType"][value="private"]').checked && !d.querySelector('input[name="schoolType"][value="public"]').checked && !d.querySelector('input[name="schoolType"][value="charter"]').checked);
  check('legacy m=private shows only private schools', [...d.querySelectorAll('#schoolList .chip')].some(c => c.classList.contains('t-private')) && !d.querySelector('#schoolList .chip.t-public'));
}
{
  const { dom, errors } = load('#w=10,4,8,5,6,1,6,8,4,5,6,4,2,6,5&a=downtown&t=public,charter');
  await tick(400);
  const d = dom.window.document;
  check('no runtime errors (t=public,charter)', errors.length === 0);
  check('t=public,charter keeps charters, hides private', !!d.querySelector('#schoolList .chip.t-charter') && !d.querySelector('#schoolList .chip.t-private'));
}
console.log(failures.length ? `\n${failures.length} FAILURE(S)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
