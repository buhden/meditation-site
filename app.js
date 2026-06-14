const sounds = {};

document.querySelectorAll("[data-sound]").forEach(toggle => {
  const name = toggle.dataset.sound;
  const audio = document.getElementById(name);

  if (audio) {
    sounds[name] = audio;
  } else {
    console.warn(`No audio element found for: ${name}`);
  }
});

let sessionActive = false;

const background = document.getElementById("background");
const backgroundSelect = document.getElementById("backgroundSelect");
const sessionBtn = document.getElementById("sessionBtn");
const timerSelect = document.getElementById("timerSelect");
const timerDisplay = document.getElementById("timerDisplay");
const bowl = document.getElementById("bowl");
const menu = document.getElementById("menu");
const menuBtn = document.getElementById("menuBtn");

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioContext;
let toneOscillator;
let toneGain;
let timerInterval;
let endTime;

const FADE_DURATION = 5000;
const activeFades = new Map();

let noiseSource;
let noiseGain;

const toneFrequencies = {
  delta: 2.5,
  theta: 6,
  alpha: 10,
  beta: 18,
  gamma: 40
};

const presets = {
  sleep: {
    background: "assets/gifs/rain.gif",
    timer: 45,
    tone: "delta",

    sounds: {
      rain: 0.55,
      music: 0.15,
      chants: 0,
      fire: 0,
      forest: 0,
      ocean: 0.1,
      candle: 0
    }
  },

  focus: {
    background: "assets/gifs/forest.gif",
    timer: 30,
    tone: "alpha",

    sounds: {
      rain: 0.15,
      music: 0.35,
      chants: 0,
      fire: 0,
      forest: 0.1,
      ocean: 0.1,
      candle: 0
    }
  },

  zen: {
    background: "assets/gifs/candle.gif",
    timer: 20,
    tone: "theta",

    sounds: {
      rain: 0.2,
      music: 0.1,
      chants: 0.45,
      fire: 0.25,
      forest: 0.1,
      ocean: 0,
      candle: 0
    }
  },

  forest: {
    background: "assets/gifs/forest.gif",
    timer: 60,
    tone: "theta",

    sounds: {
      rain: 0.35,
      music: 0.25,
      chants: 0.1,
      fire: 0,
      forest: 0.33,
      ocean: 0,
      candle: 0
    }
  }
};

function ensureAudioContext() {
  if (!audioContext && AudioContextClass) {
    audioContext = new AudioContextClass();
  }
}

function cancelFade(audio) {
  if (activeFades.has(audio)) {
    clearInterval(activeFades.get(audio));
    activeFades.delete(audio);
  }
}

async function fadeIn(audio, targetVolume = 1) {
  cancelFade(audio);

  targetVolume = Math.min(Math.max(targetVolume, 0), 1);

  if (audio.paused) {
    audio.volume = 0;
    try {
      await audio.play();
    } catch (error) {
      console.log("Playback requires user interaction.", error);
      return;
    }
  }

  const startVolume = audio.volume;
  const volumeChange = targetVolume - startVolume;
  const steps = 60;
  const stepTime = FADE_DURATION / steps;
  let currentStep = 0;

  const fade = setInterval(() => {
    currentStep++;
    const progress = currentStep / steps;
    audio.volume = Math.min(Math.max(startVolume + volumeChange * progress, 0), 1);

    if (currentStep >= steps) {
      clearInterval(fade);
      activeFades.delete(audio);
      audio.volume = targetVolume;
    }
  }, stepTime);

  activeFades.set(audio, fade);
}

function fadeOut(audio, resetTime = true) {
  cancelFade(audio);

  if (audio.paused) return;

  const startVolume = audio.volume;
  const steps = 60;
  const stepTime = FADE_DURATION / steps;
  let currentStep = 0;

  const fade = setInterval(() => {
    currentStep++;
    const progress = currentStep / steps;
    audio.volume = Math.max(startVolume * (1 - progress), 0);

    if (currentStep >= steps) {
      clearInterval(fade);
      activeFades.delete(audio);
      audio.pause();

      if (resetTime) {
        audio.currentTime = 0;
      }

      audio.volume = 0;
    }
  }, stepTime);

  activeFades.set(audio, fade);
}

