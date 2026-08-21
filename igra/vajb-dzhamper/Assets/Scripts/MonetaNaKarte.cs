using UnityEngine;

// Монета, которая лежит на уровне. Крутится и ждёт героя.
// Своей физики ей не нужно, поэтому это обычный компонент, а не Suschestvo.
public class MonetaNaKarte : MonoBehaviour
{
    SpriteRenderer risovalka;
    float shag;

    void Awake()
    {
        risovalka = GetComponent<SpriteRenderer>();
        // Сдвиг фазы по координате: иначе все монеты уровня мигают в такт,
        // и вместо блеска получается моргание.
        shag = Mathf.Abs(transform.position.x) * 0.7f;
    }

    void Update()
    {
        if (Igra.Ya == null) return;
        shag += Time.deltaTime * 9f;
        risovalka.sprite = Sprajty.Moneta[Mathf.FloorToInt(shag) % Sprajty.Moneta.Length];

        Igrok geroj = Igra.Ya.Geroj;
        if (geroj == null || geroj.Mertv) return;

        Vector3 gde = transform.position;
        Rect moya = new Rect(gde.x - 0.3f, gde.y - 0.45f, 0.6f, 0.9f);
        if (moya.Overlaps(geroj.Korobka()))
        {
            Igra.Ya.VzyatMonetu();
            Destroy(gameObject);
        }
    }
}
