using UnityEngine;
using System.Collections;

// Флагшток — конец уровня. Шест и флаг достраиваются сами от той клетки,
// где в карте стоит буква F: в карте держать девять символов подряд
// неудобно, их легко сбить при правке.
public class Flag : MonoBehaviour
{
    const int VysotaShesta = 9;
    const float ShirinaZony = 0.7f;

    Transform _flag;
    bool _srabotal;

    void Awake()
    {
        for (int i = 0; i < VysotaShesta; i++)
        {
            var go = new GameObject("Shest");
            go.transform.SetParent(transform, false);
            go.transform.localPosition = new Vector3(0f, i, 0f);
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = Art.Pole;
            sr.sortingOrder = 0;
        }

        var f = new GameObject("Polotno");
        f.transform.SetParent(transform, false);
        f.transform.localPosition = new Vector3(0f, VysotaShesta - 1f, 0f);
        var fsr = f.AddComponent<SpriteRenderer>();
        fsr.sprite = Art.Flag;
        fsr.sortingOrder = 2;
        _flag = f.transform;
    }

    void Update()
    {
        if (_srabotal) return;

        // Ищем героя сами, а не ждём столкновения: шест не должен быть
        // препятствием, а тригтер на слое предметов забрал бы его как монету.
        var zona = Physics2D.OverlapBox(
            (Vector2)transform.position + new Vector2(0f, VysotaShesta * 0.5f),
            new Vector2(ShirinaZony, VysotaShesta), 0f, 1 << Layers.Player);

        if (zona == null) return;

        var geroy = zona.GetComponentInParent<PlayerController>();
        if (geroy == null || !geroy.Zhiv) return;

        _srabotal = true;
        StartCoroutine(Finish(geroy));
    }

    IEnumerator Finish(PlayerController geroy)
    {
        // Чем выше схватился за шест, тем больше очков. Ради этого
        // игроки и разгоняются перед флагом — пусть это окупается.
        float vysota = Mathf.Clamp01((geroy.transform.position.y - transform.position.y)
                                     / (VysotaShesta - 1f));
        int bonus = 100 + Mathf.RoundToInt(vysota * 4900f);

        geroy.Upravlyaem = false;
        Sfx.MusicStop();
        Sfx.Play(Sfx.Flag);

        var rb = geroy.GetComponent<Rigidbody2D>();
        rb.gravityScale = 0f;
        rb.ZadatSkorost(new Vector2(0f, -7f));
        geroy.transform.position = new Vector3(transform.position.x - 0.35f,
                                               geroy.transform.position.y, 0f);

        float nizFlaga = 0f;
        float t = 0f;
        float startFlaga = _flag.localPosition.y;

        // Спуск: герой и флаг съезжают вниз вместе.
        while (geroy.transform.position.y > transform.position.y + 0.02f)
        {
            t += Time.deltaTime;
            _flag.localPosition = new Vector3(0f, Mathf.Lerp(startFlaga, nizFlaga,
                                                             Mathf.Clamp01(t / 0.9f)), 0f);
            yield return null;
        }

        rb.ZadatSkorost(Vector2.zero);
        _flag.localPosition = new Vector3(0f, nizFlaga, 0f);

        yield return new WaitForSeconds(0.4f);

        // Уход вправо: игрок должен увидеть, что уровень пройден,
        // а не просто получить экран с надписью.
        rb.gravityScale = 1f;
        float uhod = 1.6f;
        while (uhod > 0f)
        {
            uhod -= Time.deltaTime;
            rb.ZadatSkorost(new Vector2(5f, rb.Skorost().y));
            yield return null;
        }

        GameManager.I.UrovenProiden(bonus);
    }
}
