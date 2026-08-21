using UnityEngine;

namespace PixelRunner
{
    /// <summary>Монета, лежащая на уровне. Проходится насквозь, поэтому триггер.</summary>
    public class Coin : MonoBehaviour
    {
        float animTime;

        public static Coin Create(Vector3 pos)
        {
            var go = new GameObject("Монета");
            go.transform.position = pos;
            return go.AddComponent<Coin>();
        }

        void Awake()
        {
            var sr = gameObject.AddComponent<SpriteRenderer>();
            sr.sprite = PixelArt.Get("coin0");
            sr.sortingOrder = 3;

            var col = gameObject.AddComponent<BoxCollider2D>();
            col.size = new Vector2(0.7f, 0.8f);
            col.isTrigger = true;

            animTime = Random.value * 4f;   // чтобы монеты вращались не хором
        }

        void Update()
        {
            animTime += Time.deltaTime * 8f;
            var sr = GetComponent<SpriteRenderer>();
            sr.sprite = PixelArt.Get("coin" + ((int)animTime % 4));
        }

        void OnTriggerEnter2D(Collider2D other)
        {
            var p = other.GetComponent<Player>();
            if (p == null || p.IsDead) return;
            Game.Instance.AddCoin();
            Destroy(gameObject);
        }
    }
}
