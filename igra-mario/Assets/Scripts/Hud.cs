using UnityEngine;

// Всё, что нарисовано поверх игры: счёт, заставка, пауза, конец.
//
// Рисуем через OnGUI, а не через Canvas и UI-компоненты. Причина
// прозаическая: Canvas тянет за собой пакет ugui, шрифты и настройку
// в редакторе — а игра должна открываться и запускаться сразу,
// без единого клика в инспекторе.
public class Hud : MonoBehaviour
{
    GUIStyle _malenkiy, _sredniy, _bolshoy, _ogromny;
    Texture2D _fon;
    bool _stili;

    void SobratStili()
    {
        if (_stili) return;
        _stili = true;

        _fon = new Texture2D(1, 1);
        _fon.SetPixel(0, 0, new Color(0.008f, 0.031f, 0.075f, 0.86f));
        _fon.Apply();

        _malenkiy = Stil(0.020f, TextAnchor.UpperLeft);
        _sredniy  = Stil(0.028f, TextAnchor.UpperLeft);
        _bolshoy  = Stil(0.046f, TextAnchor.MiddleCenter);
        _ogromny  = Stil(0.085f, TextAnchor.MiddleCenter);
    }

    GUIStyle Stil(float dolyaVysoty, TextAnchor yakor)
    {
        return new GUIStyle
        {
            fontSize = Mathf.Max(11, Mathf.RoundToInt(Screen.height * dolyaVysoty)),
            fontStyle = FontStyle.Bold,
            alignment = yakor,
            normal = { textColor = Art.White },
            wordWrap = true
        };
    }

    // Тень под текстом: без неё белые буквы теряются на светлом облаке.
    void Nadpis(Rect r, string t, GUIStyle s, Color c)
    {
        var byla = s.normal.textColor;

        s.normal.textColor = new Color(0f, 0f, 0f, 0.75f);
        GUI.Label(new Rect(r.x + 2, r.y + 2, r.width, r.height), t, s);

        s.normal.textColor = c;
        GUI.Label(r, t, s);

        s.normal.textColor = byla;
    }

    void OnGUI()
    {
        SobratStili();
        var g = GameManager.I;
        if (g == null) return;

        switch (g.Sostoyanie)
        {
            case GameManager.Sost.Zastavka: Zastavka(); break;
            case GameManager.Sost.Konec:    KonecIgry(g); break;
            case GameManager.Sost.Pobeda:   Pobeda(g); break;
            default:
                Schet(g);
                Vsplyvy(g);
                if (g.Pauza) Pauza();
                if (g.Sostoyanie == GameManager.Sost.Perehod) Perehod(g);
                break;
        }
    }

    // ---------- счёт сверху ----------

    void Schet(GameManager g)
    {
        float h = Screen.height * 0.075f;
        GUI.DrawTexture(new Rect(0, 0, Screen.width, h), _fon);

        float pole = Screen.width * 0.03f;
        float y = h * 0.22f;
        float shag = Screen.width * 0.19f;

        Nadpis(new Rect(pole, y, shag, h), "ОЧКИ\n" + g.Ochki.ToString("D6"),
               _malenkiy, Art.White);
        Nadpis(new Rect(pole + shag, y, shag, h), "МОНЕТЫ\n× " + g.Monety.ToString("D2"),
               _malenkiy, Art.Gold);
        Nadpis(new Rect(pole + shag * 2f, y, shag, h), "УРОВЕНЬ\n" + g.Uroven + " из " + LevelData.Vse.Length,
               _malenkiy, Art.Cyan);
        Nadpis(new Rect(pole + shag * 3f, y, shag, h), "ЖИЗНИ\n× " + Mathf.Max(0, g.Zhizni),
               _malenkiy, Art.White);

        var cvetVremeni = g.Vremya <= 100f ? Art.Warm : Art.White;
        Nadpis(new Rect(pole + shag * 4f, y, shag, h), "ВРЕМЯ\n" + Mathf.CeilToInt(g.Vremya),
               _malenkiy, cvetVremeni);

        Nadpis(new Rect(Screen.width - shag - pole, y, shag, h),
               "Esc — пауза", _malenkiy, Art.Mist);
    }

