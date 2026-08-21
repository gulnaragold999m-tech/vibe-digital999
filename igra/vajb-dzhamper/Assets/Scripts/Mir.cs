using UnityEngine;

// Мир: сетка клеток плюс всё, что на ней стоит.
//
// Столкновения считаются по этой сетке, а не физикой Unity. Почему так:
// клетка либо твёрдая, либо нет — проверка стоит одно обращение в массив,
// работает одинаково во всех версиях Unity и не зависит от слоёв, материалов
// и настроек Physics2D, которых в проекте намеренно нет.
public class Mir : MonoBehaviour
{
    public int Shirina { get; private set; }
    public int Vysota { get; private set; }

    public Vector2 StartIgroka = new Vector2(3.5f, 2.5f);
    public float FinishX = 9999f;
    public float FinishNiz;

    char[,] setka;
    Blok[,] bloki;
    GameObject[,] plitki;

    static bool Tverdyj(char znak)
    {
        return znak == '#' || znak == 'X' || znak == '=' || znak == '?' || znak == '!'
               || znak == 'p' || znak == 'x';
    }

    // Твёрдая ли клетка. За краями карты слева и справа — стена: герой не
    // должен убегать в пустоту, где нет ни земли, ни картинки.
    public bool Tverdaya(int x, int y)
    {
        if (setka == null) return false;
        if (x < 0 || x >= Shirina) return true;
        if (y < 0 || y >= Vysota) return false;
        return Tverdyj(setka[x, y]);
    }

    public void Postroit(string[] karta)
    {
        Vysota = karta.Length;
        Shirina = karta[0].Length;
        setka = new char[Shirina, Vysota];
        bloki = new Blok[Shirina, Vysota];
        plitki = new GameObject[Shirina, Vysota];

        // Первый проход: заполняем сетку и создаём всё подвижное.
        for (int stroka = 0; stroka < Vysota; stroka++)
        {
            int y = Vysota - 1 - stroka;           // в файле сверху вниз, в мире снизу вверх
            string s = karta[stroka];
            for (int x = 0; x < Shirina; x++)
            {
                char znak = x < s.Length ? s[x] : '.';
                setka[x, y] = Tverdyj(znak) ? znak : '.';
                Podvizhnoe(znak, x, y);
            }
        }

        // Второй проход: плитки. Отдельно — потому что вид плитки зависит от
        // соседей (у трубы левый бок, у земли трава сверху), а на первом
        // проходе соседи справа и сверху ещё не записаны.
        for (int y = 0; y < Vysota; y++)
            for (int x = 0; x < Shirina; x++)
                if (Tverdyj(setka[x, y])) SozdatPlitku(x, y);
    }

    void Podvizhnoe(char znak, int x, int y)
    {
        switch (znak)
        {
            case 'P':
                StartIgroka = new Vector2(x + 0.5f, y + 0.5f);
                break;
            case 'g':
                SozdatVraga(x, y);
                break;
            case 'o':
                SozdatMonetu(x, y);
                break;
            case 'F':
                SozdatFinish(x, y);
                break;
            case 'c':
                Dekor("облако", Sprajty.Oblako, x, y, -20, 0.5f);
                break;
            case 'b':
                Dekor("куст", Sprajty.Kust, x, y, -10, 0f);
                break;
            case 'h':
                Dekor("холм", Sprajty.Holm, x, y, -12, 0.2f);
                break;
        }
    }

