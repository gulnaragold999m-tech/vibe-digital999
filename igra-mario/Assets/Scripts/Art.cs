using UnityEngine;

// Вся графика игры рисуется кодом при запуске.
//
// Почему так, а не картинками в Assets: файлы .png в git-репозитории
// нельзя посмотреть и поправить в чате, а спрайт, записанный буквами,
// правится прямо здесь — видно, что меняешь. Плюс проект остаётся
// самодостаточным: ни одного внешнего файла, ничего не потеряется.
//
// Каждый спрайт — массив строк. Один символ = один пиксель, буква
// означает цвет из таблицы Palette ниже. Точка — прозрачный пиксель.
// Первая строка массива — ВЕРХНЯЯ строка картинки.
public static class Art
{
    // Размер тайла в пикселях. Он же PixelsPerUnit, поэтому один
    // блок 16x16 занимает ровно одну клетку мира.
    public const float Ppu = 16f;

    // Цвета студии, из docs/02-BRAND.md. Менять их надо там же,
    // а не выдумывать новые: игра — витрина студии, а не отдельный бренд.
    static Color32 C(string hex)
    {
        int v = System.Convert.ToInt32(hex, 16);
        return new Color32((byte)(v >> 16), (byte)((v >> 8) & 0xFF), (byte)(v & 0xFF), 255);
    }

    public static readonly Color32 Ink      = C("020813"); // фон неба
    public static readonly Color32 Deep     = C("050E1E"); // дальний план
    public static readonly Color32 Cyan     = C("00F0FF"); // главный акцент
    public static readonly Color32 CyanDeep = C("0B7A8C");
    public static readonly Color32 Blue     = C("2D9CFF");
    public static readonly Color32 BlueDeep = C("0B3D75");
    public static readonly Color32 White    = C("E8F0FF");
    public static readonly Color32 Mist     = C("6B7A9F");
    public static readonly Color32 Warm     = C("FF7A2D"); // враги: опасность должна отличаться цветом
    public static readonly Color32 WarmDark = C("A63F0E");
    public static readonly Color32 Gold     = C("FFD34D");

    static Color32 Palette(char c)
    {
        switch (c)
        {
            case 'k': return new Color32(2, 6, 14, 255);   // контур
            case 'w': return White;
            case 'c': return Cyan;
            case 'd': return CyanDeep;
            case 'b': return Blue;
            case 'n': return BlueDeep;
            case 'm': return Mist;
            case 'o': return Warm;
            case 'r': return WarmDark;
            case 'y': return Gold;
            case 'i': return Ink;
            case 'p': return Deep;
            default:  return new Color32(0, 0, 0, 0);      // '.' и всё незнакомое — прозрачно
        }
    }

    // ---------- готовые спрайты ----------

    public static Sprite Hero, HeroBig, HeroJump, HeroJumpBig, HeroDead;
    public static Sprite Goomba, GoombaFlat, Koopa, Shell;
    public static Sprite Coin, Power, Ground, Brick, Question, Used, Solid;
    public static Sprite PipeTopL, PipeTopR, PipeBodyL, PipeBodyR;
    public static Sprite Pole, Flag, Cloud, Hill, Bush, Star, Pixel;

    static bool _gotovo;

    public static void Init()
    {
        if (_gotovo) return;
        _gotovo = true;

        Hero        = Make(HeroArt);
        HeroJump    = Make(HeroJumpArt);
        HeroBig     = Make(HeroBigArt);
        HeroJumpBig = Make(HeroJumpBigArt);
        HeroDead    = Make(HeroDeadArt);
        Goomba      = Make(GoombaArt);
        GoombaFlat  = Make(GoombaFlatArt);
        Koopa       = Make(KoopaArt);
        Shell       = Make(ShellArt);
        Coin        = Make(CoinArt);
        Power       = Make(PowerArt);
        Ground      = Make(GroundArt);
        Brick       = Make(BrickArt);
        Question    = Make(QuestionArt);
        Used        = Make(UsedArt);
        Solid       = Make(SolidArt);
        PipeTopL    = Make(PipeTopLArt);
        PipeTopR    = Make(PipeTopRArt);
        PipeBodyL   = Make(PipeBodyLArt);
        PipeBodyR   = Make(PipeBodyRArt);
        Pole        = Make(PoleArt);
        Flag        = Make(FlagArt);
        Cloud       = Make(CloudArt);
        Hill        = Make(HillArt);
        Bush        = Make(BushArt);
        Star        = Make(StarArt);
        Pixel       = MakeSolid(White);
    }

