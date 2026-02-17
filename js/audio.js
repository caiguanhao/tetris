// audio.js — Procedural sound effects via Web Audio API
window.audio = (function () {
  var ctx = null;
  var muted = false;
  var lastHardDrop = 0;
  var MUTE_KEY = 'tetris_sfx_muted';

  function ensureContext() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(type, freq, duration, freqEnd, startTime) {
    var c = ensureContext();
    if (!c || muted) return null;
    var t = startTime || c.currentTime;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd != null) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
    return osc;
  }

  // --- Sound functions ---

  function playMove() {
    playTone('square', 600, 0.04);
  }

  function playRotate() {
    playTone('sine', 300, 0.06, 600);
  }

  function playSoftDrop() {
    playTone('sine', 400, 0.03, 300);
  }

  function playHardDrop() {
    lastHardDrop = Date.now();
    var c = ensureContext();
    if (!c || muted) return;
    // Layer 1: low thud
    playTone('sine', 80, 0.15, 40);
    // Layer 2: impact click
    playTone('square', 200, 0.08);
  }

  function playLock() {
    if (Date.now() - lastHardDrop < 100) return;
    playTone('triangle', 200, 0.1, 100);
  }

  function playLineClear(count) {
    var c = ensureContext();
    if (!c || muted) return;
    if (count === 4) {
      // Tetris: major chord arpeggio C5 E5 G5 C6
      var notes = [523, 659, 784, 1047];
      for (var i = 0; i < notes.length; i++) {
        playTone('sine', notes[i], 0.15, null, c.currentTime + i * 0.1);
      }
    } else {
      var base = 250 + count * 50;
      playTone('sine', base, 0.2, base * 2);
    }
  }

  function playLevelUp() {
    var c = ensureContext();
    if (!c || muted) return;
    playTone('sine', 784, 0.11, null, c.currentTime);       // G5
    playTone('sine', 1047, 0.11, null, c.currentTime + 0.11); // C6
  }

  function playGameOver() {
    var c = ensureContext();
    if (!c || muted) return;
    playTone('sine', 330, 0.18, null, c.currentTime);        // E4
    playTone('sine', 262, 0.18, null, c.currentTime + 0.19); // C4
    playTone('sine', 220, 0.2, null, c.currentTime + 0.38);  // A3
  }

  function playGameStart() {
    var c = ensureContext();
    if (!c || muted) return;
    playTone('sine', 523, 0.08, null, c.currentTime);        // C5
    playTone('sine', 659, 0.08, null, c.currentTime + 0.09); // E5
    playTone('sine', 784, 0.1, null, c.currentTime + 0.18);  // G5
  }

  // --- SFX mute toggle ---

  function toggleSfxMute() {
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    updateSfxButton();
  }

  var sfxBtn = null;
  var musicBtn = null;
  var trackBtn = null;

  function setBtnContent(btn, icon, text) {
    btn.innerHTML = '';
    var iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    var textSpan = document.createElement('span');
    textSpan.textContent = text;
    btn.appendChild(iconSpan);
    btn.appendChild(textSpan);
  }

  function updateSfxButton() {
    if (sfxBtn) setBtnContent(sfxBtn, muted ? '\u{1F507}' : '\u{1F50A}', 'SFX');
  }

  function createAudioControls() {
    var panel = document.getElementById('side-panel');
    if (!panel) return;

    var container = document.createElement('div');
    container.id = 'audio-controls';
    sfxBtn = document.createElement('button');
    sfxBtn.id = 'sfx-btn';
    sfxBtn.className = 'audio-btn';
    sfxBtn.addEventListener('click', toggleSfxMute);

    musicBtn = document.createElement('button');
    musicBtn.id = 'music-btn';
    musicBtn.className = 'audio-btn';
    musicBtn.addEventListener('click', function () {
      window.events.emit('toggle-music-mute');
    });

    trackBtn = document.createElement('button');
    trackBtn.id = 'track-btn';
    trackBtn.className = 'audio-btn';
    trackBtn.addEventListener('click', function () {
      window.events.emit('cycle-track');
    });

    container.appendChild(sfxBtn);
    container.appendChild(musicBtn);
    container.appendChild(trackBtn);
    panel.appendChild(container);

    updateSfxButton();
    // Initial labels for music/track will be set by event listeners
    setBtnContent(musicBtn, '\u{1F3B5}', 'Music');
    setBtnContent(trackBtn, '\u266A', 'Track');
  }

  function addControlHints() {
    var info = document.getElementById('controls-info');
    if (!info) return;
    var hints = ['M SFX Mute', 'N Music Mute', 'T Track'];
    for (var i = 0; i < hints.length; i++) {
      var p = document.createElement('p');
      p.textContent = hints[i];
      info.appendChild(p);
    }
  }

  // --- Init ---

  function init() {
    muted = localStorage.getItem(MUTE_KEY) === '1';
    createAudioControls();
    addControlHints();

    var ev = window.events;
    ev.on('input-left', playMove);
    ev.on('input-right', playMove);
    ev.on('input-rotate', playRotate);
    ev.on('input-down', playSoftDrop);
    ev.on('hard-drop', playHardDrop);
    ev.on('piece-locked', playLock);
    ev.on('lines-cleared', function (data) { playLineClear(data.count); });
    ev.on('level-up', playLevelUp);
    ev.on('game-over', playGameOver);
    ev.on('game-start', playGameStart);

    // Listen for music module state changes
    ev.on('music-mute-changed', function (data) {
      if (musicBtn) setBtnContent(musicBtn, data.muted ? '\u{1F507}' : '\u{1F3B5}', 'Music');
    });

    ev.on('track-changed', function (data) {
      if (trackBtn) setBtnContent(trackBtn, '\u266A', data.name);
    });

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'm' || e.key === 'M') {
        toggleSfxMute();
      } else if (e.key === 'n' || e.key === 'N') {
        ev.emit('toggle-music-mute');
      } else if (e.key === 't' || e.key === 'T') {
        ev.emit('cycle-track');
      }
    });
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', function () {
  if (window.audio && window.audio.init) window.audio.init();
});
