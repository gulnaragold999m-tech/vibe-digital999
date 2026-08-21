using UnityEngine;

// Общее у блоков, которые бьют головой снизу: подскок и то, что от удара
// с блока сбрасывает врагов, стоящих сверху.
public abstract class Blok : MonoBehaviour, IBumpable
{
    protected SpriteRenderer _sr;
    protected Transform _vid;
    protected BoxCollider2D _col;

    float _t = -1f;    // время в анимации подскока, отрицательное — покой

    protected virtual void Awake()
    {
        gameObject.layer = Layers.Ground;

        _col = gameObject.AddComponent<BoxCollider2D>();
        _col.size = Vector2.one;

        _vid = new GameObject("Vid").transform;
        _vid.SetParent(transform, false);
        _sr = _vid.gameObject.AddComponent<SpriteRenderer>();
        _sr.sortingOrder = 1;
    }

    protected virtual void Update()
    {
        if (_t < 0f) return;

        _t += Time.deltaTime;
        const float vverh = 0.09f, vniz = 0.13f;
        float y;
        if (_t < vverh) y = Mathf.Lerp(0f, 0.30f, _t / vverh);
        else if (_t < vverh + vniz) y = Mathf.Lerp(0.30f, 0f, (_t - vverh) / vniz);
        else { y = 0f; _t = -1f; }

        _vid.localPosition = new Vector3(0f, y, 0f);
    }

    protected void Podskochit() { _t = 0f; }

    // Ударили снизу — все, кто стоял на блоке, летят кувырком.
    protected void SbrositVragovSverhu(int storona)
    {
        var naideno = Physics2D.OverlapBoxAll(
            (Vector2)transform.position + new Vector2(0f, 0.85f),
            new Vector2(0.95f, 0.6f), 0f, Layers.MaskEnemy);

        for (int i = 0; i < naideno.Length; i++)
        {
            var v = naideno[i].GetComponent<Vrag>();
            if (v != null) v.Sbit(storona);
        }
    }

    public abstract void Bump(PlayerController geroy);
}
