using UnityEngine;

// Монета, выскочившая из блока: подлетает, крутится и пропадает.
// Очки за неё начисляются сразу при ударе по блоку — эта картинка нужна
// только затем, чтобы удар было видно.
public class MonetaIzBloka : MonoBehaviour
{
    SpriteRenderer risovalka;
    float skorost = 11f;
    float zhizn = 0.65f;
    float shag;

    void Awake()
    {
        risovalka = GetComponent<SpriteRenderer>();
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        transform.position += new Vector3(0f, skorost * dt, 0f);
        skorost -= 34f * dt;
        shag += dt * 22f;
        risovalka.sprite = Sprajty.Moneta[Mathf.FloorToInt(shag) % Sprajty.Moneta.Length];
        zhizn -= dt;
        if (zhizn <= 0f) Destroy(gameObject);
    }
}
