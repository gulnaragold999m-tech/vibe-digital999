using UnityEngine;

// Главный распорядитель: собирает мир, считает очки и рисует надписи.
//
// Игра запускается сама, в любой сцене — даже в пустой. Так сделано нарочно:
// чтобы поиграть, достаточно открыть проект и нажать Play, ничего не надо
// перетаскивать мышью и настраивать в инспекторе.
public class Igra : MonoBehaviour
{
    public enum Sostoyanie { Zastavka, Igra, Smert, Pobeda, Konec }

    public static Igra Ya;

    public Sostoyanie Faza = Sostoyanie.Zastavka;
    public Igrok Geroj;
    public Mir MirIgry;

    const float VremyaNaUroven = 300f;
    const float RazmerKamery = 6.2f;
    const int ZhiznejVNachale = 3;

    int monety;
    int ochki;
    int zhizni = ZhiznejVNachale;
    float vremya;
    float zaderzhka;
    string itog = "";

    Camera kamera;
    Kamera slezhka;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Avtozapusk()
    {
        if (Ya == null) new GameObject("Игра").AddComponent<Igra>();
    }

    void Awake()
    {
        if (Ya != null && Ya != this)
        {
            Destroy(gameObject);
            return;
        }
        Ya = this;

        Application.targetFrameRate = 60;
        Sprajty.Podgotovit();
        Zvuki.Podgotovit(gameObject);
        Uroven.Proverit();

        SozdatKameru();
        NachatUroven();
        Faza = Sostoyanie.Zastavka;
        if (Geroj != null) Geroj.Upravlyaem = false;
    }

    void SozdatKameru()
    {
        GameObject predmet = Camera.main != null ? Camera.main.gameObject : null;
        if (predmet == null)
        {
            predmet = new GameObject("Камера");
            predmet.tag = "MainCamera";
        }

        kamera = predmet.GetComponent<Camera>();
        if (kamera == null) kamera = predmet.AddComponent<Camera>();
        kamera.orthographic = true;
        kamera.orthographicSize = RazmerKamery;
        kamera.clearFlags = CameraClearFlags.SolidColor;
        kamera.backgroundColor = Palitra.Nebo;
        kamera.transform.position = new Vector3(0f, RazmerKamery, -10f);

        if (predmet.GetComponent<AudioListener>() == null) predmet.AddComponent<AudioListener>();

        slezhka = predmet.GetComponent<Kamera>();
        if (slezhka == null) slezhka = predmet.AddComponent<Kamera>();
    }

