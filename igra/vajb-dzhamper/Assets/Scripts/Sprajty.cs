using UnityEngine;

// Все картинки игры. Герой, враг и гриб нарисованы символами — их видно
// прямо в коде и правятся они текстом. Плитки собраны кодом: у кирпича и
// трубы вся суть в ровных полосах, рисовать их символами дольше и грязнее.
public static class Sprajty
{
    // --- герой, маленький -------------------------------------------------
    // Части рисунка отдельно: поза меняется тремя нижними строками, а не
    // всей картинкой целиком. Голову и туловище переписывать не приходится.
    static readonly string[] Golova =
    {
        "....kkkk....",
        "..kkrrrrkk..",
        ".krrrrrrrrk.",
        ".krrrrrrrrk.",
        "..kssssssk..",
        "..kskssksk..",
        "..ksssssSk..",
        "..kNNNNNNk.."
    };

    static readonly string[] Telo =
    {
        ".krrbbbbrrk.",
        "krrbbybbybrk",
        "krrbbbbbbrrk",
        ".kbbbbbbbbk.",
        ".kbbbkkbbbk."
    };

    static readonly string[] NogiStoya =
    {
        ".kbbk..kbbk.",
        ".knnk..knnk.",
        "knnnk..knnnk"
    };

    static readonly string[] NogiBeg1 =
    {
        "..kbbkkbbk..",
        "..knnkknnk..",
        ".knnnkknnnk."
    };

    static readonly string[] NogiBeg2 =
    {
        "kbbk....kbbk",
        "knnk....knnk",
        "nnnk....knnn"
    };

    static readonly string[] NogiPryzhok =
    {
        ".kbbkkbbbk..",
        ".knnkknnnk..",
        "knnnk.knnk.."
    };

    // --- герой, большой (после гриба) -------------------------------------
    static readonly string[] TeloBolshoe =
    {
        "..krrrrrrk..",
        ".krrrrrrrrk.",
        "krrrbbbbrrrk",
        "krrbbybbybrk",
        "krrbbbbbbrrk",
        "krrbbbbbbrrk",
        ".kbbbbbbbbk.",
        ".kbbbbbbbbk.",
        ".kbbbbbbbbk.",
        ".kbbbkkbbbk."
    };

    static readonly string[] NogiBolshieStoya =
    {
        ".kbbk..kbbk.",
        ".kbbk..kbbk.",
        ".kbbk..kbbk.",
        ".knnk..knnk.",
        ".knnk..knnk.",
        "knnnk..knnnk"
    };

    static readonly string[] NogiBolshieBeg1 =
    {
        "..kbbkkbbk..",
        "..kbbkkbbk..",
        "..kbbkkbbk..",
        "..knnkknnk..",
        "..knnkknnk..",
        ".knnnkknnnk."
    };

    static readonly string[] NogiBolshieBeg2 =
    {
        "kbbk....kbbk",
        "kbbk....kbbk",
        "kbbk....kbbk",
        "knnk....knnk",
        "knnk....knnk",
        "nnnk....knnn"
    };

    static readonly string[] NogiBolshiePryzhok =
    {
        ".kbbkkbbbk..",
        ".kbbkkbbbk..",
        ".kbbkkbbbk..",
        ".knnkknnnk..",
        ".knnkknnnk..",
        "knnnk.knnk.."
    };

    // --- враг («ходун») ---------------------------------------------------
    static readonly string[] VragVerh =
    {
        ".....kkkkkk.....",
        "...kknnnnnnkk...",
        "..knnnnnnnnnnk..",
        ".knnnnnnnnnnnnk.",
        ".knnnnnnnnnnnnk.",
        "knnwwknnnnkwwnnk",
        "knnwwknnnnkwwnnk",
        "knnnnnnnnnnnnnnk",
        ".knnnnnnnnnnnnk.",
        ".kNNNNNNNNNNNNk.",
        "..kNNkkkkkkNNk.."
    };

    static readonly string[] VragNogi1 =
    {
        "..kkk......kkk..",
        ".kNNk......kNNk.",
        ".kkkk......kkkk.",
        "................",
        "................"
    };

    static readonly string[] VragNogi2 =
    {
        ".kkk........kkk.",
        "kNNk........kNNk",
        "kkkk........kkkk",
        "................",
        "................"
    };

