using UnityEngine;

// Усилитель из блока: «энерго-ядро» (делает героя большим) или жизнь.
//
// Сначала он полсекунды выползает из блока — в это время он не
// физический, иначе выталкивался бы сквозь блок в случайную сторону.
public class Usilitel : MonoBehaviour, IPickup
{
    public enum Vid { Rost, Zhizn }

    const float VremyaVyhoda = 0.55f;
    const float Skorost = 3.6f;

    public Vid Kakoy = Vid.Rost;

    Rigidbody2D _rb;
    BoxCollider2D _col;
    SpriteRenderer _sr;
    float _vyhod = VremyaVyhoda;
    int _dir = 1;
    bool _sobran;

    public static Usilitel Sozdat(Vector3 gde, Vid vid, Transform roditel)
    {
        var go = new GameObject(vid == Vid.Rost ? "Usilitel" : "Zhizn");
        go.transform.SetParent(roditel, false);
        go.transform.position = gde;
        var u = go.AddComponent<Usilitel>();
        u.Kakoy = vid;
        return u;
    }

    void Awake()
    {
        gameObject.layer = Layers.Item;

        _sr = gameObject.AddComponent<SpriteRenderer>();
        _sr.sprite = Art.Power;
        _sr.sortingOrder = 2;    // пока вылезает — за блоком

        _rb = gameObject.AddComponent<Rigidbody2D>();
        _rb.bodyType = RigidbodyType2D.Kinematic;
        _rb.freezeRotation = true;
        _rb.gravityScale = 1f;

        _col = gameObject.AddComponent<BoxCollider2D>();
        _col.size = new Vector2(0.84f, 0.84f);
        _col.enabled = false;
        _col.sharedMaterial = new PhysicsMaterial2D("usilitel") { friction = 0f, bounciness = 0f };
    }

    void Start()
    {
        if (Kakoy == Vid.Zhizn) _sr.color = new Color(0.55f, 1f, 0.6f);   // жизнь — зелёная
    }

    void FixedUpdate()
    {
        if (_vyhod > 0f)
        {
            _vyhod -= Time.fixedDeltaTime;
            transform.position += Vector3.up * (1.05f / VremyaVyhoda) * Time.fixedDeltaTime;

            if (_vyhod <= 0f)
            {
                _sr.sortingOrder = 6;
                _rb.bodyType = RigidbodyType2D.Dynamic;
                _rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
                _col.enabled = true;
            }
            return;
        }

        var v = _rb.Skorost();
        v.x = _dir * Skorost;
        _rb.ZadatSkorost(v);

        Vector2 ot = (Vector2)transform.position + new Vector2(_dir * 0.42f, 0f);
        if (Physics2D.Raycast(ot, Vector2.right * _dir, 0.12f, Layers.MaskGround)) _dir = -_dir;

        if (transform.position.y < -6f) Destroy(gameObject);
    }

    public void Podobrat(PlayerController geroy)
    {
        if (_sobran || _vyhod > 0f) return;    // из блока ещё не вылез — не отдаём
        _sobran = true;

        if (Kakoy == Vid.Rost) geroy.Rasti();
        else GameManager.I.DobavitZhizn(transform.position);

        Destroy(gameObject);
    }
}
