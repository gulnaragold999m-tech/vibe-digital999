using UnityEngine;

// Враг-ходун. Идёт до стены, разворачивается, с обрыва падает.
// Просыпается, только когда камера подошла близко: иначе к приходу героя
// половина врагов уже свалилась бы в ямы на другом конце уровня.
public class Vrag : Suschestvo
{
    const float SkorostHodby = 2.4f;

    float napravlenie = -1f;
    bool prosnulsya;
    bool razdavlen;
    float schetchik;
    float shagAnimacii;
    float prezhnijNizGeroya = float.MinValue;

    void Start()
    {
        Razmer = new Vector2(0.82f, 0.82f);
    }

    void Update()
    {
        if (mir == null || Igra.Ya == null) return;
        float dt = Mathf.Min(Time.deltaTime, 0.05f);

        if (razdavlen)
        {
            schetchik -= dt;
            if (schetchik <= 0f) Destroy(gameObject);
            return;
        }

        if (!prosnulsya)
        {
            if (transform.position.x - Igra.Ya.KameraX() > 14f) return;
            prosnulsya = true;
        }

        if (Igra.Ya.Faza != Igra.Sostoyanie.Igra) return;

        Skorost.x = napravlenie * SkorostHodby;
        Skorost.y = Mathf.Max(-24f, Skorost.y - 60f * dt);
        Peremestit(Skorost * dt);
        if (UpersyaVStenu) napravlenie = -napravlenie;

        shagAnimacii += dt * 6f;
        risovalka.sprite = (Mathf.FloorToInt(shagAnimacii) % 2 == 0) ? Sprajty.Vrag1 : Sprajty.Vrag2;

        if (transform.position.y < -3f)
        {
            Destroy(gameObject);
            return;
        }

        VstrechaSGeroem();
    }

    void VstrechaSGeroem()
    {
        Igrok geroj = Igra.Ya.Geroj;
        if (geroj == null || geroj.Mertv)
        {
            prezhnijNizGeroya = float.MinValue;
            return;
        }

        float nizSejchas = geroj.Korobka().yMin;
        // Помним, где были ноги героя в прошлом кадре. Это спасает на слабом
        // компьютере: при редких кадрах герой за один шаг успевает пролететь
        // врага насквозь и встать на землю — скорость уже нулевая, ноги внизу,
        // и честно заработанный прыжок засчитался бы как удар в бок.
        bool bylVyshe = prezhnijNizGeroya >= Korobka().yMax - 0.05f;
        prezhnijNizGeroya = nizSejchas;

        if (!Peresekaet(geroj)) return;

        // Прыжок сверху засчитывается, если герой не летит вверх и либо его
        // ноги выше середины врага, либо он был выше врага только что.
        if (geroj.Skorost.y <= 0f && (nizSejchas > Korobka().center.y || bylVyshe))
        {
            Razdavit();
            geroj.Otskok();
        }
        else
        {
            geroj.Ranenie();
        }
    }

    public void Razdavit()
    {
        if (razdavlen) return;
        razdavlen = true;
        schetchik = 0.7f;
        risovalka.sprite = Sprajty.VragRazdavlen;
        Zvuki.Topot();
        Igra.Ya.DobavitOchki(100);
    }
}
