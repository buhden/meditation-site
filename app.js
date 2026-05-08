const sounds = {
  rain: document.getElementById("rain"),
  music: document.getElementById("music"),
  chants: document.getElementById("chants"),
  fire: document.getElementById("fire")
};

const background = document.getElementById("background");
const backgroundSelect = document.getElementById("backgroundSelect");
const beginBtn = document.getElementById("beginBtn");
const stopBtn = document.getElementById("stopBtn");
const timerSelect = document.getElementById("timerSelect");
const timerDisplay = document.getElementById("timerDisplay");
const bowl = document.getElementById("bowl");
const menu = document.getElementById("menu");
const menuBtn = document.getElementById("menuBtn");

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext;
let toneOscillator;
let toneGain;
let timerInterval;
let endTime;

const toneFrequencies = {
  delta: 2.5,
  theta: 6,
  alpha: 10,
  beta: 18,
  gamma: 40
};

const FADE_DURATION = 3000; // 3 seconds

async function fadeIn(audio, targetVolume = 1) {
  audio.volume = 0;

  try {
    await audio.play();
  } catch (error) {
    console.log("Playback requires interaction.", error);
    return;
  }

  const steps = 30;
  const stepTime = FADE_DURATION / steps;
  const volumeStep = targetVolume / steps;

  let currentStep = 0;

  const fade = setInterval(() => {
    currentStep++;

    audio.volume = Math.min(volumeStep * currentStep, targetVolume);

    if (currentStep >= steps) {
      clearInterval(fade);
      audio.volume = targetVolume;
    }
  }, stepTime);
}

function fadeOut(audio) {
  const startVolume = audio.volume;

  const steps = 30;
  const stepTime = FADE_DURATION / steps;
  const volumeStep = startVolume / steps;

  let currentStep = 0;

  const fade = setInterval(() => {
    currentStep++;

    audio.volume = Math.max(
      startVolume - volumeStep * currentStep,
      0
    );

    if (currentStep >= steps) {
      clearInterval(fade);
      audio.pause();
      audio.currentTime = 0;
    }
  }, stepTime);
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
}

function setBackground(src) {
  background.style.opacity = 0;
  setTimeout(() => {
    background.style.backgroundImage = `url("${src}")`;
    background.style.opacity = 1;
  }, 600);
}

function stopAllAudio() {
  Object.values(sounds).forEach(audio => {
    fadeOut(audio);
  });

  stopTone();
}

function startSelectedSounds() {
  document.querySelectorAll("[data-sound]").forEach(toggle => {
    const name = toggle.dataset.sound;
    const audio = sounds[name];

    if (toggle.checked) {
      const slider = document.querySelector(
        `[data-volume="${name}"]`
      );

      const targetVolume = Number(slider.value);

      fadeIn(audio, targetVolume);
    } else {
      fadeOut(audio);
    }
  });
}

function updateVolumes() {
  document.querySelectorAll("[data-volume]").forEach(slider => {
    const name = slider.dataset.volume;
    const targetVolume = Number(slider.value);

    sounds[name].volume = targetVolume;
  });
}

function startTone() {
  const toneToggle = document.getElementById("toneToggle");
  if (!toneToggle.checked) return;

  ensureAudioContext();
  stopTone();

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

function completeSession() {
  clearInterval(timerInterval);
  stopAllAudio();
  fadeIn(bowl, 1);
  timerDisplay.textContent = "Complete";
  menu.classList.add("open");
}

function beginSession() {
  ensureAudioContext();
  updateVolumes();
  setBackground(backgroundSelect.value);
  startSelectedSounds();
  startTone();
  startTimer(Number(timerSelect.value));
  menu.classList.remove("open");
}

function stopSession() {
  clearInterval(timerInterval);
  stopAllAudio();
  timerDisplay.textContent = `${timerSelect.value}:00`;
  menu.classList.add("open");
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

    const slider = document.querySelector(
      `[data-volume="${name}"]`
    );

    const targetVolume = Number(slider.value);

    if (toggle.checked) {
      fadeIn(audio, targetVolume);
    } else {
      fadeOut(audio);
    }
  });
});

document.getElementById("toneVolume").addEventListener("input", e => {
  if (toneGain) {
    toneGain.gain.value = Number(e.target.value) * 0.08;
  }
});

beginBtn.addEventListener("click", beginSession);
stopBtn.addEventListener("click", stopSession);

menuBtn.addEventListener("click", () => {
  menu.classList.toggle("open");
});

updateVolumes();
timerDisplay.textContent = `${timerSelect.value}:00`;