    void NachatUroven()
    {
        if (MirIgry != null)
        {
            // Сначала выключаем, потом уничтожаем: Destroy срабатывает в конце
            // кадра, и до тех пор старые враги ещё успели бы «встретить» нового
            // героя. Выключенный объект не обновляется вообще.
            MirIgry.gameObject.SetActive(false);
            Destroy(MirIgry.gameObject);
        }

        GameObject koren = new GameObject("Мир");
        MirIgry = koren.AddComponent<Mir>();
        MirIgry.Postroit(Uroven.Karta);

        GameObject gerojPredmet = MirIgry.Kusok("герой", Sprajty.GerojStoya,
            new Vector3(MirIgry.StartIgroka.x, MirIgry.StartIgroka.y, 0f), 10);
        Geroj = gerojPredmet.AddComponent<Igrok>();
        Geroj.Nastroit(MirIgry);

        vremya = VremyaNaUroven;

        slezhka.Cel = gerojPredmet.transform;
        slezhka.LevyjKraj = 0f;
        slezhka.PravyjKraj = MirIgry.Shirina;
        slezhka.NizhnijKraj = 0f;
        slezhka.VerhnijKraj = MirIgry.Vysota;
        slezhka.Sbrosit(new Vector3(MirIgry.StartIgroka.x, RazmerKamery, -10f));

        Faza = Sostoyanie.Igra;
        Zvuki.MuzykuVklyuchit();
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Escape)) Application.Quit();

        switch (Faza)
        {
            case Sostoyanie.Zastavka:
                if (NazhataKnopka())
                {
                    Faza = Sostoyanie.Igra;
                    if (Geroj != null) Geroj.VklyuchitUpravlenie();
                    Zvuki.MuzykuVklyuchit();
                }
                break;

            case Sostoyanie.Igra:
                // Время идёт быстрее настоящего — как в приставочных играх:
                // 300 «единиц» это примерно две минуты живого времени.
                vremya -= Time.deltaTime * 2.4f;
                if (vremya <= 0f)
                {
                    vremya = 0f;
                    if (Geroj != null) Geroj.Umeret(false);
                }
                ProverkaFinisha();
                break;

            case Sostoyanie.Pobeda:
                zaderzhka -= Time.deltaTime;
                if (zaderzhka <= 0f)
                {
                    itog = "УРОВЕНЬ ПРОЙДЕН";
                    Faza = Sostoyanie.Konec;
                }
                break;

            case Sostoyanie.Konec:
                if (NazhataKnopka()) VsyoZanovo();
                break;
        }
    }

    void ProverkaFinisha()
    {
        if (Geroj == null || Geroj.Mertv || MirIgry == null) return;
        if (Geroj.transform.position.x < MirIgry.FinishX - 0.2f) return;

        Faza = Sostoyanie.Pobeda;
        zaderzhka = 3.2f;
        ochki += Mathf.RoundToInt(vremya) * 10;   // остаток времени идёт в очки
        Geroj.Upravlyaem = false;
        Geroj.SamHodit = 1f;                      // герой сам уходит за флаг
        Zvuki.MuzykuVyklyuchit();
        Zvuki.Pobeda();
    }

    void VsyoZanovo()
    {
        zhizni = ZhiznejVNachale;
        ochki = 0;
        monety = 0;
        itog = "";
        NachatUroven();
        Faza = Sostoyanie.Zastavka;
        if (Geroj != null) Geroj.Upravlyaem = false;
    }

    static bool NazhataKnopka()
    {
        return Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return)
               || Input.GetKeyDown(KeyCode.KeypadEnter) || Input.GetMouseButtonDown(0);
    }

    // --- то, что зовут другие ---------------------------------------------

    public float KameraX()
    {
        return kamera != null ? kamera.transform.position.x : 0f;
    }

    public void DobavitOchki(int skolko)
    {
        ochki += skolko;
    }

    public void VzyatMonetu()
    {
        monety++;
        ochki += 200;
        Zvuki.Moneta();
        if (monety >= 100)
        {
            monety = 0;
            zhizni++;
        }
    }

    // Герой начал умирать: с этой секунды враги замирают, чтобы смерть было
    // видно, а не «в толпе».
    public void GerojUmiraet()
    {
        if (Faza == Sostoyanie.Igra) Faza = Sostoyanie.Smert;
    }

    // Герой долетел до конца падения — решаем, что дальше.
    public void GerojPogib()
    {
        zhizni--;
        if (zhizni > 0)
        {
            NachatUroven();
        }
        else
        {
            itog = "ИГРА ОКОНЧЕНА";
            Faza = Sostoyanie.Konec;
        }
    }

    // --- надписи ----------------------------------------------------------

    static GUIStyle stil;
    static Texture2D zalivka;

    void OnGUI()
    {
        int krupno = Mathf.Max(14, Screen.height / 26);
        int melko = Mathf.Max(11, Screen.height / 40);
        float otstup = krupno;

        // Строка состояния
        Nadpis(new Rect(otstup, otstup * 0.6f, Screen.width * 0.5f, krupno * 2f),
               "МОНЕТЫ ×" + monety.ToString("00") + "    ОЧКИ " + ochki.ToString("000000"),
               krupno, TextAnchor.UpperLeft);
        Nadpis(new Rect(Screen.width * 0.5f - otstup, otstup * 0.6f, Screen.width * 0.5f, krupno * 2f),
               "ЖИЗНИ ×" + Mathf.Max(0, zhizni) + "    ВРЕМЯ " + Mathf.CeilToInt(vremya).ToString("000"),
               krupno, TextAnchor.UpperRight);

        if (Faza == Sostoyanie.Zastavka)
        {
            Zatemnit(0.55f);
            Rect seredina = new Rect(0f, Screen.height * 0.2f, Screen.width, krupno * 3f);
            Nadpis(seredina, "ВАЙБ ДЖАМПЕР", krupno * 3, TextAnchor.UpperCenter);
            Nadpis(Sdvig(seredina, krupno * 3.4f), "платформер на Unity · Vibe Digital 999",
                   melko, TextAnchor.UpperCenter);

            float stroka = Screen.height * 0.48f;
            Nadpis(new Rect(0f, stroka, Screen.width, krupno * 2f),
                   "← →  или  A D — идти", krupno, TextAnchor.UpperCenter);
            Nadpis(new Rect(0f, stroka + krupno * 1.6f, Screen.width, krupno * 2f),
                   "ПРОБЕЛ — прыжок,  дольше держишь — выше", krupno, TextAnchor.UpperCenter);
            Nadpis(new Rect(0f, stroka + krupno * 3.2f, Screen.width, krupno * 2f),
                   "SHIFT — бег,  ESC — выход", krupno, TextAnchor.UpperCenter);
            Nadpis(new Rect(0f, stroka + krupno * 5.2f, Screen.width, krupno * 2f),
                   "Прыгай врагам на голову. Гриб делает тебя большим:",
                   melko, TextAnchor.UpperCenter);
            Nadpis(new Rect(0f, stroka + krupno * 6.4f, Screen.width, krupno * 2f),
                   "большой ломает кирпичи и выдерживает один удар.",
                   melko, TextAnchor.UpperCenter);

            Nadpis(new Rect(0f, Screen.height * 0.86f, Screen.width, krupno * 2f),
                   "ПРОБЕЛ — начать", krupno, TextAnchor.UpperCenter);
        }
        else if (Faza == Sostoyanie.Konec)
        {
            Zatemnit(0.65f);
            Nadpis(new Rect(0f, Screen.height * 0.34f, Screen.width, krupno * 3f),
                   itog, krupno * 2, TextAnchor.UpperCenter);
            Nadpis(new Rect(0f, Screen.height * 0.5f, Screen.width, krupno * 2f),
                   "Очки: " + ochki.ToString("000000") + "    Монеты: " + monety,
                   krupno, TextAnchor.UpperCenter);
            Nadpis(new Rect(0f, Screen.height * 0.66f, Screen.width, krupno * 2f),
                   "ПРОБЕЛ — сыграть ещё раз", krupno, TextAnchor.UpperCenter);
        }
    }

    static Rect Sdvig(Rect gde, float naSkolko)
    {
        return new Rect(gde.x, gde.y + naSkolko, gde.width, gde.height);
    }

    static void Nadpis(Rect gde, string tekst, int razmer, TextAnchor kuda)
    {
        if (stil == null) stil = new GUIStyle();
        stil.fontSize = razmer;
        stil.fontStyle = FontStyle.Bold;
        stil.alignment = kuda;
        stil.wordWrap = false;

        // Тень под текстом: без неё белые буквы теряются на светлом небе.
        stil.normal.textColor = new Color(0f, 0f, 0f, 0.6f);
        GUI.Label(new Rect(gde.x + 2f, gde.y + 2f, gde.width, gde.height), tekst, stil);
        stil.normal.textColor = Color.white;
        GUI.Label(gde, tekst, stil);
    }

    static void Zatemnit(float sila)
    {
        if (zalivka == null)
        {
            zalivka = new Texture2D(1, 1);
            zalivka.SetPixel(0, 0, Color.white);
            zalivka.Apply();
        }
        Color byl = GUI.color;
        GUI.color = new Color(0f, 0f, 0.05f, sila);
        GUI.DrawTexture(new Rect(0f, 0f, Screen.width, Screen.height), zalivka);
        GUI.color = byl;
    }
}
