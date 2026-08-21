using UnityEngine;

// Звук игры целиком считается числами при запуске: ни одного файла .wav.
// Причина та же, что у картинок, — репозиторий остаётся текстовым, а звуки
// правятся числами в этом файле, а не редактором.
public static class Zvuki
{
    const int Chastota = 44100;

    static AudioSource kanalEffektov;
    static AudioSource kanalMuzyki;

    static AudioClip pryzhok, moneta, topot, bonus, udar, lom, smert, pobeda;
    static AudioClip muzyka;

    public static void Podgotovit(GameObject gde)
    {
        if (kanalEffektov != null) return;

        kanalEffektov = gde.AddComponent<AudioSource>();
        kanalEffektov.playOnAwake = false;
        kanalEffektov.volume = 0.45f;

        kanalMuzyki = gde.AddComponent<AudioSource>();
        kanalMuzyki.playOnAwake = false;
        kanalMuzyki.loop = true;
        kanalMuzyki.volume = 0.22f;

        pryzhok = Skolzhenie("pryzhok", 260f, 720f, 0.16f, 0.5f);
        moneta = Noty("moneta", new[] { 88, 95 }, new[] { 0.07f, 0.2f }, 0.5f, 0.5f);
        topot = Skolzhenie("topot", 420f, 110f, 0.12f, 0.35f);
        bonus = Noty("bonus", new[] { 72, 76, 79, 84, 88 }, new[] { 0.06f, 0.06f, 0.06f, 0.06f, 0.16f }, 0.5f, 0.45f);
        udar = Skolzhenie("udar", 180f, 90f, 0.09f, 0.3f);
        lom = Shum("lom", 0.18f, 0.4f);
        smert = Noty("smert", new[] { 79, 74, 70, 65, 60, 53 }, new[] { 0.09f, 0.09f, 0.09f, 0.09f, 0.12f, 0.4f }, 0.5f, 0.5f);
        pobeda = Noty("pobeda", new[] { 60, 64, 67, 72, 67, 72, 76, 79 },
                      new[] { 0.11f, 0.11f, 0.11f, 0.11f, 0.11f, 0.11f, 0.11f, 0.5f }, 0.5f, 0.45f);
        muzyka = Melodiya();
    }

    public static void Pryzhok() { Igrat(pryzhok); }
    public static void Moneta() { Igrat(moneta); }
    public static void Topot() { Igrat(topot); }
    public static void Bonus() { Igrat(bonus); }
    public static void Udar() { Igrat(udar); }
    public static void Lom() { Igrat(lom); }
    public static void Smert() { Igrat(smert); }
    public static void Pobeda() { Igrat(pobeda); }

    public static void MuzykuVklyuchit()
    {
        if (kanalMuzyki == null || muzyka == null) return;
        kanalMuzyki.clip = muzyka;
        if (!kanalMuzyki.isPlaying) kanalMuzyki.Play();
    }

    public static void MuzykuVyklyuchit()
    {
        if (kanalMuzyki != null) kanalMuzyki.Stop();
    }

    static void Igrat(AudioClip zvuk)
    {
        if (kanalEffektov == null || zvuk == null) return;
        kanalEffektov.PlayOneShot(zvuk);
    }

    // --- как это устроено -------------------------------------------------
    // Квадратная волна: значение прыгает между +1 и −1. Так звучали приставки,
    // и так проще всего получить узнаваемый «пиксельный» звук без сэмплов.

    static float Kvadrat(float faza)
    {
        return (faza - Mathf.Floor(faza)) < 0.5f ? 1f : -1f;
    }

    static float ChastotaNoty(int nota)
    {
        // Номер ноты как в MIDI: 60 — до первой октавы, 69 — ля 440 Гц.
        return 440f * Mathf.Pow(2f, (nota - 69) / 12f);
    }

    static AudioClip Sobrat(string imya, float[] tochki)
    {
        AudioClip zvuk = AudioClip.Create(imya, tochki.Length, 1, Chastota, false);
        zvuk.SetData(tochki, 0);
        return zvuk;
    }

