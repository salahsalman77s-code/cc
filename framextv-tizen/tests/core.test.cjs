'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const createStore = require('../app/js/store.js');
const providers = require('../app/js/provider.js');
const createPlayer = require('../app/js/player.js');
function memory() { const map = {}; return { getItem: k => map[k] || null, setItem: (k,v) => { map[k] = v; } }; }
function nativePlayer() {
  let time = 0, duration = 18000, prepare, listener, opened, closed = 0;
  const calls = [];
  const api = { open: url => { opened = url; calls.push('open'); }, setDisplayRect: (...args) => calls.push(args),
    setDisplayMethod: mode => calls.push(mode), setListener: l => { listener = l; },
    prepareAsync: (ok, error) => { prepare = { ok, error }; }, play: () => calls.push('play'), pause: () => calls.push('pause'),
    stop: () => calls.push('stop'), close: () => { closed++; }, getCurrentTime: () => time, getDuration: () => duration,
    seekTo: (n, ok) => { time = n; calls.push(['seek',n]); ok(); }, getTotalTrackInfo: () => [{ type:'AUDIO', index:0 },{ type:'TEXT', index:2 }],
    setSelectTrack: (type,index) => calls.push([type,index]), setSilentSubtitle: flag => calls.push(['silent',flag]) };
  const events = [];
  const player = createPlayer({ avplay: api, event: (name, value) => events.push([name,value]) });
  return { player, calls, events, get listener() { return listener; }, get prepare() { return prepare; }, get closed() { return closed; }, get opened() { return opened; } };
}
const source = { url:'assets/media/scene-0.mp4', format:'mp4' };
test('watchlist/settings/progress survive restart, with bounded history and completion', () => {
  const storage = memory(), a = createStore(storage);
  assert.equal(a.toggle('aurora'), true); a.setting('language','ar');
  a.record('aurora',null,6000,18000,false);
  const b = createStore(storage);
  assert.deepEqual(b.watchlist(),['aurora']); assert.equal(b.settings().language,'ar');
  assert.equal(b.progress('aurora').position,6000); assert.equal(b.progress('aurora').completed,false);
  b.record('aurora',null,18000,18000,true); assert.equal(b.progress('aurora').completed,true);
  b.record('bad',null,NaN,18000,false); assert.equal(b.progress('bad'),null);
  b.clearHistory(); assert.deepEqual(b.history(),[]); assert.equal(b.progress('aurora'),null); assert.deepEqual(b.watchlist(),['aurora']);
});
test('corrupted and unavailable storage recover without throwing', () => {
  const s = createStore({ getItem: () => '{bad', setItem: () => { throw Error('quota'); } });
  assert.equal(s.settings().language,'en'); s.toggle('a'); assert.ok(s.warning());
  const malformed = createStore({getItem: () => JSON.stringify({version:1,list:[],history:[],settings:{},progress:{bad:null}}),setItem:()=>{}});
  assert.deepEqual(malformed.allProgress(),[]); malformed.record('aurora',null,1000,18000,false); assert.equal(malformed.progress('aurora').position,1000);
});
test('demo provider exposes consistent typed catalog, localized search, episodes and related titles', async () => {
  const catalog = await providers.mock.list(); assert.equal(catalog.length,16);
  for (const item of catalog) {
    assert.ok(item.title.ar && item.artwork.url && item.demo);
    const media = await providers.mock.resolve(item.id); assert.match(media.url,/^assets\/media\/scene-[0-3]\.mp4$/); assert.match(media.license,/CC0/);
    if (item.seasons) { assert.equal(item.seasons.length,2); for (const season of item.seasons) for (const ep of season.episodes) assert.ok((await providers.mock.resolve(item.id,ep.id)).url); }
  }
  assert.equal((await providers.mock.search('AURORA'))[0].id,'aurora');
  assert.equal((await providers.mock.search('ما وراء الشفق'))[0].id,'aurora');
  assert.ok((await providers.mock.recommendations('aurora')).every(i => i.kind === 'movie' && i.id !== 'aurora'));
  await assert.rejects(providers.mock.resolve('orbit','missing'),/Episode/);
  await assert.rejects(providers.mock.details('missing'),/not found/);
  assert.equal(providers.framextv.enabled,false); await assert.rejects(providers.framextv.list(),/disabled/);
});
test('AVPlay prepares asynchronously, resumes before play, pauses and clamps seek', () => {
  const f = nativePlayer(); const p = f.player;
  try {
    p.open(source,6000,'fit'); assert.equal(p.state(),'PREPARING'); assert.ok(!f.calls.includes('play'));
    f.prepare.ok(); assert.equal(p.state(),'PLAYING'); assert.ok(f.opened.endsWith(source.url));
    assert.ok(f.calls.find(c => Array.isArray(c) && c[0] === 'seek' && c[1] === 6000));
    p.pause(); assert.equal(p.state(),'PAUSED'); p.seek(999999); assert.equal(p.position(),17500);
    p.seek(-1000); assert.equal(p.position(),0); p.play(); assert.equal(p.state(),'PLAYING');
    assert.equal(p.selectTrack('TEXT',2),true); assert.equal(p.selectTrack('TEXT',-1),true);
    p.aspect('fill'); assert.ok(f.calls.includes('PLAYER_DISPLAY_MODE_FULL_SCREEN'));
    f.listener.onstreamcompleted(); assert.equal(p.state(),'ENDED'); assert.ok(f.events.find(e => e[0] === 'ended'));
  } finally { p.stop(); } assert.equal(p.state(),'IDLE'); assert.ok(f.closed >= 2);
});
test('stale prepare callbacks cannot restart a stopped player', () => {
  const f = nativePlayer(); f.player.open(source,0); const stale = f.prepare; f.player.stop(); stale.ok(); assert.equal(f.player.state(),'IDLE'); assert.ok(!f.calls.includes('play'));
});
test('native prepare failure closes resources and retry can prepare a fresh session', () => {
  const f = nativePlayer(); try { f.player.open(source,0); f.prepare.error('unsupported'); assert.equal(f.player.state(),'ERROR'); assert.ok(f.events.find(e => e[0] === 'error')); f.player.retry(0); f.prepare.ok(); assert.equal(f.player.state(),'PLAYING'); } finally { f.player.stop(); }
});
test('stream errors after prepare do not keep playing', () => {
  const f = nativePlayer(); try { f.player.open(source,0); f.prepare.ok(); f.listener.onerror('CONNECTION_LOST'); assert.equal(f.player.state(),'ERROR'); assert.ok(f.calls.includes('stop')); } finally { f.player.stop(); }
});
test('prepare guards prevent premature native play, pause, seek and track calls', () => {
  const f = nativePlayer(); try { f.player.open(source,0); f.player.play(); f.player.pause(); f.player.seek(6000); assert.equal(f.player.selectTrack('AUDIO',0),false); assert.equal(f.player.state(),'PREPARING'); assert.ok(!f.calls.includes('play')); assert.ok(!f.calls.some(c => Array.isArray(c) && c[0] === 'seek')); } finally { f.player.stop(); }
});
test('only supported optional media keys are registered; failures preserve mandatory navigation', () => {
  const registered = [];
  globalThis.tizen = { tvinputdevice: { getSupportedKeys: () => [{name:'MediaPlay'},{name:'MediaPause'},{name:'ColorF0Red'}], registerKey: name => { if(name === 'MediaPause') throw Error('unsupported'); registered.push(name); } } };
  require('../app/js/navigation.js');
  assert.deepEqual(globalThis.FX.registerMediaKeys(),['MediaPlay']); assert.deepEqual(registered,['MediaPlay']);
  globalThis.tizen.tvinputdevice.getSupportedKeys = () => { throw Error('permission'); };
  assert.deepEqual(globalThis.FX.registerMediaKeys(),[]); delete globalThis.tizen;
});
