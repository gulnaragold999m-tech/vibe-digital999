using UnityEngine;

// Герой. Здесь живёт всё «ощущение» игры, ради которого её и делают:
// разгон, инерция, длина прыжка, отскок от врага.
//
// Точка отсчёта объекта — НОГИ, а не центр. Поэтому смена размера
// (маленький ↔ большой) не проваливает героя в пол и не выталкивает
// в потолок: подошва остаётся на месте, растёт всё вверх.
[RequireComponent(typeof(Rigidbody2D))]
[RequireComponent(typeof(BoxCollider2D))]
public class PlayerController : MonoBehaviour
{
    // ---------- настройки бега и прыжка ----------
    // Цифры подобраны на ощупь. Меняете одну — проверяйте прыжок
    // через яму в три клетки: на нём видно всё сразу.
    const float ShagMax   = 5.2f;    // обычная скорость
    const float BegMax    = 8.2f;    // с зажатым Shift
    const float Razgon    = 48f;     // как быстро набирает скорость на земле
    const float RazgonAir = 26f;     // в воздухе слушается хуже — так честнее
    const float Tormoz    = 34f;     // трение, когда клавишу отпустили
    const float Razvorot  = 70f;     // резкая смена направления
    const float PrizhokV  = 17f;     // начальная скорость прыжка
    const float PadenieK  = 1.9f;    // вниз падаем быстрее, чем летим вверх
    const float KorotkoK  = 2.6f;    // отпустил кнопку — прыжок обрывается
    const float MaxPadenie = 24f;

    // Поблажки, без которых управление кажется «залипающим».
    const float Koyot     = 0.10f;   // успел прыгнуть, уже сойдя с края
    const float Buffer    = 0.12f;   // нажал прыжок чуть раньше приземления

    public bool Bolshoy { get; private set; }
    public bool Zhiv { get; private set; }
    public bool Upravlyaem { get; set; }
    public int Napravlenie { get; private set; }

    Rigidbody2D _rb;
    BoxCollider2D _col;
    SpriteRenderer _sr;
    Transform _vid;

    float _koyotTaimer, _bufferTaimer;
    bool _naZemle, _prizhokDerzhu;
    float _shagFaza;
    float _neuyazvim;
    float _letelVverh;   // сколько ещё считается, что мы прыгали вверх

    void Awake()
    {
        _rb = GetComponent<Rigidbody2D>();
        _col = GetComponent<BoxCollider2D>();

        _rb.bodyType = RigidbodyType2D.Dynamic;
        _rb.freezeRotation = true;
        _rb.gravityScale = 1f;
        _rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
        _rb.interpolation = RigidbodyInterpolation2D.Interpolate;

        // Нулевое трение: иначе герой «прилипает» к стене и висит на ней.
        // Торможение на земле мы считаем сами, оно нам нужно управляемым.
        var mat = new PhysicsMaterial2D("geroy") { friction = 0f, bounciness = 0f };
        _col.sharedMaterial = mat;
        _rb.sharedMaterial = mat;

        _vid = new GameObject("Vid").transform;
        _vid.SetParent(transform, false);
        _sr = _vid.gameObject.AddComponent<SpriteRenderer>();
        _sr.sortingOrder = 10;

        gameObject.layer = Layers.Player;
        Napravlenie = 1;
        Zhiv = true;
        Upravlyaem = true;
        PrimenitRazmer(false);
    }

    // ---------- размер ----------

    void PrimenitRazmer(bool bolshoy)
    {
        Bolshoy = bolshoy;
        float h = bolshoy ? 1.42f : 0.92f;
        _col.size = new Vector2(0.68f, h);
        _col.offset = new Vector2(0f, h * 0.5f + 0.01f);
        _vid.localPosition = new Vector3(0f, bolshoy ? 0.75f : 0.5f, 0f);
        ObnovitVid();
    }

    public void Rasti()
    {
        if (Bolshoy) { GameManager.I.DobavitOchki(200); return; }
        PrimenitRazmer(true);
        _neuyazvim = 0.6f;
        Sfx.Play(Sfx.Power);
        GameManager.I.DobavitOchki(1000);
    }

    public void PoluchitUron()
    {
        if (!Zhiv || _neuyazvim > 0f || !Upravlyaem) return;

        if (Bolshoy)
        {
            PrimenitRazmer(false);
            _neuyazvim = 1.6f;      // мигаем и не получаем урон повторно
            Sfx.Play(Sfx.Hurt);
        }
        else Umeret();
    }

