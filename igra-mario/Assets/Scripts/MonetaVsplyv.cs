using UnityEngine;

// Монета, выскакивающая из блока. Ни с чем не сталкивается и ничего
// не даёт: очки и счёт монет начисляет сам блок. Это только картинка,
// но без неё удар по блоку кажется пустым.
public class MonetaVsplyv : MonoBehaviour
{
    const float Vremya = 0.55f;
    const float Vysota = 1.6f;

    Vector3 _start;
    float _t;

    public static void Sozdat(Vector3 gde, Transform roditel)
    {
        var go = new GameObject("MonetaVsplyv");
        go.transform.SetParent(roditel, false);
        go.transform.position = gde;
        go.AddComponent<MonetaVsplyv>();
    }

    void Awake()
    {
        _start = transform.position;
        var sr = gameObject.AddComponent<SpriteRenderer>();
        sr.sprite = Art.Coin;
        sr.sortingOrder = 9;
    }

    void Update()
    {
        _t += Time.deltaTime;
        float k = _t / Vremya;
        if (k >= 1f) { Destroy(gameObject); return; }

        // Взлетела и упала обратно: парабола 4k(1-k) даёт ровно это.
        transform.position = _start + Vector3.up * (Vysota * 4f * k * (1f - k));
        transform.localScale = new Vector3(Mathf.Max(0.15f, Mathf.Abs(Mathf.Cos(_t * 22f))), 1f, 1f);
    }
}
