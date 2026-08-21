using System.Collections;
using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Гриб. Сначала медленно выезжает из блока (в это время он ни с чем
    /// не сталкивается и рисуется позади блока), потом идёт сам.
    /// </summary>
    public class Mushroom : MonoBehaviour
    {
        Rigidbody2D rb;
        BoxCollider2D box;
        SpriteRenderer sr;
        int dir = 1;
        bool walking;

        public static Mushroom Create(Vector3 pos)
        {
            var go = new GameObject("Гриб");
            go.transform.position = pos;
            return go.AddComponent<Mushroom>();
        }

        void Awake()
        {
            sr = gameObject.AddComponent<SpriteRenderer>();
            sr.sprite = PixelArt.Get("mushroom");
            sr.sortingOrder = 0;      // пока вылезает — за блоком

            rb = gameObject.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Kinematic;
            rb.freezeRotation = true;
            rb.gravityScale = 3.2f;

            box = gameObject.AddComponent<BoxCollider2D>();
            box.size = new Vector2(0.8f, 0.7f);
            box.offset = new Vector2(0f, -0.1f);
            box.enabled = false;
            var mat = new PhysicsMaterial2D("Гриб");
            mat.friction = 0f;
            mat.bounciness = 0f;
            box.sharedMaterial = mat;

            StartCoroutine(Emerge());
        }

        IEnumerator Emerge()
        {
            Sfx.Play("power", 0.5f);
            float t = 0f;
            while (t < 0.55f)
            {
                t += Time.deltaTime;
                transform.position += Vector3.up * (1f / 0.55f) * Time.deltaTime;
                yield return null;
            }
            sr.sortingOrder = 4;
            box.enabled = true;
            rb.bodyType = RigidbodyType2D.Dynamic;
            walking = true;
        }

        void Update()
        {
            if (transform.position.y < Cfg.DeathLine) Destroy(gameObject);
        }

        void FixedUpdate()
        {
            if (!walking) return;
            if (WallAhead()) dir = -dir;
            Vector2 v = rb.Vel();
            v.x = dir * Cfg.MushroomSpeed;
            rb.SetVel(v);
        }

        bool WallAhead()
        {
            Vector2 center = (Vector2)transform.position + box.offset + new Vector2(dir * 0.48f, 0f);
            var hits = Physics2D.OverlapBoxAll(center, new Vector2(0.1f, 0.5f), 0f, ~(1 << Cfg.PlayerLayer));
            for (int i = 0; i < hits.Length; i++)
            {
                if (hits[i] == box || hits[i].isTrigger) continue;
                return true;
            }
            return false;
        }

        void OnCollisionEnter2D(Collision2D c)
        {
            var p = c.collider.GetComponent<Player>();
            if (p == null || p.IsDead) return;
            p.Grow();
            Destroy(gameObject);
        }
    }
}
