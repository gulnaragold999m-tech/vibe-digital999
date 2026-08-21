using System.Collections.Generic;
using UnityEngine;

// Палитра и рисование спрайтов прямо в памяти.
//
// Почему без картинок. Картинки — это двоичные файлы: их не видно в истории
// правок, их нельзя поправить текстом и они тянут за собой импорт-настройки
// Unity. Здесь каждый спрайт либо нарисован символами (см. Sprajty.cs), либо
// собран кодом из прямоугольников. Игра целиком лежит в репозитории текстом
// и открывается любой версией Unity без единого мегабайта ассетов.
public static class Palitra
{
    // Сколько экранных пикселей в одной клетке мира. Клетка = 1 единица Unity.
    public const int PikselejVKletke = 16;

    public static Color Iz(string hex)
    {
        int r = System.Convert.ToInt32(hex.Substring(0, 2), 16);
        int g = System.Convert.ToInt32(hex.Substring(2, 2), 16);
        int b = System.Convert.ToInt32(hex.Substring(4, 2), 16);
        return new Color(r / 255f, g / 255f, b / 255f, 1f);
    }

    // Цвета мира. Держим их в одном месте: перекрасить игру — правка здесь,
    // а не поиск по десяти файлам.
    public static readonly Color Nebo = Iz("5C94FC");
    public static readonly Color NeboNizh = Iz("8FC3FF");
    public static readonly Color Kontur = Iz("18161F");
    public static readonly Color ZemlyaSvet = Iz("E09A55");
    public static readonly Color Zemlya = Iz("C4622D");
    public static readonly Color ZemlyaTemn = Iz("8A4020");
    public static readonly Color ZemlyaShov = Iz("A85226");
    public static readonly Color Kirpich = Iz("C4622D");
    public static readonly Color KirpichShov = Iz("7A3316");
    public static readonly Color Zoloto = Iz("F4C542");
    public static readonly Color ZolotoTemn = Iz("B8860B");
    public static readonly Color ZolotoSvet = Iz("FFE9A0");
    public static readonly Color Truba = Iz("3FA34D");
    public static readonly Color TrubaSvet = Iz("7BD98A");
    public static readonly Color TrubaTemn = Iz("1F6B2D");
    public static readonly Color Oblako = Iz("FFFFFF");
    public static readonly Color OblakoTen = Iz("D6E6FF");
    public static readonly Color Trava = Iz("3FA34D");
    public static readonly Color TravaTemn = Iz("276C33");
    public static readonly Color Kamen = Iz("9A9AA8");
    public static readonly Color KamenTemn = Iz("5E5E70");

    // Знаки для рисунков символами. Точка — прозрачно, она обрабатывается
    // отдельно и в таблице не нужна.
    public static readonly Dictionary<char, Color> Znaki = new Dictionary<char, Color>
    {
        { 'k', Iz("18161F") }, // контур, почти чёрный
        { 'r', Iz("E23B2E") }, // красный (кепка, рубаха)
        { 'R', Iz("A02218") }, // тёмно-красный
        { 's', Iz("F4C08A") }, // кожа
        { 'S', Iz("C98A5C") }, // тень кожи
        { 'b', Iz("2B58C8") }, // синий (комбинезон)
        { 'B', Iz("1B3A8C") }, // тёмно-синий
        { 'w', Iz("FFFFFF") }, // белый
        { 'y', Iz("F4C542") }, // жёлтый (пуговицы, монета)
        { 'Y', Iz("B8860B") }, // тёмно-жёлтый
        { 'n', Iz("8B5A2B") }, // коричневый
        { 'N', Iz("5C3A1A") }, // тёмно-коричневый
        { 'g', Iz("3FA34D") }, // зелёный
        { 'G', Iz("276C33") }, // тёмно-зелёный
        { 'o', Iz("C4622D") }, // кирпичный
        { 'l', Iz("EAF2FF") }, // светлый, облако
    };
}

// Холст: рисуем в массиве точек, потом отдаём готовый спрайт.
// Начало координат — левый нижний угол, как в текстурах Unity.
public class Holst
{
    public readonly int Shirina;
    public readonly int Vysota;
    readonly Color[] tochki;

    public Holst(int shirina, int vysota)
    {
        Shirina = shirina;
        Vysota = vysota;
        tochki = new Color[shirina * vysota]; // по умолчанию прозрачный
    }

