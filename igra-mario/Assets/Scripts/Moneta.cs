using UnityEngine;

// Монета, стоящая в уровне. Не сталкивается ни с чем: герой собирает её
// перекрытием (см. PlayerController.SobratPredmety).
public class Moneta : MonoBehaviour, IPickup
{
    Transform _vid;
    float _faza;
    bool _sobrana;

    void Awake()
    {
        gameObject.layer = Layers.Item;

        // Картинка — отдельным объектом внутри: её мы сжимаем для
        // «вращения», а рамка подбора должна остаться прежнего размера.
        _vid = new GameObject("Vid").transform;
        _vid.SetParent(transform, false);
        var sr = _vid.gameObject.AddComponent<SpriteRenderer>();
        sr.sprite = Art.Coin;
        sr.sortingOrder = 4;

        var col = gameObject.AddComponent<BoxCollider2D>();
        col.isTrigger = true;
        col.size = new Vector2(0.6f, 0.8f);

        _faza = transform.position.x;   // чтобы монеты в ряду крутились вразнобой
    }

    void Update()
    {
        // Вращение подделываем сжатием по ширине — на 16 пикселях
        // это выглядит ровно так же, как честные четыре кадра.
        float k = Mathf.Cos(Time.time * 6f + _faza);
        _vid.localScale = new Vector3(Mathf.Max(0.15f, Mathf.Abs(k)), 1f, 1f);
    }

    public void Podobrat(PlayerController geroy)
    {
        if (_sobrana) return;
        _sobrana = true;
        GameManager.I.SobratMonetu(transform.position);
        Destroy(gameObject);
    }
}
