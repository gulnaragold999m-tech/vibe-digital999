using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Движущаяся платформа. Кинематическое тело само не тащит за собой героя,
    /// поэтому платформа каждый кадр передаёт ему свой сдвиг — иначе он сползает.
    /// </summary>
    public class Platform : MonoBehaviour
    {
        bool vertical;
        Vector3 origin;
        Vector2 delta;
        Rigidbody2D rb;

        public static Platform Create(Vector3 pos, bool vertical)
        {
            var go = new GameObject(vertical ? "Платформа вверх-вниз" : "Платформа");
            go.transform.position = pos;
            var p = go.AddComponent<Platform>();
            p.vertical = vertical;
            p.Setup();
            return p;
        }

        void Setup()
        {
            origin = transform.position;

            for (int i = -1; i <= 1; i++)
            {
                var part = new GameObject("часть");
                part.transform.SetParent(transform, false);
                part.transform.localPosition = new Vector3(i, 0f, 0f);
                var s = part.AddComponent<SpriteRenderer>();
                s.sprite = PixelArt.Get("used");
                s.sortingOrder = 1;
            }

            var box = gameObject.AddComponent<BoxCollider2D>();
            box.size = new Vector2(3f, 0.9f);
            var mat = new PhysicsMaterial2D("Платформа");
            mat.friction = 0f;
            mat.bounciness = 0f;
            box.sharedMaterial = mat;

            rb = gameObject.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Kinematic;
            rb.interpolation = RigidbodyInterpolation2D.Interpolate;
        }

        void FixedUpdate()
        {
            float omega = Cfg.PlatformSpeed / Cfg.PlatformRange;
            float offset = Mathf.Sin(Time.time * omega) * Cfg.PlatformRange;
            Vector3 want = origin + (vertical ? Vector3.up : Vector3.right) * offset;
            delta = want - transform.position;
            rb.MovePosition(want);
        }

        void OnCollisionStay2D(Collision2D c)
        {
            var p = c.collider.GetComponent<Player>();
            if (p == null) return;
            if (p.transform.position.y < transform.position.y + 0.3f) return;
            p.carry += delta;
        }
    }
}
