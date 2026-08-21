using UnityEngine;
using System.Collections;
using System.Collections.Generic;

// Правила игры: счёт, жизни, время, смена уровней, заставка и конец.
// Всё, что не про физику героя, живёт здесь.
public class GameManager : MonoBehaviour
{
    public static GameManager I;

    public enum Sost { Zastavka, Igra, Smert, Perehod, Konec, Pobeda }

    // Сколько «единиц времени» уходит за секунду. 2.5 даёт примерно
    // две минуты на уровень — успеваешь пройти, но не гулять.
    const float SkorostVremeni = 2.5f;
    const float VremyaNaUroven = 300f;

    public Sost Sostoyanie { get; private set; }
    public int Ochki { get; private set; }
    public int Monety { get; private set; }
    public int Zhizni { get; private set; }
    public int Uroven { get; private set; }
    public int Rekord { get; private set; }
    public float Vremya { get; private set; }
    public bool Pauza { get; private set; }
    public PlayerController Geroy { get; private set; }

    // Всплывающие цифры очков. Рисует их Hud, здесь только список.
    public struct Vsplyv { public string Text; public Vector3 Poz; public float T; }
    public readonly List<Vsplyv> Vsplyvy = new List<Vsplyv>();

    LevelBuilder.Info _info;
    CameraFollow _kamera;
    bool _muzykaUskorena;

    void Awake()
    {
        I = this;
        Sostoyanie = Sost.Zastavka;
        Zhizni = 3;
        Uroven = 1;
        Rekord = PlayerPrefs.GetInt("vibe_jumper_rekord", 0);
    }

    public void PrivyazatKameru(CameraFollow k) { _kamera = k; }

    // ---------- ход игры ----------

    public void NachatIgru()
    {
        Ochki = 0;
        Monety = 0;
        Zhizni = 3;
        Uroven = 1;
        Sostoyanie = Sost.Igra;
        StroitUroven();
    }

    void StroitUroven()
    {
        if (_info.Koren != null) Destroy(_info.Koren.gameObject);

        _info = LevelBuilder.Postroit(LevelData.Poluchit(Uroven), "Uroven" + Uroven);
        SozdatGeroya(_info.Start);
        SozdatZvezdy();

        if (_kamera != null) _kamera.Nastroit(Geroy.transform, _info.Shirina, _info.Vysota);

        Vremya = VremyaNaUroven;
        _muzykaUskorena = false;
        Vsplyvy.Clear();
        Sfx.MusicPitch(1f);
        Sfx.MusicPlay();
    }

    void SozdatGeroya(Vector3 gde)
    {
        var go = new GameObject("Geroy");
        go.transform.SetParent(_info.Koren, false);
        go.transform.position = gde;

        // Обязательные компоненты добавляем руками и до скрипта:
        // так порядок гарантирован в любой версии Unity.
        go.AddComponent<Rigidbody2D>();
        go.AddComponent<BoxCollider2D>();
        Geroy = go.AddComponent<PlayerController>();
    }

    // Звёздное небо. Своя палитра студии тёмная, поэтому небо ночное,
    // и без звёзд оно выглядит как незакрашенный фон.
    void SozdatZvezdy()
    {
        var koren = new GameObject("Zvezdy");
        koren.transform.SetParent(_info.Koren, false);
        koren.transform.position = new Vector3(0f, 0f, 0f);
        koren.AddComponent<Parallax>().Koefficient = 0.12f;

        var rnd = new System.Random(Uroven * 7919);
        int skolko = Mathf.Clamp((int)(_info.Shirina * 0.35f), 30, 90);

        for (int i = 0; i < skolko; i++)
        {
            var go = new GameObject("Zvezda");
            go.transform.SetParent(koren.transform, false);
            go.transform.position = new Vector3(
                (float)rnd.NextDouble() * _info.Shirina,
                6f + (float)rnd.NextDouble() * 8f, 0f);

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = Art.Star;
            sr.sortingOrder = -20;
            float a = 0.25f + (float)rnd.NextDouble() * 0.5f;
            sr.color = new Color(1f, 1f, 1f, a);
            go.transform.localScale = Vector3.one * (0.6f + (float)rnd.NextDouble() * 0.8f);
        }
    }

    void Update()
    {
        ObnovitVsplyvy();

        switch (Sostoyanie)
        {
            case Sost.Zastavka:
                if (KnopkaDa()) NachatIgru();
                break;

            case Sost.Igra:
                if (KnopkaPauzy()) PereklyuchitPauzu();
                if (Input.GetKeyDown(KeyCode.M)) Sfx.MusicToggle();
                if (!Pauza) TikatVremya();
                break;

            case Sost.Konec:
            case Sost.Pobeda:
                if (KnopkaDa()) VernutsyaVMenyu();
                break;
        }
    }

