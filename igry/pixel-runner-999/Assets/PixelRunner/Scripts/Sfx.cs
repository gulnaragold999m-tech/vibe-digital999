using System.Collections.Generic;
using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Звук тоже считается кодом: ни одного mp3 в проекте. Каждый звук — набор
    /// нот, каждая нота — частота, длительность и форма волны, как на приставках
    /// восьмибитной эпохи. Мелодия своя, не заимствованная.
    /// </summary>
    public static class Sfx
    {
        const int Rate = 22050;
        const int Square = 0, Triangle = 1, Noise = 2;

        static AudioSource sfxSource;
        static AudioSource musicSource;
        static readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        static bool musicEnabled = true;

        struct Note
        {
            public float f0, f1, dur, vol;
            public int wave;

            public Note(float f0, float f1, float dur, int wave, float vol)
            {
                this.f0 = f0; this.f1 = f1; this.dur = dur; this.wave = wave; this.vol = vol;
            }
        }

        public static bool MusicEnabled { get { return musicEnabled; } }

        public static void Init()
        {
            if (sfxSource != null) return;
            var go = new GameObject("Звук");
            Object.DontDestroyOnLoad(go);
            sfxSource = go.AddComponent<AudioSource>();
            sfxSource.playOnAwake = false;
            musicSource = go.AddComponent<AudioSource>();
            musicSource.playOnAwake = false;
            musicSource.loop = true;
            musicSource.volume = 0.22f;
            musicSource.clip = Music();
        }

        public static void Play(string name, float volume = 1f)
        {
            Init();
            AudioClip c;
            if (!clips.TryGetValue(name, out c))
            {
                c = Make(name);
                clips[name] = c;
            }
            if (c != null) sfxSource.PlayOneShot(c, volume);
        }

        public static void MusicPlay()
        {
            Init();
            if (musicEnabled && !musicSource.isPlaying) musicSource.Play();
        }

        public static void MusicStop()
        {
            if (musicSource != null) musicSource.Stop();
        }

        public static void MusicPause(bool paused)
        {
            if (musicSource == null) return;
            if (paused) musicSource.Pause();
            else if (musicEnabled) musicSource.UnPause();
        }

        public static void ToggleMusic()
        {
            Init();
            musicEnabled = !musicEnabled;
            if (musicEnabled) musicSource.Play();
            else musicSource.Stop();
        }

        // ---------------------------------------------------------- звуки
        static AudioClip Make(string name)
        {
            switch (name)
            {
                case "jump":
                    return Build(name, new[] { new Note(320, 780, 0.16f, Square, 0.7f) });
                case "coin":
                    return Build(name, new[]
                    {
                        new Note(988, 988, 0.06f, Square, 0.6f),
                        new Note(1319, 1319, 0.14f, Square, 0.6f),
                    });
                case "stomp":
                    return Build(name, new[]
                    {
                        new Note(600, 120, 0.09f, Noise, 0.5f),
                        new Note(200, 90, 0.08f, Square, 0.6f),
                    });
                case "bump":
                    return Build(name, new[] { new Note(240, 130, 0.08f, Square, 0.6f) });
                case "break":
                    return Build(name, new[]
                    {
                        new Note(900, 200, 0.12f, Noise, 0.7f),
                        new Note(400, 100, 0.10f, Noise, 0.5f),
                    });
                case "power":
                    return Build(name, new[]
                    {
                        new Note(392, 392, 0.06f, Square, 0.6f),
                        new Note(523, 523, 0.06f, Square, 0.6f),
                        new Note(659, 659, 0.06f, Square, 0.6f),
                        new Note(784, 784, 0.06f, Square, 0.6f),
                        new Note(1047, 1047, 0.14f, Square, 0.6f),
                    });
                case "hurt":
                    return Build(name, new[]
                    {
                        new Note(523, 523, 0.07f, Square, 0.6f),
                        new Note(392, 392, 0.07f, Square, 0.6f),
                        new Note(262, 196, 0.18f, Square, 0.6f),
                    });
                case "die":
                    return Build(name, new[]
                    {
                        new Note(659, 659, 0.10f, Square, 0.7f),
                        new Note(0, 0, 0.06f, Square, 0f),
                        new Note(523, 523, 0.10f, Square, 0.7f),
                        new Note(392, 392, 0.10f, Square, 0.7f),
                        new Note(330, 165, 0.40f, Square, 0.7f),
                    });
                case "kick":
                    return Build(name, new[] { new Note(700, 300, 0.07f, Noise, 0.6f) });
                case "flag":
                    return Build(name, new[]
                    {
                        new Note(392, 392, 0.10f, Square, 0.65f),
                        new Note(523, 523, 0.10f, Square, 0.65f),
                        new Note(659, 659, 0.10f, Square, 0.65f),
                        new Note(784, 784, 0.10f, Square, 0.65f),
                        new Note(1047, 1047, 0.10f, Square, 0.65f),
                        new Note(784, 784, 0.10f, Square, 0.65f),
                        new Note(1047, 1047, 0.45f, Square, 0.7f),
                    });
                case "life":
                    return Build(name, new[]
                    {
                        new Note(784, 784, 0.08f, Square, 0.6f),
                        new Note(1047, 1047, 0.08f, Square, 0.6f),
                        new Note(1319, 1319, 0.20f, Square, 0.6f),
                    });
                case "start":
                    return Build(name, new[]
                    {
                        new Note(523, 523, 0.09f, Square, 0.6f),
                        new Note(659, 659, 0.09f, Square, 0.6f),
                        new Note(784, 784, 0.18f, Square, 0.6f),
                    });
                case "gameover":
                    return Build(name, new[]
                    {
                        new Note(392, 392, 0.20f, Square, 0.6f),
                        new Note(330, 330, 0.20f, Square, 0.6f),
                        new Note(262, 262, 0.20f, Square, 0.6f),
                        new Note(196, 131, 0.60f, Triangle, 0.7f),
                    });
                case "pause":
                    return Build(name, new[] { new Note(660, 440, 0.10f, Square, 0.5f) });
            }
            return null;
        }

        static float Wave(int kind, float phase)
        {
            switch (kind)
            {
                case Square: return Mathf.Repeat(phase, 1f) < 0.5f ? 1f : -1f;
                case Triangle: return Mathf.PingPong(phase * 2f, 1f) * 2f - 1f;
                default: return Random.value * 2f - 1f;
            }
        }

        static AudioClip Build(string name, Note[] notes)
        {
            int total = 0;
            for (int i = 0; i < notes.Length; i++) total += Mathf.CeilToInt(notes[i].dur * Rate);
            if (total <= 0) return null;

            var data = new float[total];
            int p = 0;
            float phase = 0f;
            for (int n = 0; n < notes.Length; n++)
            {
                Note note = notes[n];
                int len = Mathf.CeilToInt(note.dur * Rate);
                for (int i = 0; i < len; i++)
                {
                    float t = i / (float)len;
                    float f = Mathf.Lerp(note.f0, note.f1, t);
                    phase += f / Rate;
                    // короткая атака, чтобы не щёлкало, и затухание к концу ноты
                    float env = Mathf.Min(1f, i / (Rate * 0.004f)) * (1f - t * t * 0.85f);
                    data[p + i] = Wave(note.wave, phase) * env * note.vol * 0.35f;
                }
                p += len;
            }

            var clip = AudioClip.Create(name, total, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        // ---------------------------------------------------------- мелодия
        static AudioClip Music()
        {
            // -1 — пауза. Числа — ноты MIDI: 60 это до первой октавы.
            int[] lead =
            {
                67, 69, 72, 74, 72, -1, 69, -1,
                67, 64, 67, 69, 67, -1, -1, -1,
                65, 67, 69, 71, 72, -1, 74, -1,
                76, 72, 69, 67, 64, -1, -1, -1,
            };
            int[] bass =
            {
                48, 48, 52, 52, 55, 55, 52, 52,
                53, 53, 57, 57, 55, 55, 48, 48,
            };

            const float bpm = 148f;
            float beat = 60f / bpm;
            float leadStep = beat * 0.5f;
            float bassStep = beat;

            int total = Mathf.CeilToInt(lead.Length * leadStep * Rate);
            var data = new float[total];

            AddVoice(data, lead, leadStep, Square, 0.20f);
            AddVoice(data, bass, bassStep, Triangle, 0.26f);

            for (int i = 0; i < total; i++) data[i] = Mathf.Clamp(data[i], -1f, 1f);

            var clip = AudioClip.Create("music", total, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        static void AddVoice(float[] data, int[] notes, float step, int wave, float vol)
        {
            int stepLen = Mathf.CeilToInt(step * Rate);
            float phase = 0f;
            for (int n = 0; n < notes.Length; n++)
            {
                int start = n * stepLen;
                if (notes[n] < 0) continue;
                float f = 440f * Mathf.Pow(2f, (notes[n] - 69) / 12f);
                for (int i = 0; i < stepLen; i++)
                {
                    int idx = start + i;
                    if (idx >= data.Length) break;
                    float t = i / (float)stepLen;
                    phase += f / Rate;
                    // нота звучит не весь шаг — так слышно ритм
                    float env = Mathf.Min(1f, i / (Rate * 0.005f)) * Mathf.Clamp01(1.25f - t * 1.6f);
                    data[idx] += Wave(wave, phase) * env * vol;
                }
            }
        }
    }
}