    static readonly string[] VragPloskij =
    {
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        ".knnnnnnnnnnnnk.",
        ".kNNwwNNNNwwNNk.",
        ".kNNNNNNNNNNNNk.",
        "..kkkkkkkkkkkk.."
    };

    // --- гриб-бонус -------------------------------------------------------
    static readonly string[] GribRisunok =
    {
        "....kkkkkkk.....",
        "..kkrrwwwrrkk...",
        ".krrwwwwwwwrrk..",
        ".krwwwwwwwwwrrk.",
        "krrwwwrrrrwwwrrk",
        "krwwwrrrrrrwwwrk",
        "krwwrrrrrrrrwwrk",
        "krrrrrrrrrrrrrrk",
        ".kkkkkkkkkkkkkk.",
        "....ksssssk.....",
        "...ksssssssk....",
        "...ksksssksk....",
        "...ksssssssk....",
        "...ksssssssk....",
        "...kkkkkkkkk....",
        "................"
    };

    // Знак вопроса на блоке — маленький рисунок 6×8, рисуется поверх плитки.
    static readonly string[] ZnakVoprosa =
    {
        ".wwww.",
        "w....w",
        "w....w",
        "....w.",
        "...w..",
        "...w..",
        "......",
        "...w.."
    };

    public static Sprite GerojStoya, GerojBeg1, GerojBeg2, GerojBeg3, GerojPryzhok;
    public static Sprite BolshojStoya, BolshojBeg1, BolshojBeg2, BolshojBeg3, BolshojPryzhok;
    public static Sprite Vrag1, Vrag2, VragRazdavlen;
    public static Sprite Grib;
    public static Sprite ZemlyaVerh, ZemlyaNiz, Kirpich, BlokVopros, BlokPustoj, Kamen;
    public static Sprite TrubaVerhL, TrubaVerhP, TrubaTeloL, TrubaTeloP;
    public static Sprite[] Moneta;
    public static Sprite Oblako, Kust, Holm;
    public static Sprite Shest, Flag, Oskolok;

    static bool gotovo;