    void TikatVremya()
    {
        if (Geroy == null || !Geroy.Zhiv) return;

        Vremya -= Time.deltaTime * SkorostVremeni;

        if (!_muzykaUskorena && Vremya <= 100f)
        {
            _muzykaUskorena = true;
            Sfx.MusicPitch(1.18f);      // время кончается — музыка быстрее
        }

        if (Vremya <= 0f)
        {
            Vremya = 0f;
            Geroy.Umeret();
        }
    }

    void ObnovitVsplyvy()
    {
        for (int i = Vsplyvy.Count - 1; i >= 0; i--)
        {
            var v = Vsplyvy[i];
            v.T += Time.unscaledDeltaTime;
            if (v.T > 1.1f) Vsplyvy.RemoveAt(i);
            else Vsplyvy[i] = v;
        }
    }

    public void PereklyuchitPauzu()
    {
        Pauza = !Pauza;
        Time.timeScale = Pauza ? 0f : 1f;
        if (Pauza) Sfx.MusicStop(); else Sfx.MusicPlay();
    }

    void VernutsyaVMenyu()
    {
        if (_info.Koren != null) Destroy(_info.Koren.gameObject);
        _info = default(LevelBuilder.Info);
        Geroy = null;
        Sostoyanie = Sost.Zastavka;
        Sfx.MusicStop();
    }

    // ---------- события из игры ----------

    public void DobavitOchki(int skolko) { Ochki += skolko; ProveritRekord(); }

    public void DobavitOchki(int skolko, Vector3 gde)
    {
        Ochki += skolko;
        ProveritRekord();
        Vsplyvy.Add(new Vsplyv { Text = skolko.ToString(), Poz = gde + Vector3.up * 0.6f, T = 0f });
    }

    public void SobratMonetu(Vector3 gde) { SobratMonetu(gde, 100); }

    public void SobratMonetu(Vector3 gde, int ochki)
    {
        Monety++;
        Sfx.Play(Sfx.Coin, 0.8f);
        DobavitOchki(ochki, gde);

        // Сто монет — жизнь. Иначе монеты быстро перестают что-то значить.
        if (Monety >= 100)
        {
            Monety -= 100;
            DobavitZhizn(gde);
        }
    }

    public void DobavitZhizn(Vector3 gde)
    {
        Zhizni++;
        Sfx.Play(Sfx.OneUp);
        Vsplyvy.Add(new Vsplyv { Text = "+1 жизнь", Poz = gde + Vector3.up * 0.6f, T = 0f });
    }

    public void GeroyUmiraet()
    {
        if (Sostoyanie != Sost.Igra) return;
        Sostoyanie = Sost.Smert;
        StartCoroutine(PosleSmerti());
    }

    IEnumerator PosleSmerti()
    {
        yield return new WaitForSeconds(2.6f);

        Zhizni--;
        if (Zhizni <= 0)
        {
            Sostoyanie = Sost.Konec;
            SohranitRekord();
            yield break;
        }

        StroitUroven();
        Sostoyanie = Sost.Igra;
    }

    public void UrovenProiden(int bonus)
    {
        if (Sostoyanie != Sost.Igra) return;
        Sostoyanie = Sost.Perehod;

        DobavitOchki(bonus, Geroy != null ? Geroy.transform.position : Vector3.zero);

        // Оставшееся время — в очки. Классический приём, который
        // заставляет проходить уровень быстро, а не отсиживаться.
        int zaVremya = Mathf.RoundToInt(Vremya) * 10;
        Ochki += zaVremya;
        ProveritRekord();

        StartCoroutine(SleduyushchiyUroven());
    }

    IEnumerator SleduyushchiyUroven()
    {
        yield return new WaitForSeconds(2.5f);

        Uroven++;
        if (Uroven > LevelData.Vse.Length)
        {
            Sostoyanie = Sost.Pobeda;
            SohranitRekord();
            Sfx.MusicStop();
            Sfx.Play(Sfx.Flag);
            yield break;
        }

        StroitUroven();
        Sostoyanie = Sost.Igra;
    }

    void ProveritRekord()
    {
        if (Ochki > Rekord) Rekord = Ochki;
    }

    void SohranitRekord()
    {
        PlayerPrefs.SetInt("vibe_jumper_rekord", Rekord);
        PlayerPrefs.Save();
    }

    // ---------- ввод меню ----------

    static bool KnopkaDa()
    {
        return Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter)
            || Input.GetKeyDown(KeyCode.Space);
    }

    static bool KnopkaPauzy()
    {
        return Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P);
    }
}
