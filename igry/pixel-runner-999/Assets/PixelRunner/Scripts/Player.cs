using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Герой. Управление сделано «как в платформерах»: прыжок прощает опоздание
    /// на пару кадров (coyote), нажатие запоминается заранее (buffer), высота
    /// прыжка зависит от того, как долго держат кнопку.
    /// </summary>
    public class Player : MonoBehaviour
    {
        public static Player Instance;

        Rigidbody2D rb;
        BoxCollider2D box;
        SpriteRenderer sr;

        bool big;
        bool dead;
        bool victory;
        bool holdingJump;
        float coyote, buffer, invincible, animTime, victoryRun;
        int facing = 1;

        /// <summary>Сдвиг, который передала движущаяся платформа за этот кадр.</summary>
        [System.NonSerialized] public Vector2 carry;

        public bool IsDead { get { return dead; } }
        public bool IsBig { get { return big; } }
        public bool IsInvincible { get { return invincible > 0f; } }
        public Vector2 Velocity { get { return rb.Vel(); } }

        public static Player Create(Vector3 pos)
        {
            var go = new GameObject("Игрок");
            go.transform.position = pos;
            return go.AddComponent<Player>();
        }

        void Awake()
        {
            Instance = this;
            gameObject.layer = Cfg.PlayerLayer;

            sr = gameObject.AddComponent<SpriteRenderer>();
            sr.sprite = PixelArt.Get("player_idle");
            sr.sortingOrder = 6;

            rb = gameObject.AddComponent<Rigidbody2D>();
            rb.gravityScale = Cfg.Gravity;
            rb.freezeRotation = true;
            rb.interpolation = RigidbodyInterpolation2D.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;

            box = gameObject.AddComponent<BoxCollider2D>();
            box.size = new Vector2(0.62f, 0.94f);
            box.offset = new Vector2(0f, -0.02f);
            // без трения, иначе герой залипает на стенах и «спотыкается» о швы
            var mat = new PhysicsMaterial2D("Скользкий");
            mat.friction = 0f;
            mat.bounciness = 0f;
            box.sharedMaterial = mat;
        }

        void Update()
        {
            if (carry != Vector2.zero)
            {
                transform.position += (Vector3)carry;
                carry = Vector2.zero;
            }

            if (dead) return;

            if (invincible > 0f)
            {
                invincible -= Time.deltaTime;
                sr.enabled = ((int)(Time.time * 14f) % 2) == 0;
                if (invincible <= 0f)
                {
                    sr.enabled = true;
                    Game.EnemyCollisions(true);
                }
            }

            if (!victory)
            {
                if (Controls.JumpPressed) buffer = Cfg.JumpBuffer;
                if (holdingJump && !Controls.JumpHeld) holdingJump = false;
            }

            // после флага герой добегает до замка и останавливается,
            // иначе он ушёл бы за край уровня и «утонул» на радостях
            if (victory && victoryRun > 0f) victoryRun -= Time.deltaTime;

            if (!victory && transform.position.y < Cfg.DeathLine) Die(false);

            Animate();
        }

        void FixedUpdate()
        {
            if (dead) return;

            float dt = Time.fixedDeltaTime;
            Vector2 v = rb.Vel();
            bool grounded = Grounded();

            float input = victory ? (victoryRun > 0f ? 1f : 0f) : Controls.Horizontal;
            bool running = !victory && Controls.Run;
            float target = input * (running ? Cfg.RunSpeed : Cfg.WalkSpeed);

            float rate;
            if (Mathf.Abs(target) < 0.01f) rate = Cfg.Decel;
            else if (Mathf.Abs(v.x) > 0.2f && Mathf.Sign(target) != Mathf.Sign(v.x)) rate = Cfg.SkidAccel;
            else rate = Cfg.Accel;
            if (!grounded) rate *= Cfg.AirControl;

            v.x = Mathf.MoveTowards(v.x, target, rate * dt);

            if (grounded)
            {
                coyote = Cfg.CoyoteTime;
                if (v.y < 0f) v.y = -1f;   // прижимаемся, чтобы не «дребезжать» на швах
            }
            else coyote -= dt;

            if (buffer > 0f) buffer -= dt;

            if (!victory && buffer > 0f && coyote > 0f)
            {
                v.y = Cfg.JumpVelocity + Mathf.Abs(v.x) * Cfg.RunJumpBonus;
                buffer = 0f;
                coyote = 0f;
                holdingJump = true;
                Sfx.Play("jump", 0.6f);
            }

            // отпустил кнопку на подъёме — прыжок укорачивается
            if (!holdingJump && v.y > 0f && !grounded) v.y *= 1f - (1f - Cfg.CutJump) * dt * 12f;
            if (v.y < -Cfg.MaxFallSpeed) v.y = -Cfg.MaxFallSpeed;

            rb.SetVel(v);

            if (Mathf.Abs(input) > 0.1f) facing = input > 0f ? 1 : -1;
        }

        bool Grounded()
        {
            float s = transform.localScale.x;
            Vector2 center = (Vector2)transform.position + box.offset * s;
            center.y -= box.size.y * s * 0.5f;
            Vector2 size = new Vector2(box.size.x * s * 0.9f, 0.14f);
            int mask = ~((1 << Cfg.PlayerLayer) | (1 << Cfg.EnemyLayer));
            return Physics2D.OverlapBox(center, size, 0f, mask) != null;
        }

        void Animate()
        {
            Vector2 v = rb.Vel();
            if (victory)
            {
                if (victoryRun > 0f)
                {
                    animTime += Time.deltaTime * 12f;
                    sr.sprite = PixelArt.Get(((int)animTime % 2) == 0 ? "player_run1" : "player_run2");
                }
                else sr.sprite = PixelArt.Get("player_idle");
                sr.flipX = false;
                return;
            }

            if (!Grounded())
            {
                sr.sprite = PixelArt.Get("player_jump");
            }
            else if (Mathf.Abs(v.x) > 0.3f)
            {
                animTime += Time.deltaTime * (4f + Mathf.Abs(v.x) * 1.4f);
                sr.sprite = PixelArt.Get(((int)animTime % 2) == 0 ? "player_run1" : "player_run2");
            }
            else
            {
                animTime = 0f;
                sr.sprite = PixelArt.Get("player_idle");
            }
            sr.flipX = facing < 0;
        }

        // ------------------------------------------------------------ события
        public void Bounce()
        {
            Vector2 v = rb.Vel();
            v.y = Controls.JumpHeld ? Cfg.StompBounce * 1.25f : Cfg.StompBounce;
            rb.SetVel(v);
            holdingJump = false;
        }

        public void Grow()
        {
            Sfx.Play("power");
            if (big)
            {
                Game.Instance.AddScore(1000);
                return;
            }
            big = true;
            transform.localScale = Vector3.one * 1.45f;
            transform.position += Vector3.up * 0.26f;
            Game.Instance.AddScore(1000);
        }

        /// <summary>Урон. Большой герой становится маленьким, маленький погибает.</summary>
        public void Hit()
        {
            if (dead || invincible > 0f || victory) return;
            if (big)
            {
                big = false;
                transform.localScale = Vector3.one;
                invincible = 2f;
                Game.EnemyCollisions(false);
                Sfx.Play("hurt");
            }
            else Die(true);
        }

        public void Die(bool animated)
        {
            if (dead) return;
            dead = true;
            victory = false;
            Sfx.MusicStop();
            Sfx.Play("die");
            box.enabled = false;
            sr.enabled = true;
            sr.sprite = PixelArt.Get("player_dead");
            sr.sortingOrder = 20;
            rb.SetVel(0f, animated ? 14f : 0f);
            rb.gravityScale = Cfg.Gravity;
            Invoke("Finish", animated ? 2.2f : 1.0f);
        }

        void Finish()
        {
            if (Game.Instance != null) Game.Instance.PlayerDied();
        }

        /// <summary>Флаг взят: герой сам добегает до замка.</summary>
        public void Victory()
        {
            if (victory || dead) return;
            victory = true;
            victoryRun = 1.9f;
            invincible = 0f;
            sr.enabled = true;
            Game.EnemyCollisions(true);
        }
    }
}
