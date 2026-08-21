using UnityEngine;

namespace PixelRunner
{
    /// <summary>Монета, вылетающая из блока: подпрыгнула, крутанулась, исчезла.</summary>
    public class CoinPop : MonoBehaviour
    {
        float life;
        SpriteRenderer sr;

        public static void Create(Vector3 pos)
        {
            var go = new GameObject("Монета из блока");
            go.transform.position = pos;
            go.AddComponent<CoinPop>();
        }

        void Awake()
        {
            sr = gameObject.AddComponent<SpriteRenderer>();
            sr.sprite = PixelArt.Get("coin0");
            sr.sortingOrder = 7;
        }

        void Update()
        {
            life += Time.deltaTime;
            // подъём с замедлением: 1.8 клетки вверх и обратно за 0.6 секунды
            float v = 7f - 26f * life;
            transform.position += Vector3.up * v * Time.deltaTime;
            sr.sprite = PixelArt.Get("coin" + ((int)(life * 22f) % 4));
            if (life > 0.55f) Destroy(gameObject);
        }
    }
}