    public static void Podgotovit()
    {
        // Проверяем не только флаг, но и сам спрайт. В редакторе Unity умеет
        // сохранять статические поля между запусками, а созданные в памяти
        // текстуры при этом пропадают — тогда флаг врёт, и рисовать нечем.
        if (gotovo && GerojStoya != null) return;
        gotovo = true;

        GerojStoya = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, Telo, NogiStoya));
        GerojBeg1 = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, Telo, NogiBeg1));
        GerojBeg2 = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, Telo, NogiStoya));
        GerojBeg3 = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, Telo, NogiBeg2));
        GerojPryzhok = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, Telo, NogiPryzhok));

        BolshojStoya = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, TeloBolshoe, NogiBolshieStoya));
        BolshojBeg1 = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, TeloBolshoe, NogiBolshieBeg1));
        BolshojBeg2 = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, TeloBolshoe, NogiBolshieStoya));
        BolshojBeg3 = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, TeloBolshoe, NogiBolshieBeg2));
        BolshojPryzhok = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(Golova, TeloBolshoe, NogiBolshiePryzhok));

        Vrag1 = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(VragVerh, VragNogi1));
        Vrag2 = Risovanie.SprajtIzRisunka(Risovanie.Sklejka(VragVerh, VragNogi2));
        VragRazdavlen = Risovanie.SprajtIzRisunka(VragPloskij);

        Grib = Risovanie.SprajtIzRisunka(GribRisunok);

        ZemlyaVerh = ZemlyaKadr(true);
        ZemlyaNiz = ZemlyaKadr(false);
        Kirpich = KirpichKadr();
        BlokVopros = BlokKadr(true);
        BlokPustoj = BlokKadr(false);
        Kamen = KamenKadr();

        TrubaVerhL = TrubaKadr(true, true);
        TrubaVerhP = TrubaKadr(true, false);
        TrubaTeloL = TrubaKadr(false, true);
        TrubaTeloP = TrubaKadr(false, false);

        Moneta = new Sprite[4];
        Moneta[0] = MonetaKadr(10);
        Moneta[1] = MonetaKadr(6);
        Moneta[2] = MonetaKadr(2);
        Moneta[3] = MonetaKadr(6);

        Oblako = OblakoKadr();
        Kust = KustKadr();
        Holm = HolmKadr();

        Shest = ShestKadr();
        Flag = FlagKadr();
        Oskolok = Risovanie.Kvadrat(6, 6, Palitra.Kirpich);
    }

    // --- плитки -----------------------------------------------------------

    static Sprite ZemlyaKadr(bool strava)
    {
        Holst h = new Holst(16, 16);
        h.Zalit(Palitra.Zemlya);
        // Фактура задана вручную, а не случайными числами: случайные плитки
        // рябят в глазах, когда их сотня подряд.
        for (int y = 2; y < 14; y += 4)
        {
            h.Tochka(3, y, Palitra.ZemlyaTemn);
            h.Tochka(4, y, Palitra.ZemlyaTemn);
            h.Tochka(10, y + 2, Palitra.ZemlyaTemn);
            h.Tochka(11, y + 2, Palitra.ZemlyaTemn);
            h.Tochka(7, y + 1, Palitra.ZemlyaSvet);
        }
        h.Ramka(0, 0, 16, 16, Palitra.ZemlyaTemn);
        if (strava)
        {
            h.Pryamoug(0, 12, 16, 4, Palitra.Trava);
            h.Liniya(0, 15, 12, Palitra.TravaTemn);
            h.Liniya(0, 15, 15, Palitra.TravaTemn);
            for (int x = 1; x < 15; x += 4) h.Tochka(x, 14, Palitra.TravaTemn);
        }
        return h.Sprajt();
    }

    static Sprite KirpichKadr()
    {
        Holst h = new Holst(16, 16);
        h.Zalit(Palitra.Kirpich);
        h.Liniya(0, 15, 15, Palitra.ZemlyaSvet);   // светлая кромка сверху
        h.Liniya(0, 15, 7, Palitra.KirpichShov);   // горизонтальный шов
        h.Liniya(0, 15, 0, Palitra.KirpichShov);
        for (int y = 8; y < 15; y++) h.Tochka(8, y, Palitra.KirpichShov);
        for (int y = 1; y < 7; y++)
        {
            h.Tochka(4, y, Palitra.KirpichShov);
            h.Tochka(12, y, Palitra.KirpichShov);
        }
        return h.Sprajt();
    }

    static Sprite BlokKadr(bool sVoprosom)
    {
        Holst h = new Holst(16, 16);
        h.Zalit(sVoprosom ? Palitra.Zoloto : Palitra.Zemlya);
        h.Ramka(0, 0, 16, 16, Palitra.Kontur);
        h.Ramka(1, 1, 14, 14, sVoprosom ? Palitra.ZolotoTemn : Palitra.ZemlyaTemn);
        // заклёпки по углам — они и делают блок «блоком»
        Color zaklepka = sVoprosom ? Palitra.ZolotoTemn : Palitra.ZemlyaTemn;
        h.Pryamoug(2, 2, 2, 2, zaklepka);
        h.Pryamoug(12, 2, 2, 2, zaklepka);
        h.Pryamoug(2, 12, 2, 2, zaklepka);
        h.Pryamoug(12, 12, 2, 2, zaklepka);
        if (sVoprosom) Znak(h, 5, 4, ZnakVoprosa, Palitra.Kontur);
        return h.Sprajt();
    }

    static Sprite KamenKadr()
    {
        Holst h = new Holst(16, 16);
        h.Zalit(Palitra.Kamen);
        h.Ramka(0, 0, 16, 16, Palitra.KamenTemn);
        h.Liniya(1, 14, 14, Color.white * 0.9f);
        h.Liniya(1, 14, 1, Palitra.KamenTemn);
        return h.Sprajt();
    }

    static Sprite TrubaKadr(bool verh, bool levo)
    {
        Holst h = new Holst(16, 16);
        h.Zalit(Palitra.Truba);
        if (levo)
        {
            h.Pryamoug(0, 0, 2, 16, Palitra.TrubaTemn);
            h.Pryamoug(2, 0, 3, 16, Palitra.TrubaSvet);
        }
        else
        {
            h.Pryamoug(14, 0, 2, 16, Palitra.TrubaTemn);
            h.Pryamoug(11, 0, 3, 16, Palitra.TrubaTemn);
        }
        if (verh)
        {
            // Ободок: у трубы он шире тела, но сетка мира — одна клетка,
            // поэтому ободок обозначаем полосой и швом под ней.
            h.Liniya(0, 15, 10, Palitra.TrubaTemn);
            h.Liniya(0, 15, 15, Palitra.TrubaTemn);
            if (levo)
            {
                h.Pryamoug(2, 11, 3, 4, Palitra.TrubaSvet);
                h.Pryamoug(0, 11, 2, 4, Palitra.TrubaTemn);
            }
            else
            {
                h.Pryamoug(11, 11, 3, 4, Palitra.TrubaTemn);
                h.Pryamoug(14, 11, 2, 4, Palitra.TrubaTemn);
            }
        }
        return h.Sprajt();
    }

    static Sprite MonetaKadr(int shirina)
    {
        Holst h = new Holst(16, 16);
        int x0 = 8 - shirina / 2;
        h.Pryamoug(x0, 2, shirina, 12, Palitra.Zoloto);
        h.Pryamoug(x0 + 1, 1, Mathf.Max(1, shirina - 2), 1, Palitra.Zoloto);
        h.Pryamoug(x0 + 1, 14, Mathf.Max(1, shirina - 2), 1, Palitra.Zoloto);
        h.Pryamoug(x0, 3, 1, 10, Palitra.ZolotoSvet);
        h.Pryamoug(x0 + shirina - 1, 3, 1, 10, Palitra.ZolotoTemn);
        return h.Sprajt();
    }

    // --- задний план ------------------------------------------------------
    // Декорации крупнее клетки, поэтому точка привязки — левый нижний угол:
    // ставим их по координате клетки и не считаем смещений.

    static Sprite OblakoKadr()
    {
        Holst h = new Holst(48, 32);
        h.Krug(13, 14, 8, Palitra.Oblako);
        h.Krug(24, 18, 10, Palitra.Oblako);
        h.Krug(35, 14, 8, Palitra.Oblako);
        h.Pryamoug(8, 8, 32, 8, Palitra.Oblako);
        for (int x = 8; x < 40; x++) h.Tochka(x, 8, Palitra.OblakoTen);
        return h.Sprajt(0f, 0f);
    }

    static Sprite KustKadr()
    {
        Holst h = new Holst(48, 16);
        h.Krug(12, 8, 7, Palitra.Trava);
        h.Krug(24, 11, 8, Palitra.Trava);
        h.Krug(36, 8, 7, Palitra.Trava);
        h.Pryamoug(5, 0, 38, 8, Palitra.Trava);
        for (int x = 5; x < 43; x++) h.Tochka(x, 0, Palitra.TravaTemn);
        return h.Sprajt(0f, 0f);
    }

    static Sprite HolmKadr()
    {
        Holst h = new Holst(80, 48);
        for (int y = 0; y < 44; y++)
        {
            int polovina = Mathf.RoundToInt((44 - y) * 0.85f) + 4;
            h.Pryamoug(40 - polovina, y, polovina * 2, 1, Palitra.Trava);
        }
        // тень справа — иначе холм читается плоским пятном
        for (int y = 0; y < 40; y++)
        {
            int polovina = Mathf.RoundToInt((44 - y) * 0.85f) + 4;
            h.Pryamoug(40 + polovina - 6, y, 6, 1, Palitra.TravaTemn);
        }
        return h.Sprajt(0f, 0f);
    }

    static Sprite ShestKadr()
    {
        // Шест финиша: одна высокая полоса, привязка снизу — ставим по земле.
        Holst h = new Holst(4, 160);
        h.Zalit(Palitra.Kamen);
        for (int y = 0; y < 160; y++) h.Tochka(3, y, Palitra.KamenTemn);
        return h.Sprajt(0.5f, 0f);
    }

    static Sprite FlagKadr()
    {
        Holst h = new Holst(16, 16);
        for (int y = 0; y < 16; y++)
        {
            int shirina = 15 - Mathf.Abs(8 - y);
            h.Pryamoug(0, y, Mathf.Max(1, shirina), 1, Palitra.Znaki['r']);
        }
        h.Krug(4, 8, 2, Color.white);
        return h.Sprajt(0f, 0.5f);
    }

    static void Znak(Holst h, int x, int y, string[] risunok, Color cvet)
    {
        int vysota = risunok.Length;
        for (int stroka = 0; stroka < vysota; stroka++)
            for (int i = 0; i < risunok[stroka].Length; i++)
                if (risunok[stroka][i] != '.')
                    h.Tochka(x + i, y + vysota - 1 - stroka, cvet);
    }
}