    public void Umeret()
    {
        if (!Zhiv) return;
        Zhiv = false;
        Upravlyaem = false;

        _col.enabled = false;                       // проваливаемся сквозь всё
        _rb.ZadatSkorost(new Vector2(0f, 13f));        // и подпрыгиваем напоследок
        _sr.enabled = true;
        _sr.sprite = Art.HeroDead;
        _vid.localPosition = new Vector3(0f, 0.5f, 0f);

        Sfx.MusicStop();
        Sfx.Play(Sfx.Die);
        GameManager.I.GeroyUmiraet();
    }

    // Отскок после того, как приземлился на врага.
    public void Otskok(float sila)
    {
        var v = _rb.Skorost();
        // Держишь прыжок — отскок выше. Так делается цепочка из врагов.
        v.y = _prizhokDerzhu ? sila * 1.35f : sila;
        _rb.ZadatSkorost(v);
        _koyotTaimer = 0f;
    }

    // ---------- каждый кадр ----------

    void Update()
    {
        if (!Zhiv) return;

        // Упал в яму. Проверять надо здесь, а не коллайдером внизу карты:
        // коллайдер пришлось бы двигать вслед за уровнем и он бы ловил
        // ещё и врагов, которым падать в яму вполне можно.
        if (transform.position.y < -4f) { Umeret(); return; }

        if (_neuyazvim > 0f)
        {
            _neuyazvim -= Time.deltaTime;
            // Мигание. Последний кадр обязан включить спрайт обратно,
            // иначе герой навсегда останется невидимым — так и было.
            _sr.enabled = _neuyazvim <= 0f || ((int)(Time.time * 24f) & 1) == 0;
        }

        if (!Upravlyaem) { ObnovitVid(); return; }

        if (PrizhokNazhat()) _bufferTaimer = Buffer;
        else _bufferTaimer -= Time.deltaTime;

        _prizhokDerzhu = PrizhokDerzhat();
        ObnovitVid();
    }

    void FixedUpdate()
    {
        if (!Zhiv) return;

        ProveritZemlyu();
        if (!Upravlyaem) return;

        float dt = Time.fixedDeltaTime;
        var v = _rb.Skorost();

        // --- бег ---
        float vhod = Vvod();
        bool beg = BegNazhat();
        float max = beg ? BegMax : ShagMax;

        if (Mathf.Abs(vhod) > 0.01f)
        {
            Napravlenie = vhod > 0f ? 1 : -1;
            // Разворот на полном ходу должен быть заметным, но не мгновенным.
            float a = Mathf.Sign(vhod) != Mathf.Sign(v.x) && Mathf.Abs(v.x) > 0.5f
                      ? Razvorot
                      : (_naZemle ? Razgon : RazgonAir);
            v.x = Mathf.MoveTowards(v.x, vhod * max, a * dt);
        }
        else if (_naZemle)
        {
            v.x = Mathf.MoveTowards(v.x, 0f, Tormoz * dt);
        }

        // Отпустил Shift на разгоне — скорость гасится плавно, а не обрывается.
        if (Mathf.Abs(v.x) > max) v.x = Mathf.MoveTowards(v.x, Mathf.Sign(v.x) * max, Tormoz * dt);

        // --- прыжок ---
        if (_bufferTaimer > 0f && _koyotTaimer > 0f)
        {
            v.y = PrizhokV;
            _bufferTaimer = 0f;
            _koyotTaimer = 0f;
            _naZemle = false;
            Sfx.Play(Sfx.Jump, 0.7f);
        }

        // --- тяжесть ---
        float g = Physics2D.gravity.y;
        if (v.y < 0f) v.y += g * (PadenieK - 1f) * dt;
        else if (v.y > 0f && !_prizhokDerzhu) v.y += g * (KorotkoK - 1f) * dt;
        if (v.y < -MaxPadenie) v.y = -MaxPadenie;

        // Отметка «мы летели вверх». Нужна для удара головой: к моменту,
        // когда приходит событие столкновения, физика уже обнулила
        // скорость, и отличить прыжок в блок от ходьбы под потолком
        // было бы нечем — большой герой сносил бы блоки, просто идя.
        if (v.y > 0.5f) _letelVverh = 0.15f;
        else _letelVverh -= dt;

        _rb.ZadatSkorost(v);

        SobratPredmety();
    }

