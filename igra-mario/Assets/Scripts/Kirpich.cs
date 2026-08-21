using UnityEngine;

// Кирпич. Маленький герой его только подбрасывает, большой — разбивает.
// Это единственная награда за то, что игрок сохранил усилитель.
public class Kirpich : Blok
{
    protected override void Awake()
    {
        base.Awake();
        _sr.sprite = Art.Brick;
    }

    public override void Bump(PlayerController geroy)
    {
        int storona = geroy.transform.position.x < transform.position.x ? 1 : -1;
        SbrositVragovSverhu(storona);

        if (!geroy.Bolshoy)
        {
            Podskochit();
            Sfx.Play(Sfx.Bump, 0.5f);
            return;
        }

        Sfx.Play(Sfx.Break);
        GameManager.I.DobavitOchki(50);
        Oskolki();
        Destroy(gameObject);
    }

    // Четыре осколка разлетаются и падают. Коллайдеров у них нет:
    // они ни на что не влияют, это чистая картинка.
    void Oskolki()
    {
        for (int i = 0; i < 4; i++)
        {
            var go = new GameObject("Oskolok");
            go.transform.SetParent(transform.parent, false);
            go.transform.position = transform.position
                + new Vector3((i % 2 == 0 ? -0.22f : 0.22f), (i < 2 ? 0.22f : -0.22f), 0f);
            go.transform.localScale = Vector3.one * 0.5f;

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = Art.Brick;
            sr.sortingOrder = 8;

            var rb = go.AddComponent<Rigidbody2D>();
            rb.gravityScale = 2.2f;
            rb.ZadatSkorost(new Vector2((i % 2 == 0 ? -3.5f : 3.5f), i < 2 ? 11f : 7f));
            rb.angularVelocity = (i % 2 == 0 ? 360f : -360f);

            Destroy(go, 2f);
        }
    }
}