    // Всплывающие очки над врагом или монетой.
    void Vsplyvy(GameManager g)
    {
        var cam = Camera.main;
        if (cam == null) return;

        for (int i = 0; i < g.Vsplyvy.Count; i++)
        {
            var v = g.Vsplyvy[i];
            Vector3 p = cam.WorldToScreenPoint(v.Poz + Vector3.up * v.T * 1.2f);
            if (p.z < 0f) continue;

            float a = 1f - Mathf.Clamp01(v.T / 1.1f);
            Nadpis(new Rect(p.x - 60f, Screen.height - p.y - 20f, 120f, 40f), v.Text,
                   _sredniy, new Color(Art.Cyan.r / 255f, Art.Cyan.g / 255f, Art.Cyan.b / 255f, a));
        }
    }

    // ---------- экраны ----------

    void Zastavka()
    {
        GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), _fon);

        float w = Screen.width;
        float h = Screen.height;

        Nadpis(new Rect(0, h * 0.14f, w, h * 0.14f), "ВАЙБ ДЖАМПЕР", _ogromny, Art.Cyan);
        Nadpis(new Rect(0, h * 0.27f, w, h * 0.06f), "платформер студии Vibe Digital 999",
               _sredniy, Art.Mist);

        Nadpis(new Rect(w * 0.5f - w * 0.22f, h * 0.40f, w * 0.44f, h * 0.30f),
               "Стрелки или A и D — идти\n" +
               "Пробел, W или стрелка вверх — прыжок\n" +
               "Shift — бежать\n" +
               "Esc — пауза,  M — музыка\n\n" +
               "Прыгай врагам на голову, бей блоки снизу,\n" +
               "собирай монеты и добеги до флага.",
               _sredniy, Art.White);

        var g = GameManager.I;
        if (g != null && g.Rekord > 0)
            Nadpis(new Rect(0, h * 0.73f, w, h * 0.06f),
                   "Рекорд: " + g.Rekord.ToString("D6"), _sredniy, Art.Gold);

        // Мигающая строка: без неё непонятно, что игра ждёт нажатия.
        if (((int)(Time.unscaledTime * 2f) & 1) == 0)
            Nadpis(new Rect(0, h * 0.82f, w, h * 0.08f), "НАЖМИ ПРОБЕЛ",
                   _bolshoy, Art.Cyan);
    }

    void Pauza()
    {
        GUI.DrawTexture(new Rect(0, Screen.height * 0.35f, Screen.width, Screen.height * 0.3f), _fon);
        Nadpis(new Rect(0, Screen.height * 0.40f, Screen.width, Screen.height * 0.08f),
               "ПАУЗА", _ogromny, Art.Cyan);
        Nadpis(new Rect(0, Screen.height * 0.52f, Screen.width, Screen.height * 0.06f),
               "Esc — продолжить,  M — музыка", _sredniy, Art.White);
    }

    void Perehod(GameManager g)
    {
        Nadpis(new Rect(0, Screen.height * 0.42f, Screen.width, Screen.height * 0.1f),
               "УРОВЕНЬ " + g.Uroven + " ПРОЙДЕН", _bolshoy, Art.Cyan);
    }

    void KonecIgry(GameManager g)
    {
        GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), _fon);
        Nadpis(new Rect(0, Screen.height * 0.30f, Screen.width, Screen.height * 0.12f),
               "ИГРА ОКОНЧЕНА", _ogromny, Art.Warm);
        Itog(g);
    }

    void Pobeda(GameManager g)
    {
        GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), _fon);
        Nadpis(new Rect(0, Screen.height * 0.26f, Screen.width, Screen.height * 0.12f),
               "ПРОЙДЕНО ЦЕЛИКОМ", _ogromny, Art.Cyan);
        Nadpis(new Rect(0, Screen.height * 0.39f, Screen.width, Screen.height * 0.06f),
               "Все " + LevelData.Vse.Length + " уровня позади.", _sredniy, Art.White);
        Itog(g);
    }

    void Itog(GameManager g)
    {
        Nadpis(new Rect(0, Screen.height * 0.50f, Screen.width, Screen.height * 0.06f),
               "Очки: " + g.Ochki.ToString("D6"), _bolshoy, Art.White);
        Nadpis(new Rect(0, Screen.height * 0.58f, Screen.width, Screen.height * 0.06f),
               "Рекорд: " + g.Rekord.ToString("D6"), _sredniy, Art.Gold);

        if (((int)(Time.unscaledTime * 2f) & 1) == 0)
            Nadpis(new Rect(0, Screen.height * 0.72f, Screen.width, Screen.height * 0.07f),
                   "ПРОБЕЛ — В НАЧАЛО", _bolshoy, Art.Cyan);
    }
}
