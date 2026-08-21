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
        if (geroj == null || geroj.Mertv) return;
        if (!Peresekaet(geroj)) return;

        // Прыжок сверху засчитывается, если герой падает и его ноги выше
        // середины врага. Иначе сбоку на бегу тоже считалось бы прыжком.
        if (geroj.Skorost.y < 0f && geroj.Korobka().yMin > Korobka().center.y)
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
