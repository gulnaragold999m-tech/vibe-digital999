using System.Collections;
using UnityEngine;

namespace PixelRunner
{
    public enum BlockKind { Brick, Question, MushroomBox, Solid }

    /// <summary>
    /// Блок, который бьют головой снизу. Кирпич разбивается только большим
    /// героем, «?» отдаёт монету или гриб и после этого становится пустым.
    /// Враг, стоявший на блоке в момент удара, улетает.
    /// </summary>
    public class Block : MonoBehaviour
    {
        public BlockKind kind = BlockKind.Brick;

        SpriteRenderer sr;
        BoxCollider2D box;
        bool used;
        bool busy;

        public static Block Create(BlockKind kind, Vector3 pos)
        {
            var go = new GameObject("Блок");
            go.transform.position = pos;
            var b = go.AddComponent<Block>();
            b.kind = kind;
            b.Setup();
            return b;
        }

        void Setup()
        {
            sr = gameObject.AddComponent<SpriteRenderer>();
            sr.sortingOrder = 1;
            sr.sprite = PixelArt.Get(SpriteName());

            box = gameObject.AddComponent<BoxCollider2D>();
            box.size = Vector2.one;

            // кинематическое тело нужно, чтобы блок мог дёрнуться от удара
            var rb = gameObject.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Kinematic;
            rb.simulated = true;
        }

        string SpriteName()
        {
            switch (kind)
            {
                case BlockKind.Brick: return "brick";
                case BlockKind.Question: return "question";
                case BlockKind.MushroomBox: return "question";
                default: return "stone";
            }
        }

        void OnCollisionEnter2D(Collision2D c)
        {
            var p = c.collider.GetComponent<Player>();
            if (p == null || p.IsDead) return;

            // удар засчитывается, только если герой пришёл снизу
            float dy = p.transform.position.y - transform.position.y;
            float dx = Mathf.Abs(p.transform.position.x - transform.position.x);
            if (dy > -0.45f || dx > 0.6f) return;

            Hit(p);
        }

        void Hit(Player p)
        {
            if (busy) return;

            if (kind == BlockKind.Solid || used)
            {
                Sfx.Play("bump", 0.7f);
                StartCoroutine(Nudge());
                return;
            }

            KillEnemiesOnTop();

            switch (kind)
            {
                case BlockKind.Brick:
                    if (p.IsBig) Shatter();
                    else
                    {
                        Sfx.Play("bump", 0.7f);
                        StartCoroutine(Nudge());
                    }
                    break;

                case BlockKind.Question:
                    used = true;
                    sr.sprite = PixelArt.Get("used");
                    CoinPop.Create(transform.position + Vector3.up);
                    Game.Instance.AddCoin();
                    StartCoroutine(Nudge());
                    break;

                case BlockKind.MushroomBox:
                    used = true;
                    sr.sprite = PixelArt.Get("used");
                    Mushroom.Create(transform.position + Vector3.up * 0.1f);
                    StartCoroutine(Nudge());
                    break;
            }
        }

        /// <summary>Кто стоял сверху — улетает.</summary>
        void KillEnemiesOnTop()
        {
            var hits = Physics2D.OverlapBoxAll(
                (Vector2)transform.position + Vector2.up * 0.9f,
                new Vector2(0.9f, 0.7f), 0f, 1 << Cfg.EnemyLayer);
            for (int i = 0; i < hits.Length; i++)
            {
                var e = hits[i].GetComponent<Enemy>();
                if (e != null) e.KilledFromSide(1);
            }
        }

        IEnumerator Nudge()
        {
            busy = true;
            Vector3 start = transform.position;
            float t = 0f;
            while (t < 0.16f)
            {
                t += Time.deltaTime;
                float k = Mathf.Sin(Mathf.Clamp01(t / 0.16f) * Mathf.PI);
                transform.position = start + Vector3.up * k * 0.28f;
                yield return null;
            }
            transform.position = start;
            busy = false;
        }

        void Shatter()
        {
            Sfx.Play("break");
            Game.Instance.AddScore(50);

            Vector2[] push =
            {
                new Vector2(-2.5f, 9f), new Vector2(2.5f, 9f),
                new Vector2(-3.5f, 5f), new Vector2(3.5f, 5f),
            };
            for (int i = 0; i < push.Length; i++)
            {
                var go = new GameObject("Осколок");
                go.transform.position = transform.position;
                var s = go.AddComponent<SpriteRenderer>();
                s.sprite = PixelArt.Get("shard");
                s.sortingOrder = 7;
                var r = go.AddComponent<Rigidbody2D>();
                r.gravityScale = 3.5f;
                r.SetVel(push[i]);
                Destroy(go, 1.6f);
            }
            Destroy(gameObject);
        }
    }
}
