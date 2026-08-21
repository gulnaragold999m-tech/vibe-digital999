using UnityEngine;

// Обломок разбитого кирпича: летит, крутится, падает и пропадает.
public class Oskolok : MonoBehaviour
{
    public Vector2 Skorost;
    float povorot;
    float zhizn = 1.6f;

    void Awake()
    {
        povorot = Random.Range(-420f, 420f);
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        Skorost.y -= 55f * dt;
        transform.position += new Vector3(Skorost.x * dt, Skorost.y * dt, 0f);
        transform.Rotate(0f, 0f, povorot * dt);
        zhizn -= dt;
        if (zhizn <= 0f || transform.position.y < -3f) Destroy(gameObject);
    }
}
