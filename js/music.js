// music.js — Procedural looping background music via Web Audio API
window.music = (function () {
  var ctx = null;
  var masterGain = null;
  var MASTER_VOL = 0.5;
  var MUTE_KEY = 'tetris_music_muted';
  var muted = false;
  var playing = false;
  var schedulerId = null;

  // Sequencer state
  var currentStep = 0;
  var nextNoteTime = 0;
  var bpm = 140;
  var stepsPerBeat = 4; // 16th notes
  var totalSteps = 64; // 4 bars of 16 steps

  // Note frequencies — extended range for all 5 tracks
  var N = {
    A2: 110.00, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61,
    Fs3: 185.00, G3: 196.00, A3: 220.00, Bb3: 233.08, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, Fs4: 369.99,
    G4: 392.00, A4: 440.00, Bb4: 466.16, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, Fs5: 739.99,
    G5: 783.99, A5: 880.00
  };

  // --- Track definitions ---

  var TRACKS = [
    // Track 0: Classic — Am pentatonic (Am-F-C-G), catchy chiptune theme
    {
      name: 'Classic', bpm: 140,
      synth: {
        melody: { oscType: 'square', volume: 0.06, durationRatio: 0.85, vibratoRate: 6, vibratoDepth: 3 },
        bass: { oscType: 'triangle', volume: 0.09, durationRatio: 0.9 },
        arp: { oscType: 'square', volume: 0.025, durationRatio: 0.5, detune: 10 },
        drums: { kickStartFreq: 160, kickDuration: 0.1, kickVolume: 0.12, snareDuration: 0.08, snareVolume: 0.08, hihatFreq: 8000, hihatDuration: 0.025, hihatVolume: 0.05 }
      },
      melody: [
        'E5','E5', null,'D5','C5', null,'A4', null,
        'C5','D5','E5', null,'D5','C5', null, null,
        'A4','C5','D5', null,'C5','A4', null,'G4',
        'A4', null,'F4', null,'E4', null, null, null,
        'G5','E5','G5', null,'E5','D5','C5', null,
        'D5','E5', null,'G5','E5', null,'D5', null,
        'D5','B4','D5', null,'G4','A4','B4', null,
        'C5','D5','E5', null, null,'D5','C5', null
      ],
      bass: [
        'A2', null, null,'A3','A2', null,'E3', null,
        'A2', null,'A3', null,'E3', null,'A2', null,
        'F4', null, null,'F4','C3', null,'F4', null,
        'C3', null,'F4', null,'C3', null, null, null,
        'C3', null, null,'C4','G3', null,'C3', null,
        'E3', null,'G3', null,'C3', null,'G3', null,
        'G3', null, null,'G3','D3', null,'G3', null,
        'D3', null,'G3', null,'G3','D3','G3', null
      ],
      arp: [
        'A4','C5','E5','C5','A4','C5','E5','C5',
        'A4','E5','C5','E5','A4','C5','E5', null,
        'F4','A4','C5','A4','F4','A4','C5','A4',
        'F4','C5','A4','C5','F4','A4', null, null,
        'C5','E5','G5','E5','C5','E5','G5','E5',
        'C5','G5','E5','G5','C5','E5','G5', null,
        'G4','B4','D5','B4','G4','B4','D5','B4',
        'G4','D5','B4','D5','G4','B4','D5', null
      ],
      drums: [
        'b', 'h', 'h', 'h', 'x', 'h', 'h', 'h',
        'b', 'h', 'b', 'h', 'x', 'h', 'h', 'k',
        'b', 'h', 'h', 'h', 'x', null,'h', 'h',
        'b', 'h', 'h', 'h', 'x', 'h', null,'h',
        'b', 'h', 'h', 'k', 'x', 'h', 'h', 'h',
        'b', 'h', 'b', 'h', 'x', 'h', 'k', 'h',
        'b', 'h', 'h', 'h', 'x', 'h', 'h', 'h',
        'k', 'k', 'x', 'h', 'x', 'x', 'k', 'x'
      ]
    },

    // Track 1: Driving — E minor (Em-C-D-Bm), aggressive fast arps
    {
      name: 'Driving', bpm: 150,
      synth: {
        melody: { oscType: 'sawtooth', volume: 0.08, durationRatio: 0.95, vibratoRate: 8, vibratoDepth: 5 },
        bass: { oscType: 'sawtooth', volume: 0.12, durationRatio: 0.95 },
        arp: { oscType: 'sawtooth', volume: 0.035, durationRatio: 0.7, detune: 15 },
        drums: { kickStartFreq: 180, kickDuration: 0.08, kickVolume: 0.15, snareDuration: 0.06, snareVolume: 0.10, hihatFreq: 9000, hihatDuration: 0.02, hihatVolume: 0.06 }
      },
      melody: [
        'E5','G5','E5','D5','E5','G5','E5','D5',
        'E5','D5','B4','D5','E5','G5','E5','D5',
        'C5','E5','G5','E5','C5','E5','G5','D5',
        'E5','C5','D5','E5','G4','B4','D5','E5',
        'D5','Fs5','A5','Fs5','D5','Fs5','A5','Fs5',
        'D5','Fs5','A5','Fs5','D5','A4','Fs5','D5',
        'B4','D5','Fs5','D5','B4','D5','Fs5','D5',
        'B4','D5','Fs5','D5','B4','Fs4','B4','D5'
      ],
      bass: [
        'E3','E3','G3','E3','E3','G3','E3','G3',
        'E3','G3','E3','G3','E3','G3','E3','G3',
        'C3','C3','E3','C3','C3','E3','C3','E3',
        'C3','E3','C3','E3','C3','E3','G3','E3',
        'D3','D3','A3','D3','D3','A3','D3','A3',
        'D3','A3','D3','A3','D3','A3','D3','A3',
        'B3','B3','Fs3','B3','B3','Fs3','B3','Fs3',
        'Fs3','B3','Fs3','B3','B3','Fs3','B3','Fs3'
      ],
      arp: [
        'E4','G4','B4','G4','E4','G4','B4','G4',
        'E4','B4','G4','B4','E4','G4','B4','E4',
        'C4','E4','G4','E4','C4','E4','G4','E4',
        'C4','G4','E4','G4','C4','E4','G4','E4',
        'D4','Fs4','A4','Fs4','D4','Fs4','A4','Fs4',
        'D4','A4','Fs4','A4','D4','Fs4','A4','D4',
        'B4','D5','Fs4','D5','B4','D5','Fs4','D5',
        'B4','Fs4','D5','Fs4','B4','D5','Fs4','D5'
      ],
      drums: [
        'b', 'h', 'b', 'h', 'x', 'h', 'b', 'h',
        'b', 'h', 'b', 'h', 'x', 'h', 'k', 'h',
        'b', 'h', 'k', 'h', 'x', 'h', 'b', 'h',
        'b', 'h', 'k', 'h', 'x', 'h', 'k', 'h',
        'b', 'h', 'b', 'h', 'x', 'h', 'b', 'h',
        'b', 'k', 'b', 'h', 'x', 'h', 'b', 'h',
        'b', 'h', 'k', 'h', 'x', 'h', 'k', 'h',
        'b', 'k', 'x', 'k', 'x', 'x', 'b', 'x'
      ]
    },

    // Track 2: Chill — C major (C-Am-F-G), relaxed sparse melody
    {
      name: 'Chill', bpm: 120,
      synth: {
        melody: { oscType: 'sine', volume: 0.04, durationRatio: 0.7, vibratoRate: 4, vibratoDepth: 1.5 },
        bass: { oscType: 'sine', volume: 0.06, durationRatio: 0.8 },
        arp: { oscType: 'triangle', volume: 0.015, durationRatio: 0.4, detune: 5 },
        drums: { kickStartFreq: 140, kickDuration: 0.12, kickVolume: 0.08, snareDuration: 0.1, snareVolume: 0.05, hihatFreq: 7000, hihatDuration: 0.03, hihatVolume: 0.03 }
      },
      melody: [
        'E5', null, null, null, null, null, null, null,
        null, null, null, null,'G5', null, null, null,
        'A4', null, null, null, null, null, null, null,
        null, null, null, null,'C5', null, null, null,
        'F4', null, null, null, null, null, null, null,
        null, null, null, null,'A4', null, null, null,
        'G4', null, null, null, null, null, null, null,
        null, null, null, null,'B4', null, null, null
      ],
      bass: [
        'C3', null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        'A2', null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        'F3', null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        'G3', null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null
      ],
      arp: [
        null, null, null, null,'E4', null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null,'C5', null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null,'A4', null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null,'D5', null, null, null,
        null, null, null, null, null, null, null, null
      ],
      drums: [
        'b', null, null, null, null, null, null, null,
        null, null, null, null, 'x', null, null, null,
        'b', null, null, null, null, null, null, null,
        null, null, null, null, 'x', null, null, null,
        'b', null, null, null, null, null, 'h', null,
        null, null, null, null, 'x', null, null, null,
        'b', null, null, null, null, null, null, null,
        null, null, null, null, 'x', null, null, null
      ]
    },

    // Track 3: Dark — D minor (Dm-Bb-Gm-A), moody chromatic, syncopated
    {
      name: 'Dark', bpm: 135,
      synth: {
        melody: { oscType: 'triangle', volume: 0.055, durationRatio: 0.8, vibratoRate: 5, vibratoDepth: 2 },
        bass: { oscType: 'sawtooth', volume: 0.11, durationRatio: 0.92 },
        arp: { oscType: 'square', volume: 0.028, durationRatio: 0.55, detune: 25 },
        drums: { kickStartFreq: 150, kickDuration: 0.14, kickVolume: 0.14, snareDuration: 0.09, snareVolume: 0.09, hihatFreq: 6500, hihatDuration: 0.028, hihatVolume: 0.045 }
      },
      melody: [
        null,'D5', null,'F4', null,'A4', null,'C5',
        null,'E5', null,'F4', null,'A4', null, null,
        null,'Bb4', null,'D5', null,'F4', null,'Bb4',
        null,'A4', null,'G4', null,'F4', null, null,
        null,'G4', null,'Bb4', null,'D5', null,'A4',
        null,'Bb4', null,'D5', null,'G4', null, null,
        null,'A4', null,'C5', null,'E5', null,'G4',
        null,'A4', null,'E5', null,'C5', null, null
      ],
      bass: [
        null,'D3', null,'D3', null,'A2', null,'D3',
        null,'F3', null,'D3', null,'A2', null, null,
        null,'Bb3', null,'Bb3', null,'F3', null,'Bb3',
        null,'F3', null,'Bb3', null,'F3', null, null,
        null,'G3', null,'G3', null,'D3', null,'G3',
        null,'Bb3', null,'G3', null,'D3', null, null,
        null,'A2', null,'A3', null,'E3', null,'A2',
        null,'E3', null,'A3', null,'E3', null, null
      ],
      arp: [
        null,'D4', null,'F4', null,'A4', null,'F4',
        null,'A4', null, null, null,'F4', null, null,
        null,'Bb3', null,'D4', null,'F4', null,'D4',
        null,'F4', null, null, null,'D4', null, null,
        null,'G4', null,'Bb4', null,'D5', null,'Bb4',
        null,'D5', null, null, null,'Bb4', null, null,
        null,'A4', null,'C5', null,'E5', null,'C5',
        null,'E5', null, null, null,'C5', null, null
      ],
      drums: [
        null, 'h', 'b', null, null, 'x', 'h', null,
        'k', null, 'h', null, 'x', null, 'k', null,
        null, 'b', null, 'h', null, null, 'x', 'h',
        'k', null, null, 'h', 'x', null, null, 'h',
        null, 'h', 'b', null, null, 'x', 'h', null,
        'k', null, 'h', null, 'x', null, 'h', 'k',
        null, 'b', 'h', null, 'k', null, 'x', 'h',
        'k', null, 'x', 'k', null, 'x', 'b', null
      ]
    },

    // Track 4: Hyper — G major (G-Em-C-D), energetic rapid-fire, double-time hats
    {
      name: 'Hyper', bpm: 160,
      synth: {
        melody: { oscType: 'sawtooth', volume: 0.07, durationRatio: 0.9, vibratoRate: 9, vibratoDepth: 4 },
        bass: { oscType: 'triangle', volume: 0.10, durationRatio: 0.85 },
        arp: { oscType: 'square', volume: 0.03, durationRatio: 0.6, detune: 20 },
        drums: { kickStartFreq: 170, kickDuration: 0.07, kickVolume: 0.13, snareDuration: 0.05, snareVolume: 0.09, hihatFreq: 8500, hihatDuration: 0.018, hihatVolume: 0.055 }
      },
      melody: [
        'G5','A5','B4','D5','G5','A5','B4','D5',
        'G5','A5','G5','D5','B4','G5','A5','B4',
        'E5','G5','B4','E5','G5','E5','B4','D5',
        'B4','E5','G5','E5','B4','D5','E5','G5',
        'C5','E5','G5','C5','E5','G5','C5','E5',
        'C5','D5','E5','G5','E5','C5','D5','E5',
        'D5','Fs5','A5','D5','Fs5','A5','D5','A4',
        'D5','Fs5','A5','Fs5','D5','A4','D5','Fs5'
      ],
      bass: [
        'G3','G3','D3','G3','G3','D3','G3','D3',
        'G3','D3','G3','D3','G3','D3','G3','D3',
        'E3','E3','B3','E3','E3','B3','E3','B3',
        'E3','B3','E3','B3','E3','B3','E3','B3',
        'C3','C3','G3','C3','C3','G3','C3','G3',
        'E3','C3','G3','C3','E3','G3','C3','G3',
        'D3','D3','A2','D3','D3','A2','D3','A2',
        'A2','D3','A2','D3','D3','A2','D3','A2'
      ],
      arp: [
        'G4','B4','D5','G4','B4','D5','G4','B4',
        'D5','G4','B4','D5','G4','B4','D5','G4',
        'E4','G4','B4','E4','G4','B4','E4','G4',
        'B4','E4','G4','B4','E4','G4','B4','E4',
        'C4','E4','G4','C4','E4','G4','C4','E4',
        'G4','C4','E4','G4','C4','E4','G4','C4',
        'D4','Fs4','A4','D4','Fs4','A4','D4','Fs4',
        'A4','D4','Fs4','A4','D4','Fs4','A4','D4'
      ],
      drums: [
        'b', 'h', 'k', 'h', 'x', 'h', 'k', 'h',
        'b', 'h', 'k', 'h', 'x', 'h', 'k', 'h',
        'b', 'h', 'k', 'h', 'x', 'h', 'k', 'h',
        'b', 'h', 'k', 'h', 'x', 'h', 'k', 'h',
        'b', 'h', 'k', 'h', 'x', 'h', 'k', 'h',
        'b', 'h', 'k', 'h', 'x', 'h', 'k', 'h',
        'b', 'h', 'k', 'h', 'x', 'h', 'k', 'h',
        'k', 'h', 'x', 'h', 'x', 'k', 'x', 'x'
      ]
    }
  ];

  // Current track index and active pattern references
  var currentTrack = 0;
  var melodyPattern = TRACKS[0].melody;
  var bassPattern = TRACKS[0].bass;
  var arpPattern = TRACKS[0].arp;
  var drumPattern = TRACKS[0].drums;

  function loadTrack(index) {
    var t = TRACKS[index];
    melodyPattern = t.melody;
    bassPattern = t.bass;
    arpPattern = t.arp;
    drumPattern = t.drums;
  }

  function switchTrack() {
    currentTrack = (currentTrack + 1) % TRACKS.length;
    localStorage.setItem('tetris_track', currentTrack);
    loadTrack(currentTrack);
    updateBpm();
    window.events.emit('track-changed', { index: currentTrack, name: TRACKS[currentTrack].name });
  }

  function ensureContext() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : MASTER_VOL;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function getStepDuration() {
    return 60.0 / bpm / stepsPerBeat;
  }

  function scheduleMelody(time, note) {
    if (!note) return;
    var freq = N[note];
    if (!freq) return;
    var s = TRACKS[currentTrack].synth.melody;
    var dur = getStepDuration() * s.durationRatio;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = s.oscType;
    osc.frequency.setValueAtTime(freq, time);
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = s.vibratoRate;
    lfoGain.gain.value = s.vibratoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(time);
    lfo.stop(time + dur);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(s.volume, time + 0.01);
    gain.gain.setValueAtTime(s.volume * 0.83, time + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, time + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  function scheduleBass(time, note) {
    if (!note) return;
    var freq = N[note];
    if (!freq) return;
    var s = TRACKS[currentTrack].synth.bass;
    var dur = getStepDuration() * s.durationRatio;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = s.oscType;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(s.volume, time + 0.005);
    gain.gain.setValueAtTime(s.volume * 0.78, time + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, time + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  function scheduleArp(time, note) {
    if (!note) return;
    var freq = N[note];
    if (!freq) return;
    var s = TRACKS[currentTrack].synth.arp;
    var dur = getStepDuration() * s.durationRatio;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = s.oscType;
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(s.detune, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(s.volume, time + 0.005);
    gain.gain.linearRampToValueAtTime(0, time + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  function scheduleKick(time) {
    var d = TRACKS[currentTrack].synth.drums;
    var dur = d.kickDuration;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(d.kickStartFreq, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + dur);
    gain.gain.setValueAtTime(d.kickVolume, time);
    gain.gain.linearRampToValueAtTime(0, time + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  function scheduleSnare(time) {
    var d = TRACKS[currentTrack].synth.drums;
    var dur = d.snareDuration;
    var bufferSize = Math.floor(ctx.sampleRate * dur);
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    var src = ctx.createBufferSource();
    var noiseGain = ctx.createGain();
    src.buffer = buffer;
    noiseGain.gain.setValueAtTime(d.snareVolume, time);
    noiseGain.gain.linearRampToValueAtTime(0, time + dur);
    src.connect(noiseGain);
    noiseGain.connect(masterGain);
    src.start(time);
    src.stop(time + dur);
    var osc = ctx.createOscillator();
    var toneGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.linearRampToValueAtTime(100, time + dur * 0.5);
    toneGain.gain.setValueAtTime(d.snareVolume * 0.75, time);
    toneGain.gain.linearRampToValueAtTime(0, time + dur * 0.5);
    osc.connect(toneGain);
    toneGain.connect(masterGain);
    osc.start(time);
    osc.stop(time + dur * 0.5);
  }

  function scheduleHiHat(time) {
    var d = TRACKS[currentTrack].synth.drums;
    var dur = d.hihatDuration;
    var bufferSize = Math.floor(ctx.sampleRate * dur);
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    var src = ctx.createBufferSource();
    var gain = ctx.createGain();
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = d.hihatFreq;
    filter.Q.value = 1.5;
    src.buffer = buffer;
    gain.gain.setValueAtTime(d.hihatVolume, time);
    gain.gain.linearRampToValueAtTime(0, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(time);
    src.stop(time + dur);
  }

  function scheduleDrum(time, type) {
    if (!type) return;
    if (type === 'k') scheduleKick(time);
    if (type === 'h') scheduleHiHat(time);
    if (type === 's') scheduleSnare(time);
    if (type === 'b') { scheduleKick(time); scheduleHiHat(time); }
    if (type === 'x') { scheduleSnare(time); scheduleHiHat(time); }
  }

  function scheduleStep(step, time) {
    scheduleMelody(time, melodyPattern[step]);
    scheduleBass(time, bassPattern[step]);
    scheduleArp(time, arpPattern[step]);
    scheduleDrum(time, drumPattern[step]);
  }

  function scheduler() {
    var lookahead = 0.1;
    while (nextNoteTime < ctx.currentTime + lookahead) {
      scheduleStep(currentStep, nextNoteTime);
      nextNoteTime += getStepDuration();
      currentStep = (currentStep + 1) % totalSteps;
    }
  }

  function startMusic() {
    if (!ensureContext()) return;
    if (playing) stopMusic();
    playing = true;
    currentStep = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    schedulerId = setInterval(scheduler, 25);
  }

  function stopMusic() {
    playing = false;
    if (schedulerId !== null) {
      clearInterval(schedulerId);
      schedulerId = null;
    }
  }

  function updateBpm() {
    var level = window.gameState ? window.gameState.level : 1;
    var baseBpm = TRACKS[currentTrack].bpm;
    bpm = Math.min(baseBpm + 60, baseBpm + (level - 1) * 5);
  }

  function applyMute() {
    if (masterGain) {
      masterGain.gain.setValueAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime);
    }
  }

  function init() {
    muted = localStorage.getItem(MUTE_KEY) === '1';

    // Restore persisted track
    var savedTrack = parseInt(localStorage.getItem('tetris_track'), 10);
    if (savedTrack >= 0 && savedTrack < TRACKS.length) {
      currentTrack = savedTrack;
      loadTrack(currentTrack);
    }

    var ev = window.events;

    ev.on('game-start', function () {
      updateBpm();
      startMusic();
    });

    ev.on('game-pause', function (data) {
      if (!ctx) return;
      if (data.paused) {
        ctx.suspend();
      } else {
        ctx.resume().then(function () {
          if (playing) {
            nextNoteTime = ctx.currentTime + 0.05;
          }
        });
      }
    });

    ev.on('game-over', function () {
      stopMusic();
    });

    ev.on('level-up', function () {
      updateBpm();
    });

    // Listen for mute toggle from audio.js
    ev.on('toggle-music-mute', function () {
      muted = !muted;
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      applyMute();
      ev.emit('music-mute-changed', { muted: muted });
    });

    // Listen for track cycle from audio.js
    ev.on('cycle-track', function () {
      switchTrack();
    });

    // Emit initial state so audio.js can set button labels
    ev.emit('music-mute-changed', { muted: muted });
    ev.emit('track-changed', { index: currentTrack, name: TRACKS[currentTrack].name });
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', function () {
  if (window.music && window.music.init) window.music.init();
});
