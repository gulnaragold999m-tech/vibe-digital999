using UnityEngine;

// Блок, по которому бьют снизу: кирпич, блок с монетой, блок с грибом.
public class Blok : MonoBehaviour
{
    Mir mir;
    int kletkaX, kletkaY;
    char tip;
    bool ispolzovan;

    Vector3 svoeMesto;
    float podskok;      // 1 → только что ударили, 0 → блок на месте

    public void Nastroit(Mir novyjMir, int x, int y, char znak)
    {
        mir = novyjMir;
        kletkaX = x;
        kletkaY = y;
        tip = znak;
        svoeMesto = transform.position;
    }

    void Update()
    {
        if (podskok <= 0f) return;
        podskok = Mathf.Max(0f, podskok - Time.deltaTime * 5f);
        // Полуволна синуса: блок ушёл вверх и вернулся ровно на место.
        transform.position = svoeMesto + new Vector3(0f, Mathf.Sin(podskok * Mathf.PI) * 0.3f, 0f);
    }

    public void Udar(Igrok kto)
    {
        if (tip == '=')
        {
            // Кирпич разбивает только большой герой. Маленький его подбивает —
            // это подсказка игроку: сюда нужно вернуться с грибом.
            if (kto != null && kto.Bolshoj) Razbit();
            else { Zvuki.Udar(); podskok = 1f; }
            return;
        }

        if (ispolzovan) return;
        ispolzovan = true;
        podskok = 1f;
        mir.Zamenit(kletkaX, kletkaY, 'x', Sprajty.BlokPustoj);

        if (tip == '!') VypustitGrib();
        else VypustitMonetu();
    }

    void VypustitMonetu()
    {
        GameObject moneta = mir.Kusok("монета из блока", Sprajty.Moneta[0],
            new Vector3(kletkaX + 0.5f, kletkaY + 1.4f, 0f), 6);
        moneta.AddComponent<MonetaIzBloka>();
        Igra.Ya.VzyatMonetu();
    }

    void VypustitGrib()
    {
        GameObject grib = mir.Kusok("гриб", Sprajty.Grib,
            new Vector3(kletkaX + 0.5f, kletkaY + 0.5f, 0f), -1);
        Grib povedenie = grib.AddComponent<Grib>();
        povedenie.Nastroit(mir);
        Zvuki.Moneta();
    }

    void Razbit()
    {
        Zvuki.Lom();
        Igra.Ya.DobavitOchki(50);

        // Обломки создаём ДО того, как убрать плитку: Ubrat уничтожает
        // объект вместе с этим компонентом, и после него код уже не свой.
        for (int i = 0; i < 4; i++)
        {
            float storonaX = (i % 2 == 0) ? -1f : 1f;
            float vverh = (i < 2) ? 13f : 8f;
            GameObject kusok = mir.Kusok("обломок", Sprajty.Oskolok,
                new Vector3(kletkaX + 0.5f + storonaX * 0.2f, kletkaY + 0.5f, 0f), 7);
            Oskolok oskolok = kusok.AddComponent<Oskolok>();
            oskolok.Skorost = new Vector2(storonaX * 3.5f, vverh);
        }

        mir.Ubrat(kletkaX, kletkaY);
    }
}
