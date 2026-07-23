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
  check('61 hood cards', d.querySelectorAll('#hoodList .card').length === 61);
  check('every card carries a district stripe class', [...d.querySelectorAll('#hoodList .card')].every(c => [...c.classList].some(cl => /^g-(dps|bvsv|cherry|other)$/.test(cl))));
  check('108 school cards', d.querySelectorAll('#schoolList .card').length === 108);
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
  check('type filter keeps 61 areas', d.querySelectorAll('#hoodList .card').length === 61);
  privCb.click();
  check('recheck private restores schools', d.querySelectorAll('#schoolList .card').length === 108);
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
  dom.window.renderDetail('school', 'Kent Denver');
  check('map school detail embeds grade wheel', det.querySelectorAll('.whit[data-gkey]').length === 5);
  check('multi-band 6-12 school shows both band ranks', /Rank within level bands: M #1 · H #1/.test(det.textContent));
  dom.window.renderDetail('school', 'Peak to Peak');
  check('multi-band school shows all band ranks', /E #4 · M #6 · H #7/.test(det.textContent));
  dom.window.renderDetail('school', 'Boulder Journey School');
  check('ECE school ranks within ECE band', /Rank within level band: EC #1/.test(det.textContent));
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
  check('legacy p= param tolerated, all areas shown', d.querySelectorAll('#hoodList .card').length === 61);
  check('expansion areas render (Lakewood + Englewood/Aurora/Parker)', /Belmar \/ Central Lakewood/.test(d.getElementById('hoodList').textContent) && /Solterra/.test(d.getElementById('hoodList').textContent) && /Downtown Englewood/.test(d.getElementById('hoodList').textContent) && /Castle Pines/.test(d.getElementById('hoodList').textContent));
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
  const { dom, errors } = load('#w=10,4,8,5,6,1,6,8,4,5,6,4,2,6,5&a=downtown&fh=1,3&fs=2&fh_bogus_check=1');
  await tick(400);
  const d = dom.window.document;
  check('no runtime errors (shared favorites)', errors.length === 0);
  check('shared fh/fs deep-links favorites by stable id', d.querySelectorAll('#favHoodList .card').length === 2 && d.querySelectorAll('#favSchoolList .card').length === 1);
  check('favorites use ids, not positions', !!d.querySelector('.fav-btn[data-fid]') && !d.querySelector('.fav-btn[data-fidx]'));
  check('shared favorites star their list cards', [...d.querySelectorAll('#hoodList .fav-btn.on')].length === 2);
}
{
  const { dom, errors } = load('#w=10,4,8,5,6,1,6,8,4,5,6,4,2,6,5&a=downtown');
  await tick(400);
  const d = dom.window.document;
  check('all 108 schools carry program grades', (html.match(/,g:\{exp:/g) || []).length === 108);
  check('all 108 schools carry vitals', (html.match(/,st:\{enroll:/g) || []).length === 108);
  check('all 108 schools carry diversity data', (html.match(/,dv:\{soc:/g) || []).length === 108);
  // "Small & personal" grade must stay derived from the real student:teacher ratio (de-bias fix)
  const fitFromRatio = n => Math.max(1, Math.min(10, Math.round(10 - (n - 5) * 9 / 20)));
  const schoolBlocks = html.match(/\{id:\d+,name:'(?:[^'\\]|\\.)*',type:[\s\S]*?dv:\{[^}]*\}[^}]*\}/g) || [];
  let fitOK = 0, fitBad = 0;
  for (const b of schoolBlocks) {
    const r = b.match(/ratio:'~?(\d+):1'/), f = b.match(/fit:(\d+)\}/);
    if (r && f) { (parseInt(f[1]) === fitFromRatio(parseInt(r[1])) ? fitOK++ : fitBad++); }
  }
  check('every fit grade is derived from its ratio', fitBad === 0 && fitOK === 108);
  const ccHS = html.match(/name:'Cherry Creek HS'[\s\S]*?lng:([-\d.]+)/)[1];
  check('Cherry Creek HS sits east of I-25 (lng > -104.90)', parseFloat(ccHS) > -104.90);
  check('highway route shields defined (I-25/I-70)', /HWY_SHIELDS/.test(html) && /r:'I-25'/.test(html) && /r:'I-70'/.test(html));
  d.querySelector('.seg-btn[data-lvl="ECE"]').click();
  check('ECE level filter shows the 31-school band', d.querySelectorAll('#schoolList .card').length === 31 && /Boulder Journey/.test(d.querySelector('#schoolList .card .name').textContent));
  check('all 31 ECE entries carry waitlist bands', (html.match(/,wait:'/g) || []).length === 31);
  const eceCard = d.querySelector('#schoolList .card.scard');
  eceCard.click();
  check('ECE expansion shows typical waitlist', /Typical waitlist/.test(eceCard.querySelector('.s-stats').textContent));
  eceCard.click();
  d.querySelector('.seg-btn[data-lvl="all"]').click();
  d.getElementById('openSchoolSettings').click();
  check('school weights drawer opens', d.getElementById('schoolDrawer').classList.contains('open'));
  d.getElementById('closeSchoolSettings').click();
  check('school weights drawer closes', !d.getElementById('schoolDrawer').classList.contains('open'));
  const sCard = d.querySelector('#schoolList .card');
  check('school grade wheel renders (5 hit sectors)', !!sCard.querySelector('.wheel svg') && sCard.querySelectorAll('.whit[data-gkey]').length === 5);
  sCard.querySelector('.whit[data-gkey="exp"]').dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true }));
  check('grade wheel hover fills fixed readout', /Experiential & outdoors/.test(sCard.querySelector('.wheel-read').textContent) && /\/10/.test(sCard.querySelector('.wheel-read').textContent));
  const tu = d.getElementById('tuitionMax');
  tu.value = '15'; tu.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  check('tuition cap hides pricey privates, keeps cheap + public', !/Kent Denver/.test(d.getElementById('schoolList').textContent) && /Faith Christian/.test(d.getElementById('schoolList').textContent) && /Fairview/.test(d.getElementById('schoolList').textContent));
  tu.value = '45'; tu.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const louRank = [...d.querySelectorAll('#hoodList .card')].find(c => /Old Town Louisville/.test(c.textContent)).querySelector('.rank').textContent;
  const hq = d.getElementById('hoodSearch');
  hq.value = 'louisville'; hq.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  check('hood search filters to one card, rank unchanged', d.querySelectorAll('#hoodList .card').length === 1 && d.querySelector('#hoodList .card .rank').textContent === louRank);
  hq.value = ''; hq.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const sq = d.getElementById('schoolSearch');
  sq.value = 'peak to peak'; sq.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  check('school search keeps view rank (Peak to Peak #8)', d.querySelectorAll('#schoolList .card').length === 1 && d.querySelector('#schoolList .card .rank').textContent.trim().startsWith('8'));
  sq.value = ''; sq.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  check('star sits as second column in side cell', !!d.querySelector('#hoodList .card .side > .fav-btn') && !!d.querySelector('#schoolList .card .side > .fav-btn') && !d.querySelector('.rank .fav-btn'));
  check('all 108 schools carry about paragraphs', (html.match(/,about:\['/g) || []).length === 108);
  const sCard2 = d.querySelector('#schoolList .card.scard');
  sCard2.click();
  check('school card expands with 2-paragraph about', sCard2.classList.contains('open') && sCard2.querySelectorAll('.s-about').length === 2);
  check('expanded card shows vitals stats', /Enrollment/.test(sCard2.querySelector('.s-stats').textContent) && /Student:teacher/.test(sCard2.querySelector('.s-stats').textContent) && /Avg class size/.test(sCard2.querySelector('.s-stats').textContent));
  check('expanded card shows diversity vitals', /Students of color/.test(sCard2.querySelector('.s-stats').textContent) && /Free\/reduced lunch/.test(sCard2.querySelector('.s-stats').textContent));
  sCard2.click();
  check('school card collapses again', !sCard2.classList.contains('open'));
  const swExp = d.querySelector('#swRow input[data-sw="exp"]');
  swExp.value = '10'; swExp.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const swComp = d.querySelector('#swRow input[data-sw="comp"]');
  swComp.value = '0'; swComp.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  check('program weights re-rank schools (experiential on top)', /Logan|Watershed/.test(d.querySelector('#schoolList .card .name').textContent));
  check('school weights encode in hash', /sw=0,10,0,0,0,0/.test(dom.window.location.hash));
  d.getElementById('swReset').click();
  check('reset restores composite order', /Kent Denver/.test(d.querySelector('#schoolList .card .name').textContent) && !/sw=/.test(dom.window.location.hash));
  check('no runtime errors (grades/tuition/search)', errors.length === 0);
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
