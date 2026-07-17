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
  check('48 hood cards', d.querySelectorAll('#hoodList .card').length === 48);
  check('every card carries a district stripe class', [...d.querySelectorAll('#hoodList .card')].every(c => [...c.classList].some(cl => /^g-(dps|bvsv|cherry|other)$/.test(cl))));
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
  check('wheel hit sectors tile all 15 criteria', card.querySelectorAll('.wheel svg path.whit[data-ckey]').length === 15);
  const read = card.querySelector('.wheel-read');
  check('wheel readout shows idle prompt', /hover a wedge/i.test(read.textContent));
  card.querySelector('.wheel svg path[data-ckey="schools"]').dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true }));
  check('hover fills the fixed readout', /Schools \(guaranteed by address\)/.test(read.textContent) && /\/10/.test(read.textContent) && /lottery/.test(read.textContent));
  card.querySelector('.wheel svg path[data-ckey="schools"]').dispatchEvent(new dom.window.MouseEvent('mouseout', { bubbles: true }));
  card.querySelector('.wheel svg path[data-ckey="alt"]').dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true }));
  check('wedge-to-wedge swap skips idle flash', /Private & charter access/.test(read.textContent) && !/hover a wedge/i.test(read.textContent));
  card.querySelector('.wheel svg path[data-ckey="alt"]').dispatchEvent(new dom.window.MouseEvent('mouseout', { bubbles: true }));
  await tick(250);
  check('readout returns to idle after grace period', /hover a wedge/i.test(read.textContent));
  const descs = [...html.matchAll(/desc:'([^']+)'/g)].map(m => m[1]);
  check('wheel descs fit the 2-line readout budget (15 × ≤80 chars)', descs.length === 15 && descs.every(s => s.length <= 80));
  const privCb = d.querySelector('input[name="schoolType"][value="private"]');
  privCb.click();
  check('uncheck private -> hash t=public,charter', dom.window.location.hash.includes('t=public,charter'));
  check('uncheck private hides private schools', !d.querySelector('#schoolList .chip.t-private'));
  check('type filter hides type seg buttons', d.getElementById('segType').style.display === 'none');
  check('type filter keeps 48 areas', d.querySelectorAll('#hoodList .card').length === 48);
  privCb.click();
  check('recheck private restores schools', d.querySelectorAll('#schoolList .card').length === 63);
  dom.window.renderDetail('hood', 'City Park West');
  const det = d.getElementById('detail');
  check('map detail embeds full hood card', !!det.querySelector('.card.hcard.open'));
  check('map detail card names the hood', det.querySelector('.card .name').textContent === 'City Park West');
  check('map detail card has wheel + ideal path', !!det.querySelector('.wheel svg') && det.querySelectorAll('.ex-path .ex-lvl').length === 3);
  check('map detail card shows live score', /\d\.\d\d/.test(det.querySelector('.score').textContent));
  dom.window.renderDetail('hood', 'Old Town Louisville');
  const ranks = [...det.querySelectorAll('.ex-path .ex-rank')].map(r => r.textContent);
  check('ideal path ranks are per-level (Peak to Peak E4/M6/H7)', ranks.join(',') === '#4,#6,#7');
  check('fallback header counts schools within 3 mi', /Only 2 listed within 3 mi/.test(det.textContent));
  d.querySelectorAll('script,style').forEach(el => el.remove());
  check('no literal \\u escapes in visible text', !/\\u[0-9a-fA-F]{4}/.test(d.body.textContent));
  check('no personal references in visible text', !/current home|your current life|nicky|college school/i.test(d.body.textContent));
}
{
  const { dom, errors } = load('#w=10,4,8,5,6,1,6,8,4,5,6,4,2,6,5&a=boulder&p=0');
  await tick(400);
  const d = dom.window.document;
  check('no runtime errors (shared)', errors.length === 0);
  check('shared link bypasses quiz', d.getElementById('quizOverlay').hidden);
  check('shared anchor applied', d.getElementById('anchorSel').value === 'boulder');
  check('legacy p= param tolerated, all areas shown', d.querySelectorAll('#hoodList .card').length === 48);
  check('new Lakewood areas render', /Belmar \/ Central Lakewood/.test(d.getElementById('hoodList').textContent) && /Solterra/.test(d.getElementById('hoodList').textContent));
}
{
  const { dom, errors } = load('#w=10,4,8,5,6,1,6,8,4,5,6,4,2,6,5&a=downtown');
  await tick(400);
  const d = dom.window.document;
  d.querySelector('#hoodList .card .fav-btn').click();
  check('favoriting a hood writes fh= to hash', /fh=\d/.test(dom.window.location.hash));
  d.querySelector('#schoolList .card .fav-btn').click();
  check('fav tab count shows 2', d.getElementById('favTabCount').textContent.trim() === '(2)');
  d.querySelector('.tab[data-tab="favs"]').click();
  check('favorites panel active', d.getElementById('panel-favs').classList.contains('active'));
  check('favorites show hood + school cards', d.querySelectorAll('#favHoodList .card').length === 1 && d.querySelectorAll('#favSchoolList .card').length === 1);
  d.querySelector('#favHoodList .fav-btn').click();
  check('unfavoriting from favorites tab empties hood section', d.querySelectorAll('#favHoodList .card').length === 0 && !d.getElementById('favHoodEmpty').hidden);
  check('no runtime errors (favorites)', errors.length === 0);
}
{
  const { dom, errors } = load('#w=10,4,8,5,6,1,6,8,4,5,6,4,2,6,5&a=downtown&fh=0,2&fs=1');
  await tick(400);
  const d = dom.window.document;
  check('no runtime errors (shared favorites)', errors.length === 0);
  check('shared fh/fs deep-links favorites', d.querySelectorAll('#favHoodList .card').length === 2 && d.querySelectorAll('#favSchoolList .card').length === 1);
  check('shared favorites star their list cards', [...d.querySelectorAll('#hoodList .fav-btn.on')].length === 2);
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