    void ProveritZemlyu()
    {
        Vector2 tochka = (Vector2)transform.position + new Vector2(0f, 0.07f);
        bool bylo = _naZemle;
        _naZemle = Physics2D.OverlapBox(tochka, new Vector2(_col.size.x - 0.06f, 0.14f), 0f,
                                        Layers.MaskGround) != null
                   && _rb.Skorost().y <= 0.01f;

        if (_naZemle) _koyotTaimer = Koyot;
        else _koyotTaimer -= Time.fixedDeltaTime;

        if (_naZemle && !bylo) _shagFaza = 0f;
    }

    // Предметы собираем перекрытием, а не столкновением — см. Layers.cs.
    void SobratPredmety()
    {
        var box = _col.bounds;
        var naideno = Physics2D.OverlapBoxAll(box.center, box.size, 0f, Layers.MaskItem);
        for (int i = 0; i < naideno.Length; i++)
        {
            var p = naideno[i].GetComponent<IPickup>();
            if (p != null) p.Podobrat(this);
        }
    }

    // ---------- столкновения ----------

    void OnCollisionEnter2D(Collision2D c) { RazobratStolknovenie(c); }
    void OnCollisionStay2D(Collision2D c) { RazobratStolknovenie(c); }

    void RazobratStolknovenie(Collision2D c)
    {
        if (!Zhiv || !Upravlyaem) return;

        // Кто выше, тот и прав. Сравниваем не нормали (у них разное
        // толкование в разных версиях Unity), а сами точки касания —
        // это однозначно и проверяется глазами в отладке.
        var box = _col.bounds;

        if (c.gameObject.layer == Layers.Enemy)
        {
            var vrag = c.gameObject.GetComponent<Vrag>();
            if (vrag == null) return;

            // Подошва выше середины врага — значит, приземлились сверху.
            bool sverhu = _rb.Skorost().y <= 0.6f && box.min.y > c.collider.bounds.center.y;

            if (sverhu) vrag.NaNego(this);
            else vrag.Kasanie(this);
            return;
        }

        if (c.gameObject.layer != Layers.Ground) return;
        if (_letelVverh <= 0f) return;            // не прыгали — значит, не били

        // Удар головой снизу: точка касания у самой макушки.
        for (int i = 0; i < c.contactCount; i++)
        {
            var t = c.GetContact(i).point;
            if (t.y < box.max.y - 0.12f) continue;
            if (Mathf.Abs(t.x - box.center.x) > box.size.x * 0.6f) continue;

            // Один прыжок — один блок. Иначе два соседних блока
            // получают удар за один прыжок, и это выглядит случайностью.
            _letelVverh = 0f;

            var b = c.collider.GetComponent<IBumpable>();
            if (b != null) { b.Bump(this); return; }
            Sfx.Play(Sfx.Bump, 0.5f);
            return;
        }
    }

    // ---------- внешний вид ----------

    void ObnovitVid()
    {
        Sprite s;
        if (!Zhiv) s = Art.HeroDead;
        else if (!_naZemle) s = Bolshoy ? Art.HeroJumpBig : Art.HeroJump;
        else
        {
            float v = Mathf.Abs(_rb != null ? _rb.Skorost().x : 0f);
            if (v > 0.4f)
            {
                // Шаг — это чередование двух поз. Чем быстрее бежим,
                // тем чаще меняем: иначе на бегу герой «плывёт».
                _shagFaza += Time.deltaTime * (4f + v * 1.6f);
                bool vtoraya = ((int)_shagFaza & 1) == 1;
                s = vtoraya ? (Bolshoy ? Art.HeroJumpBig : Art.HeroJump)
                            : (Bolshoy ? Art.HeroBig : Art.Hero);
            }
            else s = Bolshoy ? Art.HeroBig : Art.Hero;
        }

        _sr.sprite = s;
        _vid.localScale = new Vector3(Napravlenie, 1f, 1f);
    }

    // ---------- ввод ----------
    // Читаем клавиши напрямую, без «осей» Unity: так игра работает
    // в любом проекте, куда её скопируют, и не зависит от настроек ввода.

    static float Vvod()
    {
        float x = 0f;
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) x -= 1f;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) x += 1f;
        return x;
    }

    static bool PrizhokNazhat()
    {
        return Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.W)
            || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.Z)
            || Input.GetKeyDown(KeyCode.J);
    }

    static bool PrizhokDerzhat()
    {
        return Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.W)
            || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.Z)
            || Input.GetKey(KeyCode.J);
    }

    static bool BegNazhat()
    {
        return Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift)
            || Input.GetKey(KeyCode.X) || Input.GetKey(KeyCode.K);
    }
}