    void SozdatPlitku(int x, int y)
    {
        char znak = setka[x, y];
        Sprite kartinka;
        switch (znak)
        {
            case '#':
                kartinka = Tverdaya(x, y + 1) ? Sprajty.ZemlyaNiz : Sprajty.ZemlyaVerh;
                break;
            case 'X':
                kartinka = Sprajty.Kamen;
                break;
            case '=':
                kartinka = Sprajty.Kirpich;
                break;
            case '?':
            case '!':
                kartinka = Sprajty.BlokVopros;
                break;
            case 'x':
                kartinka = Sprajty.BlokPustoj;
                break;
            case 'p':
                {
                    bool levaya = !(x > 0 && setka[x - 1, y] == 'p');
                    bool verhnyaya = !(y + 1 < Vysota && setka[x, y + 1] == 'p');
                    if (verhnyaya) kartinka = levaya ? Sprajty.TrubaVerhL : Sprajty.TrubaVerhP;
                    else kartinka = levaya ? Sprajty.TrubaTeloL : Sprajty.TrubaTeloP;
                    break;
                }
            default:
                return;
        }

        GameObject plitka = Kusok("плитка", kartinka, new Vector3(x + 0.5f, y + 0.5f, 0f), 0);
        plitki[x, y] = plitka;

        if (znak == '=' || znak == '?' || znak == '!')
        {
            Blok blok = plitka.AddComponent<Blok>();
            blok.Nastroit(this, x, y, znak);
            bloki[x, y] = blok;
        }
    }

    // Точка привязки спрайта (центр или угол) задана при его рисовании,
    // здесь она уже не нужна — поэтому у метода её и нет.
    public GameObject Kusok(string imya, Sprite kartinka, Vector3 gde, int poryadok)
    {
        GameObject predmet = new GameObject(imya);
        predmet.transform.SetParent(transform, false);
        predmet.transform.position = gde;
        SpriteRenderer risovalka = predmet.AddComponent<SpriteRenderer>();
        risovalka.sprite = kartinka;
        risovalka.sortingOrder = poryadok;
        return predmet;
    }

    void Dekor(string imya, Sprite kartinka, int x, int y, int poryadok, float otstavanie)
    {
        // Точка привязки у декораций — левый нижний угол, поэтому ставим их
        // ровно по координате клетки, без пересчёта размеров.
        GameObject predmet = new GameObject(imya);
        predmet.transform.SetParent(transform, false);
        predmet.transform.position = new Vector3(x, y, 0f);
        SpriteRenderer risovalka = predmet.AddComponent<SpriteRenderer>();
        risovalka.sprite = kartinka;
        risovalka.sortingOrder = poryadok;
        if (otstavanie > 0f)
        {
            Parallaks parallaks = predmet.AddComponent<Parallaks>();
            parallaks.Otstavanie = otstavanie;
        }
    }

    void SozdatVraga(int x, int y)
    {
        GameObject predmet = Kusok("враг", Sprajty.Vrag1, new Vector3(x + 0.5f, y + 0.5f, 0f), 4);
        predmet.AddComponent<Vrag>().Nastroit(this);
    }

    void SozdatMonetu(int x, int y)
    {
        GameObject predmet = Kusok("монета", Sprajty.Moneta[0], new Vector3(x + 0.5f, y + 0.5f, 0f), 3);
        predmet.AddComponent<MonetaNaKarte>();
    }

    void SozdatFinish(int x, int y)
    {
        FinishX = x + 0.5f;
        FinishNiz = y;
        Kusok("шест", Sprajty.Shest, new Vector3(x + 0.5f, y, 0f), 1);
        Kusok("флаг", Sprajty.Flag, new Vector3(x + 0.6f, y + 9f, 0f), 2);
    }

    // Блок ударили снизу. Сам удар разбирает Blok — миру достаточно найти его.
    public void UdarSnizu(int x, int y, Igrok kto)
    {
        if (x < 0 || y < 0 || x >= Shirina || y >= Vysota) return;
        if (bloki[x, y] != null) bloki[x, y].Udar(kto);
    }

    public void Ubrat(int x, int y)
    {
        if (x < 0 || y < 0 || x >= Shirina || y >= Vysota) return;
        setka[x, y] = '.';
        if (plitki[x, y] != null) Destroy(plitki[x, y]);
        plitki[x, y] = null;
        bloki[x, y] = null;
    }

    public void Zamenit(int x, int y, char novyjZnak, Sprite kartinka)
    {
        if (x < 0 || y < 0 || x >= Shirina || y >= Vysota) return;
        setka[x, y] = novyjZnak;
        if (plitki[x, y] != null)
        {
            SpriteRenderer risovalka = plitki[x, y].GetComponent<SpriteRenderer>();
            if (risovalka != null) risovalka.sprite = kartinka;
        }
    }
}
