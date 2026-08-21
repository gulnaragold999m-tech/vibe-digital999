using UnityEngine;

// Общее для всех врагов: ходьба, разворот о стену, смерть.
//
// Враги между собой не сталкиваются (см. Bootstrap, IgnoreLayerCollision):
// иначе летящий панцирь отскакивал бы от грибыша вместо того, чтобы
// его снести. Разворачиваемся только о стены, лучом вперёд.
[RequireComponent(typeof(Rigidbody2D))]
[RequireComponent(typeof(BoxCollider2D))]
public abstract class Vrag : MonoBehaviour
{
    // Враг оживает, только когда камера подошла близко. Иначе к моменту
    // встречи он уже давно ушёл с места, где его поставили в карте.
    const float DistanciyaSna = 15f;

    protected Rigidbody2D _rb;
    protected BoxCollider2D _col;
    protected SpriteRenderer _sr;
    protected Transform _vid;

    protected int _dir = -1;
    protected float _skorost = 2.4f;
    protected bool _aktiven;
    protected bool _mertv;

    protected virtual void Awake()
    {
        _rb = GetComponent<Rigidbody2D>();
        _col = GetComponent<BoxCollider2D>();

        _rb.bodyType = RigidbodyType2D.Dynamic;
        _rb.freezeRotation = true;
        _rb.gravityScale = 1f;
        _rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;

        var mat = new PhysicsMaterial2D("vrag") { friction = 0f, bounciness = 0f };
        _col.sharedMaterial = mat;
        _rb.sharedMaterial = mat;

        _vid = new GameObject("Vid").transform;
        _vid.SetParent(transform, false);
        _sr = _vid.gameObject.AddComponent<SpriteRenderer>();
        _sr.sortingOrder = 5;

        gameObject.layer = Layers.Enemy;
        _rb.simulated = false;      // спит, пока камера далеко
    }

    protected virtual void Update()
    {
        if (!_aktiven && !_mertv)
        {
            var cam = Camera.main;
            if (cam != null && transform.position.x - cam.transform.position.x < DistanciyaSna)
            {
                _aktiven = true;
                _rb.simulated = true;
            }
        }

        // Поворот рисуем здесь, а не в FixedUpdate: физика тикает
        // не каждый кадр, и картинка начинала подрагивать.
        if (!_mertv) _vid.localScale = new Vector3(_dir, 1f, 1f);
    }

    protected virtual void FixedUpdate()
    {
        if (!_aktiven || _mertv) return;
        Hodit();

        // Провалился в яму — убираем, иначе он будет вечно падать и считаться.
        if (transform.position.y < -6f) Destroy(gameObject);
    }

    protected void Hodit()
    {
        var v = _rb.Skorost();
        v.x = _dir * _skorost;
        _rb.ZadatSkorost(v);

        // Луч вперёд на уровне пояса. Упёрлись в стену — развернулись.
        Vector2 ot = (Vector2)transform.position + new Vector2(_dir * (_col.size.x * 0.5f), 0.3f);
        if (Physics2D.Raycast(ot, Vector2.right * _dir, 0.12f, Layers.MaskGround))
            Razvernutsya();
    }

    public void Razvernutsya() { _dir = -_dir; }

    // Наступили сверху.
    public abstract void NaNego(PlayerController geroy);

    // Тронули сбоку.
    public virtual void Kasanie(PlayerController geroy) { geroy.PoluchitUron(); }

    // Снесли снизу блоком или летящим панцирем: враг переворачивается
    // и улетает за экран. Отдельный вид смерти, не такой, как от прыжка.
    public virtual void Sbit(int storona)
    {
        if (_mertv) return;
        _mertv = true;
        _col.enabled = false;
        _rb.simulated = true;
        _rb.ZadatSkorost(new Vector2(storona * 3f, 11f));
        _vid.localScale = new Vector3(_dir, -1f, 1f);   // вверх ногами
        _sr.sortingOrder = 3;
        Sfx.Play(Sfx.Kick, 0.7f);
        GameManager.I.DobavitOchki(100, transform.position);
        Destroy(gameObject, 2.5f);
    }
}
