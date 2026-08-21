using UnityEngine;

// «Панцирь» — второй враг, из-за него уровни интереснее.
//
// Три состояния:
//   Хожу     — обычный враг.
//   Лежу     — наступили, спрятался. Тронул сбоку — пнул.
//   Лечу     — летит и сносит всех своих на пути. Героя тоже.
//
// Через 8 секунд лежачий панцирь оживает: нельзя, чтобы игрок
// «выключил» опасный участок, просто прыгнув один раз.
public class Pancir : Vrag
{
    enum Sost { Hozhu, Lezhu, Lechu }

    const float SkorostHodby = 2.1f;
    const float SkorostPolyota = 11f;
    const float VremyaPokoya = 8f;

    // Пауза после любого касания героя. Без неё OnCollisionStay2D
    // срабатывает несколько раз подряд: игрок пинает панцирь и тут же
    // получает урон от него же. Ловилось долго, выглядело как случайность.
    const float PauzaKasaniya = 0.25f;

    Sost _sost = Sost.Hozhu;
    float _pokoy;
    float _pauza;
    float _faza;

    protected override void Awake()
    {
        base.Awake();
        _skorost = SkorostHodby;
        _col.size = new Vector2(0.80f, 0.86f);
        _col.offset = new Vector2(0f, 0.43f);
        _sr.sprite = Art.Koopa;
        _vid.localPosition = new Vector3(0f, 0.5f, 0f);
    }

    protected override void Update()
    {
        base.Update();
        if (_pauza > 0f) _pauza -= Time.deltaTime;
        if (!_aktiven || _mertv) return;

        if (_sost == Sost.Hozhu)
        {
            _faza += Time.deltaTime * 7f;
            _vid.localScale = new Vector3(_dir, 1f - Mathf.Sin(_faza) * 0.05f, 1f);
        }
        else if (_sost == Sost.Lezhu)
        {
            _pokoy -= Time.deltaTime;
            // Перед подъёмом панцирь дрожит — предупреждение игроку.
            if (_pokoy < 2f)
                _vid.localScale = new Vector3(1f + Mathf.Sin(Time.time * 30f) * 0.12f, 1f, 1f);
            if (_pokoy <= 0f) Vstat();
        }
    }

    protected override void FixedUpdate()
    {
        base.FixedUpdate();
        if (!_aktiven || _mertv) return;

        if (_sost == Sost.Lezhu)
        {
            var v = _rb.Skorost();
            v.x = 0f;
            _rb.ZadatSkorost(v);
        }
        else if (_sost == Sost.Lechu)
        {
            SnestiVsehNaPuti();
        }
    }

    // Летящий панцирь убирает других врагов. Ищем перекрытием: между
    // собой враги не сталкиваются, поэтому обычных событий не будет.
    void SnestiVsehNaPuti()
    {
        var box = _col.bounds;
        var naideno = Physics2D.OverlapBoxAll(box.center, box.size, 0f, Layers.MaskEnemy);
        for (int i = 0; i < naideno.Length; i++)
        {
            if (naideno[i].gameObject == gameObject) continue;
            var v = naideno[i].GetComponent<Vrag>();
            if (v != null) v.Sbit(_dir);
        }
    }

    void Pnut(int storona)
    {
        _sost = Sost.Lechu;
        _dir = storona;
        _skorost = SkorostPolyota;
        _sr.sprite = Art.Shell;
        _vid.localScale = Vector3.one;
        Sfx.Play(Sfx.Kick);
    }

    void Ostanovit()
    {
        _sost = Sost.Lezhu;
        _skorost = 0f;
        _pokoy = VremyaPokoya;
        _sr.sprite = Art.Shell;
        _vid.localScale = Vector3.one;
        _rb.ZadatSkorost(new Vector2(0f, _rb.Skorost().y));
    }

    void Vstat()
    {
        _sost = Sost.Hozhu;
        _skorost = SkorostHodby;
        _sr.sprite = Art.Koopa;
        _vid.localScale = new Vector3(_dir, 1f, 1f);
    }

    public override void NaNego(PlayerController geroy)
    {
        if (_mertv || _pauza > 0f) return;
        _pauza = PauzaKasaniya;

        switch (_sost)
        {
            case Sost.Hozhu:
                Ostanovit();
                Sfx.Play(Sfx.Stomp);
                GameManager.I.DobavitOchki(100, transform.position);
                break;

            case Sost.Lechu:
                Ostanovit();
                Sfx.Play(Sfx.Stomp);
                break;

            case Sost.Lezhu:
                // Прыгнул на лежачий — пнул его в ту сторону, куда смотришь.
                Pnut(geroy.Napravlenie);
                GameManager.I.DobavitOchki(200, transform.position);
                break;
        }
        geroy.Otskok(9.5f);
    }

    public override void Kasanie(PlayerController geroy)
    {
        if (_mertv || _pauza > 0f) return;

        if (_sost == Sost.Lezhu)
        {
            _pauza = PauzaKasaniya;
            int storona = geroy.transform.position.x < transform.position.x ? 1 : -1;
            Pnut(storona);
            GameManager.I.DobavitOchki(200, transform.position);
            return;
        }
        geroy.PoluchitUron();
    }
}
