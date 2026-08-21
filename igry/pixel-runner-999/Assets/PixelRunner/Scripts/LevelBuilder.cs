using System.Collections.Generic;
using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Собирает уровень из текстовой карты. Карты лежат в
    /// Assets/PixelRunner/Resources/urovni/ и правятся в любом блокноте:
    /// одна буква — одна клетка.
    ///
    ///   X земля      S камень (не разбить)   B кирпич
    ///   ? блок с монетой                     M блок с грибом
    ///   p труба      o монета                g гумба      k черепаха
    ///   = платформа вбок                     ^ платформа вверх-вниз
    ///   F флаг       C замок
    ///   c облако     b куст                  h холм
    /// </summary>
    public static class LevelBuilder
    {
        public class Built
        {
            public GameObject root;
            public int width;
            public int height;
            public Vector3 spawn;
        }

        public static Built Build(string map)
        {
            var root = new GameObject("Уровень");
            var lines = new List<string>(map.Replace("\r", "").Split('\n'));
            while (lines.Count > 0 && lines[lines.Count - 1].Trim().Length == 0) lines.RemoveAt(lines.Count - 1);

            int rows = lines.Count;
            int width = 0;
            for (int i = 0; i < rows; i++) width = Mathf.Max(width, lines[i].Length);
            for (int i = 0; i < rows; i++) lines[i] = lines[i].PadRight(width);

            var built = new Built();
            built.root = root;
            built.width = width;
            built.height = rows;
            built.spawn = new Vector3(2f, Y(rows, 12) + 0.5f, 0f);

            // --- 1. цельные куски земли и труб: один коллайдер на весь ряд подряд
            for (int r = 0; r < rows; r++)
            {
                int start = -1;
                for (int x = 0; x <= width; x++)
                {
                    bool solid = x < width && (lines[r][x] == 'X' || lines[r][x] == 'p');
                    if (solid && start < 0) start = x;
                    if (!solid && start >= 0)
                    {
                        AddRunCollider(root.transform, start, x - 1, Y(rows, r));
                        start = -1;
                    }
                }
            }

            // --- 2. всё остальное по клеткам
            for (int r = 0; r < rows; r++)
            {
                for (int x = 0; x < width; x++)
                {
                    char ch = lines[r][x];
                    float wx = x;
                    float wy = Y(rows, r);

                    switch (ch)
                    {
                        case 'X':
                            bool open = r == 0 || lines[r - 1][x] != 'X';
                            Decor(root.transform, open ? "ground_top" : "ground", wx, wy, 0);
                            break;

                        case 'p':
                            bool top = r == 0 || lines[r - 1][x] != 'p';
                            bool left = x == 0 || lines[r][x - 1] != 'p';
                            Decor(root.transform,
                                  top ? (left ? "pipe_top_l" : "pipe_top_r") : (left ? "pipe_l" : "pipe_r"),
                                  wx, wy, 0);
                            break;

                        case 'B': Attach(root.transform, Block.Create(BlockKind.Brick, new Vector3(wx, wy)).gameObject); break;
                        case '?': Attach(root.transform, Block.Create(BlockKind.Question, new Vector3(wx, wy)).gameObject); break;
                        case 'M': Attach(root.transform, Block.Create(BlockKind.MushroomBox, new Vector3(wx, wy)).gameObject); break;
                        case 'S': Attach(root.transform, Block.Create(BlockKind.Solid, new Vector3(wx, wy)).gameObject); break;

                        case 'o': Attach(root.transform, Coin.Create(new Vector3(wx, wy)).gameObject); break;
                        case 'g': Attach(root.transform, Enemy.Create(EnemyKind.Goomba, new Vector3(wx, wy)).gameObject); break;
                        case 'k': Attach(root.transform, Enemy.Create(EnemyKind.Koopa, new Vector3(wx, wy)).gameObject); break;

                        case '=': Attach(root.transform, Platform.Create(new Vector3(wx, wy), false).gameObject); break;
                        case '^': Attach(root.transform, Platform.Create(new Vector3(wx, wy), true).gameObject); break;

                        case 'c': Decor(root.transform, "cloud", wx - 0.5f, wy - 0.5f, -20); break;
                        case 'b': Decor(root.transform, "bush", wx - 0.5f, wy - 0.5f, -10); break;
                        case 'h': Decor(root.transform, "hill", wx - 0.5f, wy - 0.5f, -12); break;
                        case 'C': Decor(root.transform, "castle", wx - 0.5f, wy - 0.5f, -8); break;

                        case 'F': BuildFlag(root.transform, wx, wy); break;
                    }
                }
            }

            return built;
        }

        /// <summary>Строка карты → высота в мире. Нижняя строка это y = 0.</summary>
        static float Y(int rows, int row)
        {
            return rows - 1 - row;
        }

        static void AddRunCollider(Transform parent, int x0, int x1, float y)
        {
            var go = new GameObject("Земля");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3((x0 + x1) * 0.5f, y, 0f);
            var col = go.AddComponent<BoxCollider2D>();
            col.size = new Vector2(x1 - x0 + 1, 1f);
        }

        static void Decor(Transform parent, string sprite, float x, float y, int order)
        {
            var go = new GameObject(sprite);
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(x, y, 0f);
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = PixelArt.Get(sprite);
            sr.sortingOrder = order;
        }

        static void Attach(Transform parent, GameObject go)
        {
            go.transform.SetParent(parent, true);
        }

        static void BuildFlag(Transform parent, float x, float y)
        {
            const int height = 9;

            // основание, на нём можно стоять
            Attach(parent, Block.Create(BlockKind.Solid, new Vector3(x, y)).gameObject);

            for (int i = 1; i <= height; i++)
                Decor(parent, "pole", x, y + i, -2);

            var cloth = new GameObject("Полотнище");
            cloth.transform.SetParent(parent, false);
            cloth.transform.position = new Vector3(x + 0.55f, y + height - 0.4f, 0f);
            var sr = cloth.AddComponent<SpriteRenderer>();
            sr.sprite = PixelArt.Get("flag");
            sr.sortingOrder = -1;

            var flag = Flag.Create(new Vector3(x, y + 0.5f), height, cloth.transform);
            Attach(parent, flag.gameObject);
        }
    }
}
