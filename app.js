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

const FADE_DURATION = 8000; // 8 seconds
const activeFades = new Map();

function cancelFade(audio) {
  if (activeFades.has(audio)) {
    clearInterval(activeFades.get(audio));
    activeFades.delete(audio);
  }
}

async function fadeIn(audio, targetVolume = 1) {
  cancelFade(audio);

  audio.volume = Math.max(audio.volume || 0, 0);

  try {
    if (audio.paused) {
      await audio.play();
    }
  } catch (error) {
    console.log("Playback requires interaction.", error);
    return;
  }

  const startVolume = audio.volume;
  const volumeChange = targetVolume - startVolume;
  const steps = 60;
  const stepTime = FADE_DURATION / steps;
  let currentStep = 0;

  const fade = setInterval(() => {
    currentStep++;
    const progress = currentStep / steps;

    audio.volume = Math.min(
      Math.max(startVolume + volumeChange * progress, 0),
      1
    );

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
    fadeOut(audio, true);
  });

  stopTone();
}

function startSelectedSounds() {
  const selectedToggles = Array.from(
    document.querySelectorAll("[data-sound]")
  ).filter(toggle => toggle.checked);

  selectedToggles.forEach((toggle, index) => {
    const name = toggle.dataset.sound;
    const audio = sounds[name];
    const slider = document.querySelector(`[data-volume="${name}"]`);
    const targetVolume = Number(slider.value);

    setTimeout(() => {
      fadeIn(audio, targetVolume);
    }, index * 1200);
  });

document.querySelectorAll("[data-sound]").forEach(toggle => {
  toggle.addEventListener("change", () => {
    const name = toggle.dataset.sound;
    const audio = sounds[name];
    const slider = document.querySelector(`[data-volume="${name}"]`);
    const targetVolume = Number(slider.value);

    if (toggle.checked) {
      fadeIn(audio, targetVolume);
    } else {
      fadeOut(audio, false); // do not reset time during casual toggle
    }
  });
});

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