    // Скольжение частоты: прыжок вверх, шлепок вниз.
    static AudioClip Skolzhenie(string imya, float ot, float doChastoty, float dlina, float gromkost)
    {
        int vsego = Mathf.RoundToInt(Chastota * dlina);
        float[] tochki = new float[vsego];
        float faza = 0f;
        for (int i = 0; i < vsego; i++)
        {
            float dolya = (float)i / vsego;
            float chastota = Mathf.Lerp(ot, doChastoty, dolya);
            faza += chastota / Chastota;
            // Затухание в конце — иначе звук обрывается щелчком.
            float ogibayuschaya = Mathf.Min(1f, (1f - dolya) * 4f);
            tochki[i] = Kvadrat(faza) * gromkost * ogibayuschaya;
        }
        return Sobrat(imya, tochki);
    }

    static AudioClip Noty(string imya, int[] noty, float[] dliny, float duty, float gromkost)
    {
        float vsegoSekund = 0f;
        for (int i = 0; i < dliny.Length; i++) vsegoSekund += dliny[i];
        float[] tochki = new float[Mathf.RoundToInt(Chastota * vsegoSekund) + 1];
        int mesto = 0;
        for (int n = 0; n < noty.Length; n++)
        {
            int dlina = Mathf.RoundToInt(Chastota * dliny[n]);
            float chastota = ChastotaNoty(noty[n]);
            float faza = 0f;
            for (int i = 0; i < dlina && mesto < tochki.Length; i++, mesto++)
            {
                faza += chastota / Chastota;
                float dolya = (float)i / dlina;
                float ogibayuschaya = Mathf.Min(1f, (1f - dolya) * 6f);
                tochki[mesto] = ((faza - Mathf.Floor(faza)) < duty ? 1f : -1f) * gromkost * ogibayuschaya;
            }
        }
        return Sobrat(imya, tochki);
    }

    // Белый шум: разлетающийся кирпич.
    static AudioClip Shum(string imya, float dlina, float gromkost)
    {
        int vsego = Mathf.RoundToInt(Chastota * dlina);
        float[] tochki = new float[vsego];
        System.Random sluchaj = new System.Random(7); // одно и то же зерно: звук должен быть одинаковым
        for (int i = 0; i < vsego; i++)
        {
            float dolya = (float)i / vsego;
            tochki[i] = (float)(sluchaj.NextDouble() * 2.0 - 1.0) * gromkost * (1f - dolya);
        }
        return Sobrat(imya, tochki);
    }

    // Музыка: своя мелодия, ничего чужого не цитируем. Восемь тактов,
    // бодрый мажор, зацикливается без паузы.
    static AudioClip Melodiya()
    {
        int[] verh =
        {
            72, 76, 79, 76, 72, 74, 76, 74,
            72, 76, 81, 79, 77, 76, 74, 72,
            71, 74, 79, 77, 76, 74, 72, 71,
            69, 72, 76, 74, 72, 71, 69, 67
        };
        int[] niz =
        {
            48, 48, 55, 55, 48, 48, 55, 55,
            53, 53, 60, 60, 53, 53, 60, 60,
            50, 50, 57, 57, 50, 50, 57, 57,
            43, 43, 50, 50, 43, 43, 50, 50
        };

        float shag = 0.15f;                       // длительность одной ноты
        int dlinaNoty = Mathf.RoundToInt(Chastota * shag);
        float[] tochki = new float[dlinaNoty * verh.Length];

        for (int n = 0; n < verh.Length; n++)
        {
            float chVerh = ChastotaNoty(verh[n]);
            float chNiz = ChastotaNoty(niz[n]);
            float fazaV = 0f, fazaN = 0f;
            for (int i = 0; i < dlinaNoty; i++)
            {
                int mesto = n * dlinaNoty + i;
                float dolya = (float)i / dlinaNoty;
                float ogibayuschaya = Mathf.Min(1f, (1f - dolya) * 5f) * Mathf.Min(1f, dolya * 30f);
                fazaV += chVerh / Chastota;
                fazaN += chNiz / Chastota;
                float golos = ((fazaV - Mathf.Floor(fazaV)) < 0.25f ? 1f : -1f) * 0.5f;
                float bas = Kvadrat(fazaN) * 0.32f;
                tochki[mesto] = (golos + bas) * ogibayuschaya * 0.6f;
            }
        }
        return Sobrat("muzyka", tochki);
    }
}
