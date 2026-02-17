// audio.js — Procedural sound effects via Web Audio API
window.audio = (function () {
  var ctx = null;
  var muted = false;
  var lastHardDrop = 0;
  var MUTE_KEY = 'tetris_muted';

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

  // --- Mute toggle ---

  function toggleMute() {
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    updateMuteButton();
  }

  var muteBtn = null;

  function updateMuteButton() {
    if (muteBtn) muteBtn.textContent = muted ? '\u{1F507} Unmute' : '\u{1F50A} Mute';
  }

  function createMuteButton() {
    var panel = document.getElementById('side-panel');
    if (!panel) return;
    muteBtn = document.createElement('button');
    muteBtn.id = 'mute-btn';
    muteBtn.style.cssText = 'margin-top:12px;padding:6px 12px;cursor:pointer;font-size:14px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;width:100%;';
    muteBtn.addEventListener('click', toggleMute);
    panel.appendChild(muteBtn);
    updateMuteButton();
  }

  function addMuteHint() {
    var info = document.getElementById('controls-info');
    if (!info) return;
    var p = document.createElement('p');
    p.textContent = 'M Mute';
    info.appendChild(p);
  }

  // --- Init ---

  function init() {
    muted = localStorage.getItem(MUTE_KEY) === '1';
    createMuteButton();
    addMuteHint();

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

    document.addEventListener('keydown', function (e) {
      if (e.key === 'm' || e.key === 'M') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) toggleMute();
      }
    });
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', function () {
  if (window.audio && window.audio.init) window.audio.init();
});
