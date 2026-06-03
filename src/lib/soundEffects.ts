export type SoundEffect = "tap" | "paper" | "upload" | "open" | "success" | "flip" | "export";

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;

  const AudioContextCtor =
    window.AudioContext ??
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return null;
  audioContext = new AudioContextCtor();
  return audioContext;
};

const scheduleTone = (
  context: AudioContext,
  start: number,
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  endFrequency?: number,
) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

const scheduleNoise = (
  context: AudioContext,
  start: number,
  duration: number,
  volume: number,
  filterType: BiquadFilterType,
  frequency: number,
) => {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    const progress = index / data.length;
    data[index] = (Math.random() * 2 - 1) * (1 - progress);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
};

export const playSound = (effect: SoundEffect, enabled: boolean) => {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    void context.resume();
  }

  const now = context.currentTime + 0.006;

  switch (effect) {
    case "tap":
      scheduleTone(context, now, 430, 0.055, 0.028, "triangle", 320);
      scheduleNoise(context, now, 0.045, 0.012, "highpass", 1700);
      break;
    case "paper":
      scheduleNoise(context, now, 0.13, 0.034, "highpass", 1200);
      scheduleTone(context, now + 0.01, 210, 0.05, 0.014, "sine", 170);
      break;
    case "upload":
      scheduleTone(context, now, 620, 0.08, 0.034, "sine");
      scheduleTone(context, now + 0.075, 830, 0.1, 0.03, "sine");
      scheduleNoise(context, now + 0.015, 0.11, 0.015, "bandpass", 1900);
      break;
    case "open":
      scheduleTone(context, now, 310, 0.06, 0.028, "triangle", 390);
      scheduleTone(context, now + 0.045, 560, 0.08, 0.026, "sine");
      break;
    case "success":
      scheduleTone(context, now, 523.25, 0.075, 0.026, "sine");
      scheduleTone(context, now + 0.07, 659.25, 0.08, 0.026, "sine");
      scheduleTone(context, now + 0.14, 880, 0.1, 0.024, "sine");
      break;
    case "flip":
      scheduleNoise(context, now, 0.16, 0.038, "highpass", 1450);
      scheduleTone(context, now + 0.015, 260, 0.07, 0.014, "triangle", 190);
      break;
    case "export":
      scheduleNoise(context, now, 0.1, 0.02, "highpass", 1500);
      scheduleTone(context, now + 0.04, 720, 0.09, 0.028, "sine");
      break;
  }
};
