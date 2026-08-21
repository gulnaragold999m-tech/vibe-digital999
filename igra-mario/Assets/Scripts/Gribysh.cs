using UnityEngine;

// «Грибыш» — простейший враг. Ходит прямо, разворачивается о стену,
// с обрыва падает. Наступили сверху — расплющивается.
public class Gribysh : Vrag
{
    float _faza;

    protected override void Awake()
    {
        base.Awake();
        _skorost = 2.4f;
        _col.size = new Vector2(0.82f, 0.82f);
        _col.offset = new Vector2(0f, 0.41f);
        _sr.sprite = Art.Goomba;
        _vid.localPosition = new Vector3(0f, 0.5f, 0f);
    }

    protected override void Update()
    {
        base.Update();
        if (!_aktiven || _mertv) return;

        // Покачивание вместо анимации ходьбы: два кадра рисовать не стали,
        // а стоять на месте враг выглядит мёртвым ещё до того, как умрёт.
        _faza += Time.deltaTime * 8f;
        _vid.localScale = new Vector3(_dir * (1f + Mathf.Sin(_faza) * 0.06f),
                                      1f - Mathf.Sin(_faza) * 0.06f, 1f);
    }

    public override void NaNego(PlayerController geroy)
    {
        if (_mertv) return;
        _mertv = true;
        _aktiven = false;

        _col.enabled = false;
        _rb.ZadatSkorost(Vector2.zero);
        _rb.simulated = false;
        _sr.sprite = Art.GoombaFlat;
        _vid.localScale = Vector3.one;

        Sfx.Play(Sfx.Stomp);
        GameManager.I.DobavitOchki(100, transform.position);
        geroy.Otskok(9.5f);
        Destroy(gameObject, 0.5f);
    }
}
