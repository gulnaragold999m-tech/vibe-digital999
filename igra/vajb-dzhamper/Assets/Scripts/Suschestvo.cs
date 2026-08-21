using UnityEngine;

// Общая основа для всех, кто ходит и падает: герой, враг, гриб.
//
// Столкновения — свои, по сетке мира, без Rigidbody2D. Так сделано ради
// управления: физический движок даёт скольжение, отскоки и «залипание» на
// стыках плиток, и бороться с этим в платформере дольше, чем посчитать
// пересечение прямоугольника с клетками самому.
public abstract class Suschestvo : MonoBehaviour
{
    public Vector2 Skorost;
    public Vector2 Razmer = new Vector2(0.8f, 0.8f);
    public bool NaZemle;
    public bool UpersyaVStenu;

    protected Mir mir;
    protected SpriteRenderer risovalka;

    // Зазор, на который отодвигаем от стены. Без него герой каждый кадр
    // касается клетки, и проверка «на земле» начинает мигать.
    protected const float Zapas = 0.004f;

    protected virtual void Awake()
    {
        risovalka = GetComponent<SpriteRenderer>();
    }

    public void Nastroit(Mir novyjMir)
    {
        mir = novyjMir;
    }

    public Rect Korobka()
    {
        Vector3 gde = transform.position;
        return new Rect(gde.x - Razmer.x * 0.5f, gde.y - Razmer.y * 0.5f, Razmer.x, Razmer.y);
    }

    public bool Peresekaet(Suschestvo drugoj)
    {
        return drugoj != null && Korobka().Overlaps(drugoj.Korobka());
    }

    // Шаг делится на кусочки не длиннее четверти клетки: иначе на большой
    // скорости можно пролететь сквозь стену, не заметив её.
    protected void Peremestit(Vector2 shag)
    {
        UpersyaVStenu = false;
        float dlina = Mathf.Max(Mathf.Abs(shag.x), Mathf.Abs(shag.y));
        int chastej = Mathf.Max(1, Mathf.CeilToInt(dlina / 0.25f));
        Vector2 kusok = shag / chastej;
        for (int i = 0; i < chastej; i++)
        {
            PoGorizontali(kusok.x);
            PoVertikali(kusok.y);
        }
        NaZemle = ZemlyaPodNogami();
    }

    void PoGorizontali(float dx)
    {
        if (dx == 0f) return;
        transform.position += new Vector3(dx, 0f, 0f);
        Rect korobka = Korobka();
        int y0 = Mathf.FloorToInt(korobka.yMin + 0.05f);
        int y1 = Mathf.FloorToInt(korobka.yMax - 0.05f);

        if (dx > 0f)
        {
            int x = Mathf.FloorToInt(korobka.xMax - Zapas);
            for (int y = y0; y <= y1; y++)
                if (mir.Tverdaya(x, y))
                {
                    transform.position = new Vector3(x - Razmer.x * 0.5f - Zapas, transform.position.y, 0f);
                    Skorost.x = 0f;
                    UpersyaVStenu = true;
                    return;
                }
        }
        else
        {
            int x = Mathf.FloorToInt(korobka.xMin + Zapas);
            for (int y = y0; y <= y1; y++)
                if (mir.Tverdaya(x, y))
                {
                    transform.position = new Vector3(x + 1f + Razmer.x * 0.5f + Zapas, transform.position.y, 0f);
                    Skorost.x = 0f;
                    UpersyaVStenu = true;
                    return;
                }
        }
    }

    void PoVertikali(float dy)
    {
        if (dy == 0f) return;
        transform.position += new Vector3(0f, dy, 0f);
        Rect korobka = Korobka();
        int x0 = Mathf.FloorToInt(korobka.xMin + 0.05f);
        int x1 = Mathf.FloorToInt(korobka.xMax - 0.05f);

        if (dy < 0f)
        {
            int y = Mathf.FloorToInt(korobka.yMin + Zapas);
            for (int x = x0; x <= x1; x++)
                if (mir.Tverdaya(x, y))
                {
                    transform.position = new Vector3(transform.position.x, y + 1f + Razmer.y * 0.5f + Zapas, 0f);
                    Skorost.y = 0f;
                    NaZemle = true;
                    return;
                }
        }
        else
        {
            int y = Mathf.FloorToInt(korobka.yMax - Zapas);
            for (int x = x0; x <= x1; x++)
                if (mir.Tverdaya(x, y))
                {
                    transform.position = new Vector3(transform.position.x, y - Razmer.y * 0.5f - Zapas, 0f);
                    Skorost.y = 0f;
                    GolovojVBlok(x, y);
                    return;
                }
        }
    }

    protected bool ZemlyaPodNogami()
    {
        Rect korobka = Korobka();
        int y = Mathf.FloorToInt(korobka.yMin - 0.06f);
        return mir.Tverdaya(Mathf.FloorToInt(korobka.xMin + 0.06f), y)
               || mir.Tverdaya(Mathf.FloorToInt(korobka.xMax - 0.06f), y);
    }

    // Стукнулись головой о клетку. Герой этим ломает кирпичи, остальным всё равно.
    protected virtual void GolovojVBlok(int x, int y) { }
}