function setBackground(src) {
  background.style.opacity = 0;

  setTimeout(() => {
    background.style.backgroundImage = `url("${src}")`;
    background.style.opacity = 1;
  }, 600);
}

function updateVolumes() {
  document.querySelectorAll("[data-volume]").forEach(slider => {
    const name = slider.dataset.volume;
    const audio = sounds[name];

    if (!audio) return;

    const targetVolume = Number(slider.value);

    if (!audio.paused) {
      audio.volume = targetVolume;
    }
  });
}

function startSelectedSounds() {
  const selectedToggles = Array.from(document.querySelectorAll("[data-sound]"))
    .filter(toggle => toggle.checked);

  selectedToggles.forEach((toggle, index) => {
    const name = toggle.dataset.sound;
    const audio = sounds[name];
    const slider = document.querySelector(`[data-volume="${name}"]`);

    if (!audio || !slider) return;

    const targetVolume = Number(slider.value);

    setTimeout(() => {
      fadeIn(audio, targetVolume);
    }, index * 1000);
  });

  Object.keys(sounds).forEach(name => {
    const toggle = document.querySelector(`[data-sound="${name}"]`);

    if (toggle && !toggle.checked) {
      fadeOut(sounds[name], true);
    }
  });
}

function stopAllAudio() {
  Object.values(sounds).forEach(audio => {
    fadeOut(audio, true);
  });

  stopTone();
stopNoise();
}

function startTone() {
  const toneToggle = document.getElementById("toneToggle");
  if (!toneToggle || !toneToggle.checked) return;

  ensureAudioContext();
  stopTone();

  if (!audioContext) return;

  const selectedTone = document.getElementById("toneSelect").value;
  const frequency = toneFrequencies[selectedTone] || 6;
  const volume = Number(document.getElementById("toneVolume").value);

  toneOscillator = audioContext.createOscillator();
  toneGain = audioContext.createGain();

  toneOscillator.type = "sine";
  toneOscillator.frequency.value = frequency;
  toneGain.gain.value = volume * 0.08;

  toneOscillator.connect(toneGain);
  toneGain.connect(audioContext.destination);
  toneOscillator.start();
}

function stopTone() {
  if (toneOscillator) {
    toneOscillator.stop();
    toneOscillator.disconnect();
    toneOscillator = null;
  }
}

function startTimer(minutes) {
  clearInterval(timerInterval);

  endTime = Date.now() + minutes * 60 * 1000;

  timerInterval = setInterval(() => {
    const remaining = endTime - Date.now();

    if (remaining <= 0) {
      completeSession();
      return;
    }

    const min = Math.floor(remaining / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);
    timerDisplay.textContent = `${min}:${String(sec).padStart(2, "0")}`;
  }, 1000);
}

function createNoiseBuffer(type = "brown") {
  ensureAudioContext();

  const bufferSize = audioContext.sampleRate * 2;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;

    if (type === "white") {
      data[i] = white * 0.35;
    } else if (type === "brown") {
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    } else if (type === "pink") {
      lastOut = 0.98 * lastOut + 0.02 * white;
      data[i] = lastOut * 1.2;
    } else if (type === "green") {
      lastOut = 0.95 * lastOut + 0.05 * white;
      data[i] = lastOut * 0.9;
    }
  }

  return buffer;
}

function startNoise() {
  const noiseToggle = document.getElementById("noiseToggle");
  if (!noiseToggle || !noiseToggle.checked) return;

  ensureAudioContext();
  stopNoise();

  const type = document.getElementById("noiseSelect").value;
  const volume = Number(document.getElementById("noiseVolume").value);

  noiseSource = audioContext.createBufferSource();
  noiseGain = audioContext.createGain();

  noiseSource.buffer = createNoiseBuffer(type);
  noiseSource.loop = true;
  noiseGain.gain.value = volume * 0.25;

  noiseSource.connect(noiseGain);
  noiseGain.connect(audioContext.destination);
  noiseSource.start();
}

