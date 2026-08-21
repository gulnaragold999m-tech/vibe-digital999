using UnityEngine;

// Герой. Здесь живёт всё, что отвечает за ощущение от управления, —
// и цифры подобраны так, чтобы прыжок был предсказуемым:
//
//   высота прыжка  = сила² / (2 · тяжесть вверх) ≈ 4,4 клетки
//   длина прыжка с разбега ≈ 7 клеток
//
// Отсюда правило для карты: ямы шире шести клеток непроходимы, а труба выше
// четырёх клеток становится стеной. Меняете цифры — проверьте уровень.
public class Igrok : Suschestvo
{
    const float SkorostHodby = 5.5f;
    const float SkorostBega = 9f;
    const float Uskorenie = 26f;
    const float Tormozhenie = 34f;
    const float UskorenieVVozduhe = 18f;
    const float SilaPryzhka = 17f;
    const float TyazhestVverh = 33f;   // пока держат кнопку — прыжок выше
    const float TyazhestVniz = 68f;
    const float PredelPadeniya = 24f;

    public static readonly Vector2 RazmerMalyj = new Vector2(0.72f, 0.95f);
    public static readonly Vector2 RazmerBolshoj = new Vector2(0.72f, 1.5f);

    public bool Bolshoj;
    public bool Mertv;
    public bool Upravlyaem = true;
    public float SamHodit;             // на финише герой идёт сам, без клавиш

    float koyote;                      // «время прощения» после схода с края
    float zapasPryzhka;                // нажатие чуть раньше приземления не теряется
    float neuyazvimost;
    float shagAnimacii;
    float schetchikSmerti;
    bool zhdemOtpuskaniya;              // см. VklyuchitUpravlenie

    void Start()
    {
        Razmer = RazmerMalyj;
        risovalka.sortingOrder = 10;
    }