    // Превращает буквенную картинку в спрайт.
    // Строки перевёрнуты: в Unity нулевая строка текстуры — нижняя,
    // а в массиве сверху нарисована голова. Забудешь — герой встанет на голову.
    public static Sprite Make(string[] art)
    {
        int h = art.Length;
        int w = 0;
        for (int i = 0; i < h; i++) if (art[i].Length > w) w = art[i].Length;

        var tex = new Texture2D(w, h, TextureFormat.RGBA32, false);
        tex.filterMode = FilterMode.Point;   // без сглаживания, иначе пиксели «поплывут»
        tex.wrapMode = TextureWrapMode.Clamp;

        var px = new Color32[w * h];
        for (int y = 0; y < h; y++)
        {
            string row = art[h - 1 - y];
            for (int x = 0; x < w; x++)
                px[y * w + x] = x < row.Length ? Palette(row[x]) : new Color32(0, 0, 0, 0);
        }
        tex.SetPixels32(px);
        tex.Apply();

        return Sprite.Create(tex, new Rect(0, 0, w, h), new Vector2(0.5f, 0.5f), Ppu, 0,
                             SpriteMeshType.FullRect);
    }

    public static Sprite MakeSolid(Color32 c)
    {
        var tex = new Texture2D(1, 1, TextureFormat.RGBA32, false);
        tex.filterMode = FilterMode.Point;
        tex.SetPixels32(new[] { c });
        tex.Apply();
        return Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f, 0,
                             SpriteMeshType.FullRect);
    }

    // ---------- сами картинки ----------
    // Герой — «вайб-кодер»: белый скафандр, циановый визор.
    // Рисунок оригинальный, ничего чужого не перерисовано.

    static readonly string[] HeroArt = {
        "................",
        "................",
        "....kkkkkkkk....",
        "...kwwwwwwwwk...",
        "...kwccccccwk...",
        "...kwcwccwcwk...",
        "...kwccccccwk...",
        "...kwwwwwwwwk...",
        "....kkbbbbkk....",
        "...kbbbccbbbk...",
        "..kwbbbccbbbwk..",
        "..kwbbbbbbbbwk..",
        "...kbbbbbbbbk...",
        "....kbbkkbbk....",
        "....kwwkkwwk....",
        ".....kkk.kkk....",
    };

    static readonly string[] HeroJumpArt = {
        "................",
        "................",
        "....kkkkkkkk....",
        "...kwwwwwwwwk...",
        "...kwccccccwk...",
        "...kwcwccwcwk...",
        "...kwccccccwk...",
        "..kkwwwwwwwwkk..",
        ".kwkkbbbbbbkkwk.",
        ".kwkbbbccbbbkwk.",
        "..kkbbbccbbbk...",
        "...kbbbbbbbbk...",
        "...kbbbkkbbbk...",
        "..kbbkk..kkbbk..",
        "..kwwk....kwwk..",
        "...kk......kk...",
    };

    static readonly string[] HeroBigArt = {
        "................",
        "................",
        "....kkkkkkkk....",
        "...kwwwwwwwwk...",
        "...kwccccccwk...",
        "...kwcwccwcwk...",
        "...kwcccccwwk...",
        "...kwwwwwwwwk...",
        "....kkkkkkkk....",
        "...kbbbbbbbbk...",
        "..kwbbbccbbbwk..",
        "..kwbbbccbbbwk..",
        "..kwbbbccbbbwk..",
        "..kwbbbbbbbbwk..",
        "...kbbbbbbbbk...",
        "...kbbbbbbbbk...",
        "...kbbbbbbbbk...",
        "...kbbbbbbbbk...",
        "...kbbbkkbbbk...",
        "...kbbk..kbbk...",
        "...kbbk..kbbk...",
        "..kwwwk..kwwwk..",
        "..kwwwk..kwwwk..",
        "...kkk....kkk...",
    };

    static readonly string[] HeroJumpBigArt = {
        "................",
        "................",
        "....kkkkkkkk....",
        "...kwwwwwwwwk...",
        "...kwccccccwk...",
        "...kwcwccwcwk...",
        "...kwcccccwwk...",
        "..kkwwwwwwwwkk..",
        ".kwkkkkkkkkkkwk.",
        ".kwkbbbbbbbbkwk.",
        ".kwkbbbccbbbkwk.",
        "..kkbbbccbbbk...",
        "...kbbbccbbbk...",
        "...kbbbbbbbbk...",
        "...kbbbbbbbbk...",
        "...kbbbbbbbbk...",
        "...kbbbbbbbbk...",
        "...kbbkkkkbbk...",
        "...kbbk..kbbk...",
        "..kbbkk..kkbbk..",
        "..kwwk....kwwk..",
        "..kwwk....kwwk..",
        "...kk......kk...",
        "................",
    };

    static readonly string[] HeroDeadArt = {
        "................",
        "................",
        "....kkkkkkkk....",
        "...kwwwwwwwwk...",
        "...kwmmmmmmwk...",
        "...kwmkmmkmwk...",
        "...kwmmmmmmwk...",
        "...kwwwwwwwwk...",
        "....kkmmmmkk....",
        "...kmmmmmmmmk...",
        "..kwmmmmmmmmwk..",
        "..kwmmmmmmmmwk..",
        "...kmmmmmmmmk...",
        "....kmmkkmmk....",
        "....kwwkkwwk....",
        ".....kkk.kkk....",
    };

    // «Грибыш» — самый простой враг. Ходит и разворачивается о стену.
    static readonly string[] GoombaArt = {
        "................",
        "................",
        "....kkkkkkkk....",
        "..kkooooooookk..",
        ".kooooooooooook.",
        "kooooooooooooook",
        "koowwwoooowwwook",
        "koowkwoooowkwook",
        "koowwwoooowwwook",
        "kooooooooooooook",
        ".kooooooooooook.",
        "..kkrrrrrrrrkk..",
        "...krrrrrrrrk...",
        "...kkkkkkkkkk...",
        "..kwwkkkkkkwwk..",
        "..kkkk....kkkk..",
    };

    static readonly string[] GoombaFlatArt = {
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
        "................",
        "..kkkkkkkkkkkk..",
        ".kooooooooooook.",
        ".korrrrrrrrrrok.",
        "..kkkkkkkkkkkk..",
    };

    // «Панцирь» — второй враг. Наступил — прячется, пнул — летит и сносит своих.
    static readonly string[] KoopaArt = {
        "................",
        ".....kkkkk......",
        "....kwwwwwk.....",
        "....kwkwkwk.....",
        "....kwwwwwk.....",
        ".....kwwwk......",
        "....kkyyykk.....",
        "...kkooooookk...",
        "..kooowwwooook..",
        "..koowwwwwoook..",
        "..koowwwwwoook..",
        "..kooowwwooook..",
        "..kkooooooookk..",
        "...kkkkkkkkkk...",
        "...kyyk..kyyk...",
        "...kkkk..kkkk...",
    };

    static readonly string[] ShellArt = {
        "................",
        "................",
        "................",
        "................",
        "....kkkkkkkk....",
        "..kkooooooookk..",
        ".kooowwwwoooook.",
        "koooowwwwwwwwook",
        "kooowwwwwwwwwook",
        "koooowwwwwwwwook",
        ".kooowwwwwwoook.",
        "..kkooooooookk..",
        "....kkkkkkkk....",
        "................",
        "................",
        "................",
    };

    static readonly string[] CoinArt = {
        "................",
        "................",
        ".....kkkkkk.....",
        "....kcccccck....",
        "...kcccwwccck...",
        "...kccwwwwcck...",
        "...kccwiiwcck...",
        "...kccwiiwcck...",
        "...kccwiiwcck...",
        "...kccwiiwcck...",
        "...kccwwwwcck...",
        "...kcccwwccck...",
        "....kcccccck....",
        ".....kkkkkk.....",
        "................",
        "................",
    };

    // Усилитель — «энерго-ядро». Делает героя большим.
    static readonly string[] PowerArt = {
        "................",
        "................",
        ".....kkkkkk.....",
        "...kkcccccckk...",
        "..kcwwccccwwck..",
        ".kcwwwccccwwwck.",
        ".kcccccccccccck.",
        "kccccccwwcccccck",
        "kcccccwwwwccccck",
        "kccccccwwcccccck",
        ".kcccccccccccck.",
        ".kddddddddddddk.",
        "..kwddddddddwk..",
        "...kwwddddwwk...",
        "....kkkkkkkk....",
        "................",
    };

    // Земля: сверху светлая кромка — чтобы край платформы был виден издалека.
    static readonly string[] GroundArt = {
        "bbbbbbbbbbbbbbbb",
        "bbbbbbbbbbbbbbbb",
        "nnnnnnnnnnnnnnnn",
        "nnnnnnnnnnnnnnnn",
        "nnnnkknnnnnnnnnn",
        "nnnnkknnnnkknnnn",
        "nnnnnnnnnnkknnnn",
        "nnnnnnnnnnnnnnnn",
        "nnnnnnnnnnnnnnnn",
        "nnkknnnnnnnnnnnn",
        "nnkknnnnnnnkknnn",
        "nnnnnnnnnnnkknnn",
        "nnnnnnnnnnnnnnnn",
        "nnnnnnkknnnnnnnn",
        "nnnnnnkknnnnnnnn",
        "kkkkkkkkkkkkkkkk",
    };

    static readonly string[] BrickArt = {
        "dddddddddddddddd",
        "dwwwwwwwwwwwwwwd",
        "dddddddddddddddd",
        "ddddddkddddddddd",
        "ddddddkddddddddd",
        "kkkkkkkkkkkkkkkk",
        "ddddddddddddkddd",
        "ddddddddddddkddd",
        "ddddddddddddkddd",
        "kkkkkkkkkkkkkkkk",
        "ddddddkddddddddd",
        "ddddddkddddddddd",
        "ddddddkddddddddd",
        "kkkkkkkkkkkkkkkk",
        "dddddddddddddddd",
        "kkkkkkkkkkkkkkkk",
    };

    static readonly string[] QuestionArt = {
        "kkkkkkkkkkkkkkkk",
        "kwwwwwwwwwwwwwwk",
        "kwccccccccccccwk",
        "kwcccciiiicccnwk",
        "kwccciiiiiicccwk",
        "kwcciicccciicnwk",
        "kwcccccccciicnwk",
        "kwccccccciiccnwk",
        "kwccccciiicccnwk",
        "kwcccciiiccccnwk",
        "kwcccciiicccccwk",
        "kwccccccccccccwk",
        "kwcccciiicccccwk",
        "kwcccciiicccccwk",
        "kwwwwwwwwwwwwwwk",
        "kkkkkkkkkkkkkkkk",
    };

    static readonly string[] UsedArt = {
        "kkkkkkkkkkkkkkkk",
        "kmmmmmmmmmmmmmmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmnnnnnnnnnnnnmk",
        "kmmmmmmmmmmmmmmk",
        "kkkkkkkkkkkkkkkk",
    };

    static readonly string[] SolidArt = {
        "kkkkkkkkkkkkkkkk",
        "kbbbbbbbbbbbbbnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "kbnnnnnnnnnnnnnk",
        "knnnnnnnnnnnnnnk",
        "kkkkkkkkkkkkkkkk",
    };

    static readonly string[] PipeTopLArt = {
        "kkkkkkkkkkkkkkkk",
        "kddddddddddddddd",
        "kdwwwddddddddddd",
        "kdwwwddddddddddd",
        "kkkkkkkkkkkkkkkk",
        "..kddddddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
    };

    static readonly string[] PipeTopRArt = {
        "kkkkkkkkkkkkkkkk",
        "dddddddddddddddk",
        "ddddddddddddnnnk",
        "ddddddddddddnnnk",
        "kkkkkkkkkkkkkkkk",
        "dddddddddddddk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
    };

    static readonly string[] PipeBodyLArt = {
        "..kddddddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
        "..kdwwdddddddddd",
    };

    static readonly string[] PipeBodyRArt = {
        "dddddddddddddk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
        "ddddddddddnndk..",
    };

    static readonly string[] PoleArt = {
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
    };

    static readonly string[] FlagArt = {
        "......kwwk......",
        "......kwwkkkk...",
        "......kwwcccck..",
        "......kwwccccck.",
        "......kwwcccccck",
        "......kwwccccck.",
        "......kwwcccck..",
        "......kwwkkkk...",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
        "......kwwk......",
    };

    static readonly string[] CloudArt = {
        "................",
        "................",
        "................",
        "......pppp......",
        ".....pppppp.....",
        "...pppppppppp...",
        "..pppppppppppp..",
        ".pppppppppppppp.",
        "pppppppppppppppp",
        "pppppppppppppppp",
        ".pppppppppppppp.",
        "................",
        "................",
        "................",
        "................",
        "................",
    };

    static readonly string[] HillArt = {
        "................",
        "................",
        "................",
        "................",
        "......pppp......",
        ".....pppppp.....",
        "....pppppppp....",
        "...pppppppppp...",
        "..pppppppppppp..",
        ".pppppppppppppp.",
        "pppppppppppppppp",
        "pppppppppppppppp",
        "pppppppppppppppp",
        "pppppppppppppppp",
        "pppppppppppppppp",
        "pppppppppppppppp",
    };

    static readonly string[] BushArt = {
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "....pp....pp....",
        "...pppp..pppp...",
        "..pppppppppppp..",
        ".pppppppppppppp.",
        "pppppppppppppppp",
        "pppppppppppppppp",
        "pppppppppppppppp",
    };

    static readonly string[] StarArt = {
        "..w..",
        ".www.",
        "wwwww",
        ".www.",
        "..w..",
    };
}
