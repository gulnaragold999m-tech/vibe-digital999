using UnityEngine;

// Звук тоже считается кодом: ни одного .wav и .mp3 в проекте.
//
// Причина та же, что и у графики (см. Art.cs) — самодостаточность.
// Плюс лицензионная чистота: чужие звуки в игру-витрину класть нельзя,
// а сгенерированный квадратной волной сигнал ничей.
public static class Sfx
{
    const int Rate = 44100;

    // Нота: частота в герцах (0 — пауза) и длительность в секундах.
    public struct Note
    {
        public float f, d;
        public Note(float f, float d) { this.f = f; this.d = d; }
    }

    public static AudioClip Jump, Coin, Stomp, Bump, Break, Power, Hurt, Die, Flag, OneUp, Kick;

    static AudioSource _sfx;      // короткие звуки
    static AudioSource _music;    // фоновая мелодия
    static bool _gotovo;

    public static bool MusicOn = true;
    public static bool SoundOn = true;

    public static void Init(GameObject host)
    {
        if (_gotovo) return;
        _gotovo = true;

        _sfx = host.AddComponent<AudioSource>();
        _sfx.playOnAwake = false;
        _sfx.spatialBlend = 0f;     // 2D-звук: игрока «слышно» одинаково по всему экрану

        _music = host.AddComponent<AudioSource>();
        _music.playOnAwake = false;
        _music.loop = true;
        _music.volume = 0.18f;
        _music.spatialBlend = 0f;

        Jump  = Sweep("jump", 330f, 720f, 0.16f, 0.30f, 0.22f);
        Coin  = Tones("coin", new[] { N(988, 0.05f), N(1319, 0.16f) }, 0.5f, 0.22f);
        Stomp = Sweep("stomp", 520f, 130f, 0.11f, 0.5f, 0.26f);
        Bump  = Sweep("bump", 200f, 90f, 0.08f, 0.5f, 0.24f);
        Break = Noise("break", 0.22f, 0.22f);
        Power = Tones("power", new[] {
            N(392, 0.05f), N(523, 0.05f), N(659, 0.05f), N(784, 0.05f),
            N(1047, 0.05f), N(1319, 0.14f) }, 0.25f, 0.20f);
        Hurt  = Tones("hurt", new[] { N(392, 0.08f), N(294, 0.08f), N(196, 0.18f) }, 0.5f, 0.24f);
        Die   = Tones("die", new[] {
            N(523, 0.10f), N(0, 0.06f), N(392, 0.10f), N(330, 0.10f),
            N(262, 0.10f), N(196, 0.30f) }, 0.5f, 0.26f);
        Flag  = Tones("flag", new[] {
            N(262, 0.09f), N(330, 0.09f), N(392, 0.09f), N(523, 0.09f),
            N(659, 0.09f), N(784, 0.09f), N(1047, 0.30f) }, 0.35f, 0.22f);
        OneUp = Tones("oneup", new[] {
            N(659, 0.08f), N(784, 0.08f), N(1047, 0.08f), N(1319, 0.22f) }, 0.35f, 0.22f);
        Kick  = Sweep("kick", 900f, 300f, 0.10f, 0.25f, 0.24f);

        _music.clip = Melody();
    }

    static Note N(float f, float d) { return new Note(f, d); }

    public static void Play(AudioClip clip, float volume = 1f)
    {
        if (!SoundOn || _sfx == null || clip == null) return;
        _sfx.PlayOneShot(clip, volume);
    }

    public static void MusicPlay()
    {
        if (_music == null) return;
        _music.pitch = 1f;
        if (MusicOn && !_music.isPlaying) _music.Play();
    }

    public static void MusicStop()
    {
        if (_music != null) _music.Stop();
    }

    // Ускорение мелодии, когда время на исходе — старый приём, честно работает.
    public static void MusicPitch(float p)
    {
        if (_music != null) _music.pitch = p;
    }

    public static void MusicToggle()
    {
        MusicOn = !MusicOn;
        if (MusicOn) MusicPlay(); else MusicStop();
    }

    // ---------- синтез ----------

    // Квадратная волна: нужен «пиксельный» звук, а не чистый тон.
    static float Square(double phase, float duty)
    {
        return (phase % 1.0) < duty ? 1f : -1f;
    }

    static float Triangle(double phase)
    {
        double t = phase % 1.0;
        return (float)(t < 0.5 ? (4.0 * t - 1.0) : (3.0 - 4.0 * t));
    }

    // Огибающая: резкая атака, спад к концу ноты. Без неё каждая нота
    // начинается щелчком — это слышно и раздражает.
    static float Env(float t, float len)
    {
        const float attack = 0.005f;
        if (t < attack) return t / attack;
        float k = 1f - (t - attack) / Mathf.Max(0.001f, len - attack);
        return Mathf.Clamp01(k);
    }

