using UnityEngine;

// Гриб из блока. Сначала медленно выезжает наверх (и рисуется ЗА плиткой,
// иначе видно, как он «рождается» внутри блока), потом идёт как враг —
// но при встрече не бьёт, а делает героя большим.
public class Grib : Suschestvo
{
    const float SkorostHodby = 3.6f;

    float napravlenie = 1f;
    float vyezd = 0.62f;

    void Start()
    {
        Razmer = new Vector2(0.82f, 0.82f);
        risovalka.sortingOrder = -1;
    }

    void Update()
    {
        if (mir == null || Igra.Ya == null) return;
        float dt = Mathf.Min(Time.deltaTime, 0.05f);

        if (vyezd > 0f)
        {
            vyezd -= dt;
            transform.position += new Vector3(0f, dt * 1.7f, 0f);
            if (vyezd <= 0f) risovalka.sortingOrder = 4;
            VstrechaSGeroem();
            return;
        }

        if (Igra.Ya.Faza != Igra.Sostoyanie.Igra) return;

        Skorost.x = napravlenie * SkorostHodby;
        Skorost.y = Mathf.Max(-24f, Skorost.y - 60f * dt);
        Peremestit(Skorost * dt);
        if (UpersyaVStenu) napravlenie = -napravlenie;

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
        geroj.Vyrasti();
        Igra.Ya.DobavitOchki(1000);
        Destroy(gameObject);
    }
}