    void Update()
    {
        if (mir == null) return;
        // Кадр может «моргнуть» (загрузка, свёрнутое окно). Ограничение шага
        // не даёт герою за один такой кадр провалиться сквозь пол.
        float dt = Mathf.Min(Time.deltaTime, 0.05f);

        if (Mertv)
        {
            PadenieMertvogo(dt);
            return;
        }

        float napravlenie = SamHodit;
        bool beg = false;
        bool derzhitPryzhok = false;

        if (Upravlyaem)
        {
            napravlenie = 0f;
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) napravlenie -= 1f;
            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) napravlenie += 1f;
            beg = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
            derzhitPryzhok = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow);
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow))
                zapasPryzhka = 0.12f;

            if (zhdemOtpuskaniya)
            {
                if (derzhitPryzhok) { zapasPryzhka = 0f; derzhitPryzhok = false; }
                else zhdemOtpuskaniya = false;
            }
        }

        float predel = beg ? SkorostBega : SkorostHodby;
        if (napravlenie != 0f)
        {
            float uskorenie = NaZemle ? Uskorenie : UskorenieVVozduhe;
            if (Skorost.x * napravlenie < 0f) uskorenie *= 2f;   // разворот должен быть резким
            Skorost.x += napravlenie * uskorenie * dt;
            Skorost.x = Mathf.Clamp(Skorost.x, -predel, predel);
        }
        else if (NaZemle)
        {
            Skorost.x = Mathf.MoveTowards(Skorost.x, 0f, Tormozhenie * dt);
        }

        koyote = NaZemle ? 0.1f : Mathf.Max(0f, koyote - dt);
        zapasPryzhka = Mathf.Max(0f, zapasPryzhka - dt);
        if (zapasPryzhka > 0f && koyote > 0f)
        {
            Skorost.y = SilaPryzhka;
            koyote = 0f;
            zapasPryzhka = 0f;
            NaZemle = false;
            Zvuki.Pryzhok();
        }

        float tyazhest = (Skorost.y > 0f && derzhitPryzhok) ? TyazhestVverh : TyazhestVniz;
        Skorost.y = Mathf.Max(-PredelPadeniya, Skorost.y - tyazhest * dt);

        Peremestit(Skorost * dt);

        if (neuyazvimost > 0f)
        {
            neuyazvimost -= dt;
            risovalka.enabled = (Mathf.FloorToInt(Time.time * 18f) % 2) == 0;
            if (neuyazvimost <= 0f) risovalka.enabled = true;
        }

        if (napravlenie != 0f) risovalka.flipX = napravlenie < 0f;
        Animaciya(dt);

        // Провалился в яму. Проверяем по низу мира, а не по нулю: у карты
        // нижняя строка — земля, и падение ниже неё означает именно яму.
        if (transform.position.y < -2f) Umeret(true);
    }

    void Animaciya(float dt)
    {
        Sprite kadr;
        if (!NaZemle)
        {
            kadr = Bolshoj ? Sprajty.BolshojPryzhok : Sprajty.GerojPryzhok;
        }
        else if (Mathf.Abs(Skorost.x) > 0.2f)
        {
            shagAnimacii += dt * (2f + Mathf.Abs(Skorost.x) * 1.6f);
            int nomer = Mathf.FloorToInt(shagAnimacii) % 4;
            if (Bolshoj)
                kadr = nomer == 0 ? Sprajty.BolshojBeg1 : nomer == 1 ? Sprajty.BolshojBeg2
                     : nomer == 2 ? Sprajty.BolshojBeg3 : Sprajty.BolshojBeg2;
            else
                kadr = nomer == 0 ? Sprajty.GerojBeg1 : nomer == 1 ? Sprajty.GerojBeg2
                     : nomer == 2 ? Sprajty.GerojBeg3 : Sprajty.GerojBeg2;
        }
        else
        {
            shagAnimacii = 0f;
            kadr = Bolshoj ? Sprajty.BolshojStoya : Sprajty.GerojStoya;
        }
        risovalka.sprite = kadr;
    }

    void PadenieMertvogo(float dt)
    {
        // После смерти герой падает сквозь всё: столкновения не считаем нарочно,
        // иначе он останется лежать на земле и картинка будет глупой.
        Skorost.y -= 45f * dt;
        transform.position += new Vector3(0f, Skorost.y * dt, 0f);
        schetchikSmerti -= dt;
        if (schetchikSmerti <= 0f && Igra.Ya != null)
        {
            schetchikSmerti = 999f;
            Igra.Ya.GerojPogib();
        }
    }

    protected override void GolovojVBlok(int x, int y)
    {
        mir.UdarSnizu(x, y, this);
    }

    public void Vyrasti()
    {
        if (Bolshoj || Mertv) return;
        Bolshoj = true;
        Razmer = RazmerBolshoj;
        // Подняли на разницу высот, иначе новая коробка окажется в полу.
        transform.position += new Vector3(0f, (RazmerBolshoj.y - RazmerMalyj.y) * 0.5f + 0.02f, 0f);
        Zvuki.Bonus();
    }

    public void Ranenie()
    {
        if (Mertv || neuyazvimost > 0f) return;
        if (Bolshoj)
        {
            Bolshoj = false;
            Razmer = RazmerMalyj;
            neuyazvimost = 1.6f;
            Zvuki.Udar();
        }
        else
        {
            Umeret(false);
        }
    }

    public void Umeret(bool provalilsya)
    {
        if (Mertv) return;
        Mertv = true;
        Upravlyaem = false;
        Skorost = new Vector2(0f, provalilsya ? 0f : 14f);
        schetchikSmerti = provalilsya ? 0.3f : 2.2f;
        risovalka.sortingOrder = 30;
        risovalka.enabled = true;
        risovalka.sprite = Sprajty.GerojPryzhok;
        Bolshoj = false;
        Zvuki.MuzykuVyklyuchit();
        Zvuki.Smert();
        if (Igra.Ya != null) Igra.Ya.GerojUmiraet();
    }

    // Игру начинают ПРОБЕЛОМ, и этот же пробел — кнопка прыжка. Без такой
    // защиты герой подпрыгивает на первом же кадре, ещё до того, как игрок
    // успел понять, что игра пошла.
    public void VklyuchitUpravlenie()
    {
        Upravlyaem = true;
        zapasPryzhka = 0f;
        zhdemOtpuskaniya = true;
    }

    // Отскок после прыжка на врага — короткий, чтобы не улетать на пол-экрана.
    public void Otskok()
    {
        Skorost.y = 12f;
    }

    public bool Neuyazvim()
    {
        return neuyazvimost > 0f;
    }
}