function stopNoise() {
  if (noiseSource) {
    noiseSource.stop();
    noiseSource.disconnect();
    noiseSource = null;
  }
}

function completeSession() {
  clearInterval(timerInterval);
  stopAllAudio();
stopNoise();
  fadeIn(bowl, 1);
  timerDisplay.textContent = "Complete";
  menu.classList.add("open");
sessionActive = false;
sessionBtn.textContent = "Begin Meditation";
sessionBtn.classList.remove("active-session");
}

function beginSession() {
  ensureAudioContext();
  setBackground(backgroundSelect.value);
  startSelectedSounds();
startTone();
startNoise();
startTimer(Number(timerSelect.value));
  menu.classList.remove("open");
sessionBtn.classList.add("active-session");
sessionActive = true;
sessionBtn.textContent = "◼ End Session";
}

function stopSession() {
  clearInterval(timerInterval);
  stopAllAudio();
stopNoise();
  timerDisplay.textContent = `${timerSelect.value}:00`;
  menu.classList.add("open");
sessionActive = false;
sessionBtn.textContent = "▶ Begin Meditation";
sessionBtn.classList.remove("active-session");
}

function applyPreset(name) {
  const preset = presets[name];

  if (!preset) return;

  // Background
  backgroundSelect.value = preset.background;
  setBackground(preset.background);

  // Timer
  timerSelect.value = preset.timer;

  // Tone
  document.getElementById("toneSelect").value = preset.tone;

  // Sounds
  Object.entries(preset.sounds).forEach(([name, volume]) => {
    const toggle = document.querySelector(`[data-sound="${name}"]`);
    const slider = document.querySelector(`[data-volume="${name}"]`);

    if (!toggle || !slider) return;

    if (volume > 0) {
      toggle.checked = true;
      slider.value = volume;
    } else {
      toggle.checked = false;
      slider.value = 0;
    }
  });

  updateVolumes();
}

backgroundSelect.addEventListener("change", () => {
  setBackground(backgroundSelect.value);
});

document.querySelectorAll("[data-volume]").forEach(slider => {
  slider.addEventListener("input", updateVolumes);
});

document.querySelectorAll("[data-sound]").forEach(toggle => {
  toggle.addEventListener("change", () => {
    const name = toggle.dataset.sound;
    const audio = sounds[name];
    const slider = document.querySelector(`[data-volume="${name}"]`);

    if (!audio || !slider) return;

    const targetVolume = Number(slider.value);

    if (toggle.checked) {
      fadeIn(audio, targetVolume);
    } else {
      fadeOut(audio, false);
    }
  });
});

const noiseVolume = document.getElementById("noiseVolume");

if (noiseVolume) {
  noiseVolume.addEventListener("input", e => {
    if (noiseGain) {
      noiseGain.gain.value = Number(e.target.value) * 0.25;
    }
  });
}

const noiseSelect = document.getElementById("noiseSelect");

if (noiseSelect) {
  noiseSelect.addEventListener("change", () => {
    const noiseToggle = document.getElementById("noiseToggle");

    if (noiseToggle && noiseToggle.checked && noiseSource) {
      startNoise();
    }
  });
}

const toneVolume = document.getElementById("toneVolume");

if (toneVolume) {
  toneVolume.addEventListener("input", e => {
    if (toneGain) {
      toneGain.gain.value = Number(e.target.value) * 0.08;
    }
  });
}

const presetSelect = document.getElementById("presetSelect");

if (presetSelect) {
  presetSelect.addEventListener("change", e => {
    applyPreset(e.target.value);
  });
}

sessionBtn.addEventListener("click", () => {
  if (sessionActive) {
    stopSession();
  } else {
    beginSession();
  }
});

menuBtn.addEventListener("click", () => {
  menu.classList.toggle("open");
});

setBackground(backgroundSelect.value);
timerDisplay.textContent = `${timerSelect.value}:00`;