    public void Tochka(int x, int y, Color cvet)
    {
        if (x < 0 || y < 0 || x >= Shirina || y >= Vysota) return;
        tochki[y * Shirina + x] = cvet;
    }

    public void Zalit(Color cvet)
    {
        for (int i = 0; i < tochki.Length; i++) tochki[i] = cvet;
    }

    public void Pryamoug(int x, int y, int shirina, int vysota, Color cvet)
    {
        for (int j = y; j < y + vysota; j++)
            for (int i = x; i < x + shirina; i++)
                Tochka(i, j, cvet);
    }

    public void Ramka(int x, int y, int shirina, int vysota, Color cvet)
    {
        for (int i = x; i < x + shirina; i++)
        {
            Tochka(i, y, cvet);
            Tochka(i, y + vysota - 1, cvet);
        }
        for (int j = y; j < y + vysota; j++)
        {
            Tochka(x, j, cvet);
            Tochka(x + shirina - 1, j, cvet);
        }
    }

    // Горизонтальная линия — часто нужна для швов и полос.
    public void Liniya(int x1, int x2, int y, Color cvet)
    {
        for (int i = x1; i <= x2; i++) Tochka(i, y, cvet);
    }

    // Круг без сглаживания: пиксельная графика, ступеньки здесь уместны.
    public void Krug(int cx, int cy, int radius, Color cvet)
    {
        for (int j = cy - radius; j <= cy + radius; j++)
            for (int i = cx - radius; i <= cx + radius; i++)
            {
                int dx = i - cx, dy = j - cy;
                if (dx * dx + dy * dy <= radius * radius) Tochka(i, j, cvet);
            }
    }

    public Sprite Sprajt(float centrX = 0.5f, float centrY = 0.5f)
    {
        Texture2D tekstura = new Texture2D(Shirina, Vysota, TextureFormat.RGBA32, false);
        // Point — иначе Unity размоет пиксели и вся затея потеряет смысл.
        tekstura.filterMode = FilterMode.Point;
        tekstura.wrapMode = TextureWrapMode.Clamp;
        tekstura.SetPixels(tochki);
        tekstura.Apply();
        return Sprite.Create(
            tekstura,
            new Rect(0, 0, Shirina, Vysota),
            new Vector2(centrX, centrY),
            Palitra.PikselejVKletke,
            0,
            SpriteMeshType.FullRect);
    }
}

public static class Risovanie
{
    // Рисунок символами: строки идут сверху вниз, как их видно в коде.
    public static Holst IzRisunka(string[] risunok)
    {
        int vysota = risunok.Length;
        int shirina = risunok[0].Length;
        Holst holst = new Holst(shirina, vysota);
        for (int stroka = 0; stroka < vysota; stroka++)
        {
            string s = risunok[stroka];
            if (s.Length != shirina)
            {
                // Ловится сразу при запуске: строки разной длины — самая частая
                // опечатка в рисунках, и без проверки она даёт кривой спрайт.
                Debug.LogError("Рисунок кривой: строка " + stroka + " длиной " +
                               s.Length + ", а нужно " + shirina);
            }
            for (int i = 0; i < s.Length && i < shirina; i++)
            {
                char znak = s[i];
                if (znak == '.') continue;
                Color cvet;
                if (!Palitra.Znaki.TryGetValue(znak, out cvet)) cvet = Color.magenta;
                holst.Tochka(i, vysota - 1 - stroka, cvet);
            }
        }
        return holst;
    }

    public static Sprite SprajtIzRisunka(string[] risunok)
    {
        return IzRisunka(risunok).Sprajt();
    }

    // Склейка частей рисунка сверху вниз: голова + туловище + ноги.
    // Так варианты позы отличаются только тремя строками, а не всей картинкой.
    public static string[] Sklejka(params string[][] chasti)
    {
        List<string> vse = new List<string>();
        for (int i = 0; i < chasti.Length; i++) vse.AddRange(chasti[i]);
        return vse.ToArray();
    }

    // Одноцветный квадратик — обломки кирпича, вспышки, полоса шеста.
    public static Sprite Kvadrat(int shirina, int vysota, Color cvet, float centrY = 0.5f)
    {
        Holst h = new Holst(shirina, vysota);
        h.Zalit(cvet);
        return h.Sprajt(0.5f, centrY);
    }
}
