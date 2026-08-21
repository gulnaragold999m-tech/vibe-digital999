using System.Collections.Generic;
using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Вся графика рисуется кодом при запуске. Ни одной картинки в проекте нет
    /// намеренно: папку Assets можно скопировать куда угодно и ничего не отвалится,
    /// а спрайт правится текстом — строчка карты вместо графического редактора.
    /// </summary>
    public static class PixelArt
    {
        static readonly Dictionary<string, Sprite> cache = new Dictionary<string, Sprite>();

        // Палитра. Буква в карте спрайта = цвет отсюда.
        static readonly Dictionary<char, Color32> palette = new Dictionary<char, Color32>
        {
            { '.', new Color32(0, 0, 0, 0) },        // прозрачный
            { 'k', new Color32(32, 26, 32, 255) },   // контур
            { 'w', new Color32(255, 255, 255, 255) },
            { 'r', new Color32(216, 48, 32, 255) },  // красный
            { 's', new Color32(252, 188, 140, 255) },// кожа
            { 'b', new Color32(24, 72, 200, 255) },  // синий комбинезон
            { 'n', new Color32(88, 48, 16, 255) },   // тёмно-коричневый
            { 'o', new Color32(188, 124, 60, 255) }, // гумба
            { 'g', new Color32(128, 208, 64, 255) }, // светло-зелёный
            { 'd', new Color32(0, 132, 40, 255) },   // тёмно-зелёный
            { 'c', new Color32(252, 232, 168, 255) },// кремовый
            { 'y', new Color32(252, 200, 40, 255) }, // жёлтый
        };

        // ------------------------------------------------------------ герой
        static readonly string[] PlayerIdle =
        {
            "....rrrrr.......",
            "...rrrrrrrrr....",
            "...nnnsssks.....",
            "..nsnssssksss...",
            "..nsnnssssksss..",
            "..nnssssssssss..",
            "....ssssssss....",
            "...rrbrrrrr.....",
            "..rrrbrrbrrr....",
            ".rrrrbbbbrrrr...",
            ".sssrbyybrsss...",
            ".ssssbbbbbssss..",
            ".ss..bbbbbb..ss.",
            "....bbb..bbb....",
            "...nnnn..nnnn...",
            "..nnnnn..nnnnn..",
        };

        static readonly string[] PlayerRun1 =
        {
            "................",
            "....rrrrr.......",
            "...rrrrrrrrr....",
            "...nnnsssks.....",
            "..nsnssssksss...",
            "..nsnnssssksss..",
            "..nnssssssssss..",
            "....ssssssss....",
            "..rrrbbbrrr.....",
            ".rrrrbbbbrrr....",
            ".sssrbbbbrss....",
            ".ss.bbbbbb......",
            "...bbbbbb.......",
            "..bbb.bbbb......",
            ".nnn...nnnnn....",
            "nnnn.....nnn....",
        };

        static readonly string[] PlayerRun2 =
        {
            "................",
            "....rrrrr.......",
            "...rrrrrrrrr....",
            "...nnnsssks.....",
            "..nsnssssksss...",
            "..nsnnssssksss..",
            "..nnssssssssss..",
            "....ssssssss....",
            "...rrbbbrr......",
            "..rrrbbbbrr.....",
            "..sssbbbbss.....",
            "...sbbbbbbs.....",
            "....bbbbbb......",
            "....bbb.bb......",
            "...nnn..nnn.....",
            "..nnnn...nnn....",
        };

        static readonly string[] PlayerJump =
        {
            "................",
            "....rrrrr.......",
            "...rrrrrrrrr....",
            "...nnnsssks.....",
            "..nsnssssksss...",
            "..nsnnssssksss..",
            "..nnssssssssss..",
            "..s.ssssssss.s..",
            ".ssrrbrrrrr.ss..",
            ".ssrrrbrrbrrss..",
            ".s.rrrbbbbrr.s..",
            "....rbbbbbr.....",
            "...bbbbbbbb.....",
            "..bbbb..bbbb....",
            "..nnn....nnn....",
            ".nnnn....nnnn...",
        };

        static readonly string[] PlayerDead =
        {
            "................",
            "....rrrrr.......",
            "...rrrrrrrrr....",
            "...nnnsksks.....",
            "..nsnssssksss...",
            "..nsnnssssksss..",
            "..nnssssssssss..",
            "....ssssssss....",
            ".s..rrbbbrr..s..",
            ".ss.rrbbbrr.ss..",
            ".sssrrbbbrrsss..",
            "..ssrrbbbrrss...",
            "....bbb.bbb.....",
            "...bbb...bbb....",
            "..nnnn...nnnn...",
            ".nnnn.....nnn...",
        };

        // ------------------------------------------------------------ враги
        static readonly string[] Goomba1 =
        {
            "................",
            "................",
            "....oooooo......",
            "...oooooooo.....",
            "..oooooooooo....",
            "..ookoooookoo...",
            "..okwoooowkoo...",
            "..okwoooowkoo...",
            "..oooooooooo....",
            "..oooooooooo....",
            "...oooooooo.....",
            "....oooooo......",
            "...nnn..nnn.....",
            "..nnnn..nnnn....",
            "..nnn....nnn....",
            "................",
        };

        static readonly string[] Goomba2 =
        {
            "................",
            "................",
            "....oooooo......",
            "...oooooooo.....",
            "..oooooooooo....",
            "..ookoooookoo...",
            "..okwoooowkoo...",
            "..okwoooowkoo...",
            "..oooooooooo....",
            "..oooooooooo....",
            "...oooooooo.....",
            "....oooooo......",
            "....nn..nn......",
            "...nnnn.nnnn....",
            "...nnn...nnn....",
            "................",
        };

        static readonly string[] GoombaFlat =
        {
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "....oooooooo....",
            "..oookoooooo....",
            "..ooowoooooo....",
            ".nnoooooooonn...",
            ".nnnnnnnnnnnn...",
        };

        static readonly string[] Koopa1 =
        {
            "................",
            ".....ggggg......",
            "....gggwgkg.....",
            "....ggwwwkg.....",
            "....ggggggg.....",
            ".....ggggg......",
            "...dddddddd.....",
            "..dcccccccd.....",
            "..dccddccdd.....",
            "..dccddccdd.....",
            "..dcccccccd.....",
            "...dddddddd.....",
            "....dddddd......",
            "....cc..cc......",
            "...cccc.cccc....",
            "...ccc...ccc....",
        };

        static readonly string[] Koopa2 =
        {
            "................",
            ".....ggggg......",
            "....gggwgkg.....",
            "....ggwwwkg.....",
            "....ggggggg.....",
            ".....ggggg......",
            "...dddddddd.....",
            "..dcccccccd.....",
            "..dccddccdd.....",
            "..dccddccdd.....",
            "..dcccccccd.....",
            "...dddddddd.....",
            "....dddddd......",
            "....cc..cc......",
            "...ccc..cccc....",
            "..cccc....cc....",
        };

        static readonly string[] Shell =
        {
            "................",
            "................",
            "................",
            "................",
            "....dddddd......",
            "..dddddddddd....",
            "..dccccccccd....",
            "..dccddddccd....",
            "..dccddddccd....",
            "..dccccccccd....",
            "..dddddddddd....",
            "...dddddddd.....",
            "....dddddd......",
            "................",
            "................",
            "................",
        };

        static readonly string[] Mushroom =
        {
            "................",
            "................",
            ".....rrrrr......",
            "...rrwwwwwrr....",
            "..rrwwwwwwwrr...",
            "..rwwrrrrrwwr...",
            ".rrwrrrrrrrwrr..",
            ".rwwrrrrrrrwwr..",
            ".rrrrrrrrrrrrr..",
            "..rrrrrrrrrrr...",
            "...ccccccccc....",
            "..cckccccckcc...",
            "..cckccccckcc...",
            "..ccccccccccc...",
            "...ccccccccc....",
            "................",
        };

        // ---------------------------------------------------------- цвета мира
        static readonly Color32 SoilDark = new Color32(120, 60, 20, 255);
        static readonly Color32 Soil = new Color32(180, 104, 40, 255);
        static readonly Color32 SoilLight = new Color32(216, 148, 80, 255);
        static readonly Color32 GrassDark = new Color32(24, 128, 32, 255);
        static readonly Color32 Grass = new Color32(80, 192, 56, 255);
        static readonly Color32 BrickDark = new Color32(120, 52, 20, 255);
        static readonly Color32 Brick = new Color32(196, 96, 40, 255);
        static readonly Color32 QDark = new Color32(180, 112, 8, 255);
        static readonly Color32 QMain = new Color32(244, 180, 24, 255);
        static readonly Color32 UsedDark = new Color32(120, 76, 24, 255);
        static readonly Color32 Used = new Color32(168, 112, 40, 255);
        static readonly Color32 StoneDark = new Color32(96, 96, 112, 255);
        static readonly Color32 Stone = new Color32(168, 168, 184, 255);
        static readonly Color32 PipeDark = new Color32(0, 96, 24, 255);
        static readonly Color32 PipeMain = new Color32(0, 168, 48, 255);
        static readonly Color32 PipeLight = new Color32(120, 224, 112, 255);
        static readonly Color32 CoinDark = new Color32(196, 140, 8, 255);
        static readonly Color32 CoinMain = new Color32(252, 208, 48, 255);
        static readonly Color32 CoinLight = new Color32(255, 248, 184, 255);
        static readonly Color32 White = new Color32(255, 255, 255, 255);
        static readonly Color32 CloudShade = new Color32(214, 226, 255, 255);
        static readonly Color32 BushDark = new Color32(24, 128, 32, 255);
        static readonly Color32 BushMain = new Color32(80, 192, 56, 255);
        static readonly Color32 CastleMain = new Color32(196, 96, 40, 255);
        static readonly Color32 CastleDark = new Color32(120, 52, 20, 255);
        static readonly Color32 Black = new Color32(32, 26, 32, 255);
        static readonly Color32 FlagRed = new Color32(228, 56, 48, 255);
        static readonly Color32 PoleGrey = new Color32(200, 208, 216, 255);

        /// <summary>Спрайт по имени. Считается один раз и запоминается.</summary>
        public static Sprite Get(string name)
        {
            Sprite s;
            if (cache.TryGetValue(name, out s)) return s;
            s = Build(name);
            cache[name] = s;
            return s;
        }

        static Sprite Build(string name)
        {
            switch (name)
            {
                case "player_idle": return FromRows(PlayerIdle);
                case "player_run1": return FromRows(PlayerRun1);
                case "player_run2": return FromRows(PlayerRun2);
                case "player_jump": return FromRows(PlayerJump);
                case "player_dead": return FromRows(PlayerDead);
                case "goomba1": return FromRows(Goomba1);
                case "goomba2": return FromRows(Goomba2);
                case "goomba_flat": return FromRows(GoombaFlat);
                case "koopa1": return FromRows(Koopa1);
                case "koopa2": return FromRows(Koopa2);
                case "shell": return FromRows(Shell);
                case "mushroom": return FromRows(Mushroom);

                case "ground": return Soil16(false);
                case "ground_top": return Soil16(true);
                case "brick": return Brick16();
                case "question": return Question16();
                case "used": return Used16();
                case "stone": return Stone16();
                case "pipe_top_l": return Pipe16(true, true);
                case "pipe_top_r": return Pipe16(true, false);
                case "pipe_l": return Pipe16(false, true);
                case "pipe_r": return Pipe16(false, false);

                case "coin0": return Coin16(5);
                case "coin1": return Coin16(3);
                case "coin2": return Coin16(1);
                case "coin3": return Coin16(3);
                case "shard": return Shard8();

                case "pole": return Pole16();
                case "flag": return Flag16();
                case "cloud": return Cloud();
                case "bush": return Bush();
                case "hill": return Hill();
                case "castle": return Castle();
            }
            Debug.LogWarning("PixelArt: неизвестный спрайт " + name);
            return FromRows(Goomba1);
        }

        // ------------------------------------------------------- инструменты
        class Buf
        {
            public readonly int w, h;
            readonly Color32[] px;

            public Buf(int w, int h)
            {
                this.w = w;
                this.h = h;
                px = new Color32[w * h];
                Color32 clear = new Color32(0, 0, 0, 0);
                for (int i = 0; i < px.Length; i++) px[i] = clear;
            }

            /// <summary>y считается сверху вниз — как в карте спрайта.</summary>
            public void Set(int x, int y, Color32 c)
            {
                if (x < 0 || y < 0 || x >= w || y >= h) return;
                px[(h - 1 - y) * w + x] = c;
            }

            public void Rect(int x0, int y0, int x1, int y1, Color32 c)
            {
                for (int y = y0; y <= y1; y++)
                    for (int x = x0; x <= x1; x++)
                        Set(x, y, c);
            }

            public void Frame(int x0, int y0, int x1, int y1, Color32 c)
            {
                for (int x = x0; x <= x1; x++) { Set(x, y0, c); Set(x, y1, c); }
                for (int y = y0; y <= y1; y++) { Set(x0, y, c); Set(x1, y, c); }
            }

            public void Disc(int cx, int cy, int rx, int ry, Color32 c)
            {
                for (int y = cy - ry; y <= cy + ry; y++)
                    for (int x = cx - rx; x <= cx + rx; x++)
                    {
                        float dx = (x - cx) / (float)Mathf.Max(1, rx);
                        float dy = (y - cy) / (float)Mathf.Max(1, ry);
                        if (dx * dx + dy * dy <= 1.05f) Set(x, y, c);
                    }
            }

            public Sprite ToSprite(Vector2 pivot)
            {
                var tex = new Texture2D(w, h, TextureFormat.RGBA32, false);
                tex.filterMode = FilterMode.Point;
                tex.wrapMode = TextureWrapMode.Clamp;
                tex.SetPixels32(px);
                tex.Apply();
                return Sprite.Create(tex, new Rect(0, 0, w, h), pivot,
                                     Cfg.PixelsPerUnit, 0, SpriteMeshType.FullRect);
            }
        }

        static Sprite FromRows(string[] rows)
        {
            int h = rows.Length;
            int w = rows[0].Length;
            var buf = new Buf(w, h);
            for (int y = 0; y < h; y++)
            {
                string row = rows[y];
                for (int x = 0; x < row.Length && x < w; x++)
                {
                    Color32 c;
                    if (palette.TryGetValue(row[x], out c) && c.a > 0) buf.Set(x, y, c);
                }
            }
            return buf.ToSprite(new Vector2(0.5f, 0.5f));
        }

        // ---------------------------------------------------------- блоки 16×16
        static Sprite Soil16(bool top)
        {
            var b = new Buf(16, 16);
            b.Rect(0, 0, 15, 15, Soil);
            // крапинки, чтобы земля не выглядела заливкой
            for (int y = 2; y < 16; y += 4)
                for (int x = 1; x < 16; x += 5)
                {
                    b.Set(x, y, SoilLight);
                    b.Set(x + 1, y + 1, SoilDark);
                }
            b.Frame(0, 0, 15, 15, SoilDark);
            if (top)
            {
                b.Rect(0, 0, 15, 3, Grass);
                b.Rect(0, 0, 15, 0, GrassDark);
                for (int x = 0; x < 16; x += 3) b.Set(x, 4, Grass);
            }
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        static Sprite Brick16()
        {
            var b = new Buf(16, 16);
            b.Rect(0, 0, 15, 15, Brick);
            b.Frame(0, 0, 15, 15, BrickDark);
            // кирпичная кладка: три ряда со сдвигом
            b.Rect(0, 4, 15, 4, BrickDark);
            b.Rect(0, 9, 15, 9, BrickDark);
            b.Rect(7, 0, 7, 3, BrickDark);
            b.Rect(3, 5, 3, 8, BrickDark);
            b.Rect(11, 5, 11, 8, BrickDark);
            b.Rect(7, 10, 7, 15, BrickDark);
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        static Sprite Question16()
        {
            var b = new Buf(16, 16);
            b.Rect(0, 0, 15, 15, QMain);
            b.Frame(0, 0, 15, 15, Black);
            b.Frame(1, 1, 14, 14, QDark);
            // заклёпки по углам
            b.Set(2, 2, White); b.Set(13, 2, White);
            b.Set(2, 13, White); b.Set(13, 13, White);
            // знак вопроса
            string[] q =
            {
                ".kkkk.",
                "kk..kk",
                "....kk",
                "..kkk.",
                "..kk..",
                "......",
                "..kk..",
            };
            for (int y = 0; y < q.Length; y++)
                for (int x = 0; x < q[y].Length; x++)
                    if (q[y][x] == 'k') b.Set(5 + x, 4 + y, Black);
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        static Sprite Used16()
        {
            var b = new Buf(16, 16);
            b.Rect(0, 0, 15, 15, Used);
            b.Frame(0, 0, 15, 15, Black);
            b.Frame(1, 1, 14, 14, UsedDark);
            b.Set(2, 2, UsedDark); b.Set(13, 2, UsedDark);
            b.Set(2, 13, UsedDark); b.Set(13, 13, UsedDark);
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        static Sprite Stone16()
        {
            var b = new Buf(16, 16);
            b.Rect(0, 0, 15, 15, Stone);
            b.Frame(0, 0, 15, 15, StoneDark);
            b.Rect(2, 2, 6, 6, StoneDark);
            b.Rect(9, 4, 13, 8, StoneDark);
            b.Rect(3, 9, 8, 13, StoneDark);
            b.Rect(11, 11, 13, 13, StoneDark);
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        static Sprite Pipe16(bool top, bool left)
        {
            var b = new Buf(16, 16);
            b.Rect(0, 0, 15, 15, PipeMain);
            if (left)
            {
                b.Rect(0, 0, 1, 15, PipeDark);
                b.Rect(2, 0, 4, 15, PipeLight);
            }
            else
            {
                b.Rect(14, 0, 15, 15, PipeDark);
                b.Rect(11, 0, 12, 15, PipeDark);
            }
            if (top)
            {
                // ободок трубы шире тела
                b.Rect(0, 0, 15, 5, PipeMain);
                b.Rect(0, 0, 15, 0, PipeDark);
                b.Rect(0, 5, 15, 5, PipeDark);
                if (left)
                {
                    b.Rect(0, 1, 0, 4, PipeDark);
                    b.Rect(1, 1, 3, 4, PipeLight);
                }
                else
                {
                    b.Rect(15, 1, 15, 4, PipeDark);
                    b.Rect(12, 1, 14, 4, PipeDark);
                }
            }
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        static Sprite Coin16(int halfWidth)
        {
            var b = new Buf(16, 16);
            b.Disc(8, 8, halfWidth + 1, 6, CoinDark);
            b.Disc(8, 8, halfWidth, 5, CoinMain);
            if (halfWidth >= 3) b.Rect(7, 5, 8, 10, CoinLight);
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        static Sprite Shard8()
        {
            var b = new Buf(8, 8);
            b.Rect(0, 0, 7, 7, Brick);
            b.Frame(0, 0, 7, 7, BrickDark);
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        static Sprite Pole16()
        {
            var b = new Buf(16, 16);
            b.Rect(7, 0, 9, 15, PoleGrey);
            b.Rect(7, 0, 7, 15, Black);
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        static Sprite Flag16()
        {
            var b = new Buf(16, 16);
            for (int y = 0; y < 10; y++)
            {
                int len = 10 - Mathf.Abs(y - 5);
                b.Rect(2, 3 + y, 2 + len, 3 + y, FlagRed);
            }
            b.Rect(1, 2, 1, 14, Black);
            return b.ToSprite(new Vector2(0.5f, 0.5f));
        }

        // ---------------------------------------------------------- фон и декор
        // Пивот у декора в левом нижнем углу: так его удобно ставить по клеткам.
        static readonly Vector2 Corner = new Vector2(0f, 0f);

        static Sprite Cloud()
        {
            var b = new Buf(48, 32);
            b.Disc(14, 18, 10, 8, White);
            b.Disc(26, 14, 12, 10, White);
            b.Disc(37, 19, 9, 7, White);
            b.Rect(8, 20, 40, 27, White);
            for (int x = 8; x <= 40; x++) b.Set(x, 27, CloudShade);
            return b.ToSprite(Corner);
        }

        static Sprite Bush()
        {
            var b = new Buf(48, 16);
            b.Disc(12, 11, 9, 7, BushMain);
            b.Disc(24, 8, 11, 8, BushMain);
            b.Disc(36, 11, 9, 7, BushMain);
            b.Rect(3, 12, 44, 15, BushMain);
            for (int x = 3; x <= 44; x++) b.Set(x, 15, BushDark);
            return b.ToSprite(Corner);
        }

        static Sprite Hill()
        {
            var b = new Buf(80, 48);
            for (int y = 0; y < 48; y++)
            {
                int half = Mathf.RoundToInt(Mathf.Lerp(4f, 39f, y / 47f));
                b.Rect(40 - half, y, 40 + half, y, BushMain);
            }
            // тень по левому краю и пара «глазков» как в старых платформерах
            for (int y = 0; y < 48; y++)
            {
                int half = Mathf.RoundToInt(Mathf.Lerp(4f, 39f, y / 47f));
                b.Set(40 - half, y, BushDark);
                b.Set(40 + half, y, BushDark);
            }
            b.Disc(30, 34, 3, 4, BushDark);
            b.Disc(48, 34, 3, 4, BushDark);
            return b.ToSprite(Corner);
        }

        static Sprite Castle()
        {
            var b = new Buf(80, 80);
            b.Rect(8, 24, 71, 79, CastleMain);
            b.Frame(8, 24, 71, 79, CastleDark);
            // зубцы
            for (int x = 8; x < 72; x += 16)
            {
                b.Rect(x, 16, x + 9, 23, CastleMain);
                b.Frame(x, 16, x + 9, 23, CastleDark);
            }
            // башня
            b.Rect(28, 0, 51, 24, CastleMain);
            b.Frame(28, 0, 51, 24, CastleDark);
            // ворота и окна
            b.Rect(32, 52, 47, 79, Black);
            b.Disc(39, 54, 8, 8, Black);
            b.Rect(16, 36, 23, 45, Black);
            b.Rect(56, 36, 63, 45, Black);
            b.Rect(36, 8, 43, 17, Black);
            // кладка
            for (int y = 30; y < 80; y += 8)
                for (int x = 10; x < 70; x += 16)
                    b.Rect(x, y, x + 1, y + 1, CastleDark);
            return b.ToSprite(Corner);
        }
    }
}
