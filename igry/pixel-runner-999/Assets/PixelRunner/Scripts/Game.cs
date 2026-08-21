using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Ведущий игры: состояния, жизни, очки, время, загрузка уровней.
    /// Создаётся сам при запуске сцены — см. Bootstrap.
    /// </summary>
    public class Game : MonoBehaviour
    {
        public enum State { Title, Playing, Paused, Complete, GameOver, Won }

        public static Game Instance;

        public State state = State.Title;
        public int score;
        public int coins;
        public int lives = Cfg.StartLives;
        public int level;            // 0, 1, 2
        public float timeLeft;
        public float intro;          // сколько ещё показывать заставку уровня

        LevelBuilder.Built current;
        CameraFollow follow;

        void Awake()
        {
            Instance = this;
            Application.targetFrameRate = 60;
            Physics2D.queriesHitTriggers = false;
            EnemyCollisions(true);

            Sfx.Init();
            SetupCamera();
            gameObject.AddComponent<Hud>();
        }

        void SetupCamera()
        {
            Camera cam = Camera.main;
            if (cam == null)
            {
                var go = new GameObject("Main Camera");
                go.tag = "MainCamera";
                cam = go.AddComponent<Camera>();
            }
            cam.orthographic = true;
            cam.orthographicSize = Cfg.CameraSize;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color32(92, 148, 252, 255);   // небо
            cam.transform.position = new Vector3(0f, Cfg.CameraSize, -10f);

            follow = cam.GetComponent<CameraFollow>();
            if (follow == null) follow = cam.gameObject.AddComponent<CameraFollow>();
        }

        void Update()
        {
            if (Controls.MusicPressed) Sfx.ToggleMusic();

            switch (state)
            {
                case State.Title:
                    if (Controls.StartPressed) StartGame();
                    break;

                case State.Playing:
                    if (Controls.PausePressed) SetPaused(true);
                    if (intro > 0f) intro -= Time.deltaTime;
                    if (Player.Instance != null && !Player.Instance.IsDead)
                    {
                        timeLeft -= Time.deltaTime;
                        if (timeLeft <= 0f)
                        {
                            timeLeft = 0f;
                            Player.Instance.Die(false);
                        }
                    }
                    break;

                case State.Paused:
                    if (Controls.PausePressed) SetPaused(false);
                    if (Controls.RestartPressed) { SetPaused(false); StartGame(); }
                    break;

                case State.GameOver:
                case State.Won:
                    if (Controls.StartPressed || Controls.RestartPressed) StartGame();
                    break;
            }
        }

        // ------------------------------------------------------------- ход игры
        public void StartGame()
        {
            score = 0;
            coins = 0;
            lives = Cfg.StartLives;
            level = 0;
            Sfx.Play("start");
            LoadLevel();
        }

        void LoadLevel()
        {
            CancelInvoke();
            Time.timeScale = 1f;
            EnemyCollisions(true);

            if (current != null && current.root != null) Destroy(current.root);
            if (Player.Instance != null) Destroy(Player.Instance.gameObject);

            current = LevelBuilder.Build(LevelText(level));

            var player = Player.Create(current.spawn);
            follow.target = player.transform;

            float half = Cfg.CameraSize * Mathf.Max(1f, (float)Screen.width / Mathf.Max(1, Screen.height));
            follow.minX = half - 0.5f;
            follow.maxX = Mathf.Max(follow.minX, current.width - half - 0.5f);
            follow.minY = Cfg.CameraSize - 0.5f;
            follow.maxY = Mathf.Max(follow.minY, current.height - 0.5f - Cfg.CameraSize);
            follow.Snap();

            timeLeft = Cfg.LevelTime;
            intro = 1.6f;
            state = State.Playing;
            Sfx.MusicPlay();
        }

        static string LevelText(int index)
        {
            var asset = Resources.Load<TextAsset>("urovni/uroven-" + (index + 1));
            if (asset != null) return asset.text;

            Debug.LogWarning("Не нашёл карту уровня " + (index + 1) + ", собираю запасную.");
            var rows = new string[Cfg.LevelRows];
            for (int r = 0; r < Cfg.LevelRows; r++)
                rows[r] = r >= 13 ? new string('X', 60) : new string(' ', 60);
            var chars = rows[12].ToCharArray();
            chars[40] = 'F';
            rows[12] = new string(chars);
            return string.Join("\n", rows);
        }

        /// <summary>Вызывает герой, когда доиграл смерть.</summary>
        public void PlayerDied()
        {
            lives--;
            if (lives <= 0)
            {
                state = State.GameOver;
                Sfx.MusicStop();
                Sfx.Play("gameover");
            }
            else LoadLevel();
        }

        public void LevelComplete()
        {
            if (state != State.Playing) return;
            state = State.Complete;
            score += Mathf.RoundToInt(timeLeft) * 50;   // за оставшееся время
            Invoke("NextLevel", 4f);
        }

        void NextLevel()
        {
            level++;
            if (level >= Cfg.Levels)
            {
                state = State.Won;
                Sfx.MusicStop();
                Sfx.Play("flag");
            }
            else LoadLevel();
        }

        void SetPaused(bool paused)
        {
            state = paused ? State.Paused : State.Playing;
            Time.timeScale = paused ? 0f : 1f;
            Sfx.MusicPause(paused);
            Sfx.Play("pause", 0.6f);
        }

        // ------------------------------------------------------------- счёт
        public void AddScore(int value)
        {
            score += value;
        }

        public void AddCoin()
        {
            coins++;
            score += 200;
            Sfx.Play("coin", 0.7f);
            if (coins % 100 == 0)
            {
                lives++;
                Sfx.Play("life");
            }
        }

        /// <summary>
        /// Столкновения героя с врагами. Выключаются на время неуязвимости,
        /// иначе он гибнет второй раз, не успев отойти.
        /// </summary>
        public static void EnemyCollisions(bool on)
        {
            Physics2D.IgnoreLayerCollision(Cfg.PlayerLayer, Cfg.EnemyLayer, !on);
        }
    }
}
