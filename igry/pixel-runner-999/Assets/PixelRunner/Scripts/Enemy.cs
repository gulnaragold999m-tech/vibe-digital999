using UnityEngine;

namespace PixelRunner
{
    public enum EnemyKind { Goomba, Koopa }

    /// <summary>
    /// Враги. Гумба гибнет от прыжка на голову, черепаха прячется в панцирь,
    /// а пнутый панцирь едет дальше и сносит всех по пути — включая хозяина,
    /// если он подвернётся.
    /// </summary>
    public class Enemy : MonoBehaviour
    {
        public EnemyKind kind = EnemyKind.Goomba;

        Rigidbody2D rb;
        BoxCollider2D box;
        SpriteRenderer sr;

        int dir = -1;
        bool woke;
        bool dying;
        bool shell;
        bool shellMoving;
        float animTime;
        float noTouch;      // короткая неуязвимость после пинка панциря

        public static Enemy Create(EnemyKind kind, Vector3 pos)
        {
            var go = new GameObject(kind == EnemyKind.Goomba ? "Гумба" : "Черепаха");
            go.transform.position = pos;
            var e = go.AddComponent<Enemy>();
            e.kind = kind;
            e.Setup();
            return e;
        }

        void Setup()
        {
            gameObject.layer = Cfg.EnemyLayer;

            sr = gameObject.AddComponent<SpriteRenderer>();
            sr.sortingOrder = 5;
            sr.sprite = PixelArt.Get(kind == EnemyKind.Goomba ? "goomba1" : "koopa1");

            rb = gameObject.AddComponent<Rigidbody2D>();
            rb.gravityScale = 3.2f;
            rb.freezeRotation = true;
            rb.interpolation = RigidbodyInterpolation2D.Interpolate;

            box = gameObject.AddComponent<BoxCollider2D>();
            if (kind == EnemyKind.Goomba)
            {
                box.size = new Vector2(0.68f, 0.72f);
                box.offset = new Vector2(0f, -0.10f);
            }
            else
            {
                box.size = new Vector2(0.62f, 0.86f);
                box.offset = new Vector2(0f, -0.04f);
            }
            var mat = new PhysicsMaterial2D("Враг");
            mat.friction = 0f;
            mat.bounciness = 0f;
            box.sharedMaterial = mat;
        }

        void Update()
        {
            if (noTouch > 0f) noTouch -= Time.deltaTime;
            if (dying) return;

            if (transform.position.y < Cfg.DeathLine - 2f)
            {
                Destroy(gameObject);
                return;
            }

            if (!woke) return;

            if (shell)
            {
                sr.sprite = PixelArt.Get("shell");
            }
            else
            {
                animTime += Time.deltaTime * 6f;
                bool second = ((int)animTime % 2) == 1;
                sr.sprite = PixelArt.Get(kind == EnemyKind.Goomba
                    ? (second ? "goomba2" : "goomba1")
                    : (second ? "koopa2" : "koopa1"));
                sr.flipX = dir > 0;
            }
        }

        void FixedUpdate()
        {
            if (dying) return;

            if (!woke)
            {
                var p = Player.Instance;
                if (p == null) return;
                if (Mathf.Abs(p.transform.position.x - transform.position.x) > Cfg.WakeDistance) return;
                woke = true;
            }

            float speed;
            if (shell) speed = shellMoving ? Cfg.ShellSpeed : 0f;
            else speed = kind == EnemyKind.Goomba ? Cfg.GoombaSpeed : Cfg.KoopaSpeed;

            if (speed > 0f && WallAhead()) dir = -dir;

            Vector2 v = rb.Vel();
            v.x = dir * speed;
            rb.SetVel(v);
        }

        bool WallAhead()
        {
            float s = 0.5f * box.size.x + 0.08f;
            Vector2 center = (Vector2)transform.position + box.offset + new Vector2(dir * s, 0f);
            Vector2 size = new Vector2(0.1f, box.size.y * 0.7f);
            int mask = ~(1 << Cfg.PlayerLayer);
            var hits = Physics2D.OverlapBoxAll(center, size, 0f, mask);
            for (int i = 0; i < hits.Length; i++)
            {
                if (hits[i] == box) continue;
                if (hits[i].isTrigger) continue;
                return true;
            }
            return false;
        }

        void OnCollisionEnter2D(Collision2D c) { Touch(c.collider); }
        void OnCollisionStay2D(Collision2D c) { Touch(c.collider); }

        void Touch(Collider2D other)
        {
            if (dying) return;

            var enemy = other.GetComponent<Enemy>();
            if (enemy != null)
            {
                if (shell && shellMoving && !enemy.dying) enemy.KilledFromSide(dir);
                else if (!shell && !enemy.shellMoving) dir = -dir;
                return;
            }

            var p = other.GetComponent<Player>();
            if (p == null || p.IsDead || noTouch > 0f) return;

            float dy = p.transform.position.y - transform.position.y;
            bool fromAbove = dy > 0.42f && p.Velocity.y < 1.5f;

            if (fromAbove) Stomped(p);
            else if (shell && !shellMoving) Kick(p);
            else p.Hit();
        }

        void Stomped(Player p)
        {
            p.Bounce();
            Sfx.Play("stomp");

            if (kind == EnemyKind.Goomba)
            {
                Flatten();
                Game.Instance.AddScore(100);
                return;
            }

            if (!shell)
            {
                shell = true;
                shellMoving = false;
                box.size = new Vector2(0.7f, 0.56f);
                box.offset = new Vector2(0f, -0.18f);
                sr.sprite = PixelArt.Get("shell");
                Game.Instance.AddScore(100);
            }
            else if (shellMoving)
            {
                shellMoving = false;   // едущий панцирь можно остановить сверху
            }
        }

        void Kick(Player p)
        {
            shellMoving = true;
            dir = transform.position.x < p.transform.position.x ? -1 : 1;
            noTouch = 0.25f;
            Sfx.Play("kick");
            Game.Instance.AddScore(200);
        }

        /// <summary>Снесло панцирем или ударом блока снизу.</summary>
        public void KilledFromSide(int fromDir)
        {
            if (dying) return;
            dying = true;
            Sfx.Play("kick");
            Game.Instance.AddScore(200);
            box.enabled = false;
            sr.flipY = true;
            sr.sortingOrder = 4;
            rb.gravityScale = 3.2f;
            rb.SetVel(fromDir * 3f, 9f);
            Destroy(gameObject, 2.5f);
        }

        void Flatten()
        {
            dying = true;
            sr.sprite = PixelArt.Get("goomba_flat");
            box.enabled = false;
            // менять bodyType или simulated прямо внутри обработчика столкновения
            // рискованно, поэтому просто отключаем движение
            rb.gravityScale = 0f;
            rb.SetVel(0f, 0f);
            Destroy(gameObject, 0.5f);
        }
    }
}