    static AudioClip Tones(string name, Note[] notes, float duty, float vol)
    {
        float total = 0f;
        foreach (var n in notes) total += n.d;
        int count = Mathf.Max(1, Mathf.CeilToInt(total * Rate));
        var data = new float[count];

        int pos = 0;
        double phase = 0;
        foreach (var n in notes)
        {
            int len = Mathf.CeilToInt(n.d * Rate);
            for (int i = 0; i < len && pos < count; i++, pos++)
            {
                if (n.f <= 0f) { data[pos] = 0f; continue; }
                phase += n.f / (double)Rate;
                data[pos] = Square(phase, duty) * Env(i / (float)Rate, n.d) * vol;
            }
        }
        return Clip(name, data);
    }

    static AudioClip Sweep(string name, float from, float to, float dur, float duty, float vol)
    {
        int count = Mathf.CeilToInt(dur * Rate);
        var data = new float[count];
        double phase = 0;
        for (int i = 0; i < count; i++)
        {
            float k = i / (float)count;
            float f = Mathf.Lerp(from, to, k);
            phase += f / (double)Rate;
            data[i] = Square(phase, duty) * Env(i / (float)Rate, dur) * vol;
        }
        return Clip(name, data);
    }

    static AudioClip Noise(string name, float dur, float vol)
    {
        int count = Mathf.CeilToInt(dur * Rate);
        var data = new float[count];
        var rnd = new System.Random(1234);
        float last = 0f;
        for (int i = 0; i < count; i++)
        {
            // Сглаженный шум: чистый белый звучит как помеха, а не как удар.
            float r = (float)(rnd.NextDouble() * 2.0 - 1.0);
            last = Mathf.Lerp(last, r, 0.5f);
            data[i] = last * Env(i / (float)Rate, dur) * vol;
        }
        return Clip(name, data);
    }

    static AudioClip Clip(string name, float[] data)
    {
        var clip = AudioClip.Create(name, data.Length, 1, Rate, false);
        clip.SetData(data, 0);
        return clip;
    }

    // ---------- фоновая мелодия ----------
    // Своя, восемь тактов, зацикленная. Ноты записаны номерами MIDI,
    // 0 — пауза. Верхняя строка — мелодия, нижняя — бас.

    static readonly int[] Lead = {
        76, 76,  0, 76,  0, 72, 76,  0,  79,  0,  0,  0, 67,  0,  0,  0,
        72,  0,  0, 67,  0,  0, 64,  0,   0, 69,  0, 71,  0, 70, 69,  0,
        67, 76, 79, 81,  0, 77, 79,  0,  76,  0, 72, 74, 71,  0,  0,  0,
        72,  0,  0, 67,  0,  0, 64,  0,   0, 69,  0, 71,  0, 70, 69,  0,
    };

    static readonly int[] Bass = {
        48,  0, 48,  0, 48,  0, 48,  0,  43,  0, 43,  0, 43,  0, 43,  0,
        45,  0, 45,  0, 45,  0, 45,  0,  40,  0, 40,  0, 40,  0, 40,  0,
        48,  0, 48,  0, 48,  0, 48,  0,  43,  0, 43,  0, 43,  0, 43,  0,
        45,  0, 45,  0, 45,  0, 45,  0,  40,  0, 40,  0, 40,  0, 40,  0,
    };

    const float Step = 0.15f;   // длительность одной восьмой, примерно 200 ударов в минуту

    static float Midi(int n) { return 440f * Mathf.Pow(2f, (n - 69) / 12f); }

    static AudioClip Melody()
    {
        int stepLen = Mathf.CeilToInt(Step * Rate);
        int count = stepLen * Lead.Length;
        var data = new float[count];

        double ph1 = 0, ph2 = 0;
        int heldLead = 0, heldBass = 0;
        float leadT = 0f, bassT = 0f;

        for (int s = 0; s < Lead.Length; s++)
        {
            // Ноль означает «тянем предыдущую ноту», а не тишину:
            // так мелодия не рассыпается на отдельные щелчки.
            if (Lead[s] != 0) { heldLead = Lead[s]; leadT = 0f; }
            if (Bass[s] != 0) { heldBass = Bass[s]; bassT = 0f; }

            for (int i = 0; i < stepLen; i++)
            {
                int pos = s * stepLen + i;
                float v = 0f;

                if (heldLead > 0)
                {
                    ph1 += Midi(heldLead) / (double)Rate;
                    v += Square(ph1, 0.25f) * Mathf.Clamp01(1f - leadT / 0.45f) * 0.22f;
                }
                if (heldBass > 0)
                {
                    ph2 += Midi(heldBass) / (double)Rate;
                    v += Triangle(ph2) * Mathf.Clamp01(1f - bassT / 0.30f) * 0.30f;
                }

                data[pos] = Mathf.Clamp(v, -1f, 1f);
                leadT += 1f / Rate;
                bassT += 1f / Rate;
            }
        }
        return Clip("music", data);
    }
}
