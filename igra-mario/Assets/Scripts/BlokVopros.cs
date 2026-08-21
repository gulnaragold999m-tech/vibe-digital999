using UnityEngine;

// Блок с вопросом. Один удар — одна награда, дальше он пустой.
public class BlokVopros : Blok
{
    public enum Chto { Moneta, Rost, Zhizn }

    public Chto Vnutri = Chto.Moneta;

    bool _pusto;
    float _blesk;

    protected override void Awake()
    {
        base.Awake();
        _sr.sprite = Art.Question;
    }

    protected override void Update()
    {
        base.Update();
        if (_pusto) return;

        // Лёгкое мерцание: полный блок должен звать, а пустой — нет.
        _blesk += Time.deltaTime * 3f;
        float k = 0.85f + Mathf.Sin(_blesk) * 0.15f;
        _sr.color = new Color(k, k, k, 1f);
    }

    public override void Bump(PlayerController geroy)
    {
        if (_pusto)
        {
            Sfx.Play(Sfx.Bump, 0.5f);
            return;
        }

        _pusto = true;
        _sr.sprite = Art.Used;
        _sr.color = Color.white;
        Podskochit();

        int storona = geroy.transform.position.x < transform.position.x ? 1 : -1;
        SbrositVragovSverhu(storona);

        Vector3 nad = transform.position + Vector3.up;

        switch (Vnutri)
        {
            case Chto.Moneta:
                MonetaVsplyv.Sozdat(nad, transform.parent);
                GameManager.I.SobratMonetu(nad, 200);
                break;

            case Chto.Rost:
                Usilitel.Sozdat(transform.position, Usilitel.Vid.Rost, transform.parent);
                Sfx.Play(Sfx.Bump, 0.6f);
                break;

            case Chto.Zhizn:
                Usilitel.Sozdat(transform.position, Usilitel.Vid.Zhizn, transform.parent);
                Sfx.Play(Sfx.Bump, 0.6f);
                break;
        }
    }
}
