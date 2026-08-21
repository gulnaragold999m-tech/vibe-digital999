using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Счёт, монеты, время, жизни и все экраны (заставка, пауза, конец игры).
    /// Рисуется через IMGUI: он есть в любой версии Unity и не тянет за собой
    /// ни Canvas, ни шрифты — копировать проект можно как есть.
    /// </summary>
    public class Hud : MonoBehaviour
    {
        GUIStyle small, normal, big, huge, barCenter, barRight;
        Texture2D panel;

        void MakeStyles()
        {
            if (normal != null) return;

            small = new GUIStyle(GUI.skin.label);
            small.fontSize = 17;
            small.alignment = TextAnchor.MiddleCenter;

            normal = new GUIStyle(GUI.skin.label);
            normal.fontSize = 22;
            normal.fontStyle = FontStyle.Bold;

            big = new GUIStyle(GUI.skin.label);
            big.fontSize = 40;
            big.fontStyle = FontStyle.Bold;
            big.alignment = TextAnchor.MiddleCenter;

            huge = new GUIStyle(GUI.skin.label);
            huge.fontSize = 64;
            huge.fontStyle = FontStyle.Bold;
            huge.alignment = TextAnchor.MiddleCenter;

            barCenter = new GUIStyle(normal);
            barCenter.alignment = TextAnchor.UpperCenter;

            barRight = new GUIStyle(normal);
            barRight.alignment = TextAnchor.UpperRight;

            panel = new Texture2D(1, 1);
            panel.SetPixel(0, 0, Color.white);
            panel.Apply();
        }

        void OnGUI()
        {
            MakeStyles();

            float scale = Screen.height / 720f;
            GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(scale, scale, 1f));
            float w = Screen.width / scale;
            float h = 720f;

            var game = Game.Instance;
            if (game == null) return;

            if (game.state != Game.State.Title) DrawBar(game, w);

            switch (game.state)
            {
                case Game.State.Title: DrawTitle(w, h); break;
                case Game.State.Paused: DrawPause(w, h); break;
                case Game.State.Complete: DrawComplete(game, w, h); break;
                case Game.State.GameOver: DrawGameOver(game, w, h); break;
                case Game.State.Won: DrawWon(game, w, h); break;
                default:
                    if (game.intro > 0f)
                        Shadowed(new Rect(0f, h * 0.34f, w, 60f),
                                 "УРОВЕНЬ " + (game.level + 1), big, Color.white);
                    break;
            }
        }

        // ------------------------------------------------------------ верх экрана
        void DrawBar(Game game, float w)
        {
            Fill(new Rect(0f, 0f, w, 46f), new Color(0f, 0f, 0f, 0.45f));

            Shadowed(new Rect(24f, 10f, 260f, 30f),
                     "ОЧКИ  " + game.score.ToString("000000"), normal, Color.white);

            Shadowed(new Rect(300f, 10f, 200f, 30f),
                     "МОНЕТЫ  " + game.coins.ToString("00"), normal, new Color32(252, 208, 48, 255));

            Shadowed(new Rect(0f, 10f, w, 30f), "УРОВЕНЬ " + (game.level + 1) + " из " + Cfg.Levels,
                     barCenter, Color.white);

            Color timeColor = game.timeLeft < 60f ? new Color32(255, 96, 80, 255) : Color.white;
            Shadowed(new Rect(0f, 10f, w - 24f, 30f),
                     "ЖИЗНИ  " + Mathf.Max(0, game.lives) + "        ВРЕМЯ  " + Mathf.CeilToInt(game.timeLeft),
                     barRight, timeColor);
        }

        // ------------------------------------------------------------ экраны
        void DrawTitle(float w, float h)
        {
            Fill(new Rect(0f, 0f, w, h), new Color(0f, 0f, 0f, 0.35f));
            Shadowed(new Rect(0f, h * 0.16f, w, 80f), "PIXEL RUNNER 999", huge, new Color32(252, 208, 48, 255));
            Shadowed(new Rect(0f, h * 0.30f, w, 40f), "платформер студии Vibe Digital 999", big, Color.white);

            string help =
                "← →  или  A D  —  бежать\n" +
                "ПРОБЕЛ  —  прыжок, чем дольше держите, тем выше\n" +
                "SHIFT  —  ускорение,  прыжок с разбега длиннее\n" +
                "прыгните врагу на голову — и его нет\n" +
                "P — пауза,   M — музыка,   R — начать заново";
            Shadowed(new Rect(0f, h * 0.44f, w, 200f), help, small, new Color32(220, 230, 245, 255));

            bool blink = ((int)(Time.unscaledTime * 2f) % 2) == 0;
            if (blink)
                Shadowed(new Rect(0f, h * 0.78f, w, 50f), "НАЖМИТЕ ПРОБЕЛ", big, Color.white);
        }

        void DrawPause(float w, float h)
        {
            Fill(new Rect(0f, 0f, w, h), new Color(0f, 0f, 0f, 0.55f));
            Shadowed(new Rect(0f, h * 0.38f, w, 70f), "ПАУЗА", huge, Color.white);
            Shadowed(new Rect(0f, h * 0.55f, w, 40f), "P — продолжить,   R — начать заново", big, Color.white);
        }

        void DrawComplete(Game game, float w, float h)
        {
            Fill(new Rect(0f, 0f, w, h), new Color(0f, 0f, 0f, 0.35f));
            Shadowed(new Rect(0f, h * 0.36f, w, 70f), "УРОВЕНЬ ПРОЙДЕН", huge, new Color32(252, 208, 48, 255));
            Shadowed(new Rect(0f, h * 0.52f, w, 40f), "очков: " + game.score, big, Color.white);
        }

        void DrawGameOver(Game game, float w, float h)
        {
            Fill(new Rect(0f, 0f, w, h), new Color(0f, 0f, 0f, 0.6f));
            Shadowed(new Rect(0f, h * 0.34f, w, 70f), "ИГРА ОКОНЧЕНА", huge, new Color32(255, 96, 80, 255));
            Shadowed(new Rect(0f, h * 0.50f, w, 40f), "очков: " + game.score + ",   монет: " + game.coins, big, Color.white);
            Shadowed(new Rect(0f, h * 0.66f, w, 40f), "ПРОБЕЛ — сыграть ещё раз", big, Color.white);
        }

        void DrawWon(Game game, float w, float h)
        {
            Fill(new Rect(0f, 0f, w, h), new Color(0f, 0f, 0f, 0.5f));
            Shadowed(new Rect(0f, h * 0.28f, w, 80f), "ПОБЕДА!", huge, new Color32(252, 208, 48, 255));
            Shadowed(new Rect(0f, h * 0.44f, w, 40f), "все " + Cfg.Levels + " уровня пройдены", big, Color.white);
            Shadowed(new Rect(0f, h * 0.56f, w, 40f), "очков: " + game.score + ",   монет: " + game.coins, big, Color.white);
            Shadowed(new Rect(0f, h * 0.72f, w, 40f), "ПРОБЕЛ — сыграть ещё раз", big, Color.white);
        }

        // ------------------------------------------------------------ мелочи
        void Fill(Rect r, Color c)
        {
            Color old = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(r, panel);
            GUI.color = old;
        }

        /// <summary>Текст с тенью — иначе белое по небу не читается.</summary>
        void Shadowed(Rect r, string text, GUIStyle style, Color color)
        {
            Color old = style.normal.textColor;
            style.normal.textColor = new Color(0f, 0f, 0f, 0.75f);
            GUI.Label(new Rect(r.x + 2f, r.y + 2f, r.width, r.height), text, style);
            style.normal.textColor = color;
            GUI.Label(r, text, style);
            style.normal.textColor = old;
        }
    }
}
