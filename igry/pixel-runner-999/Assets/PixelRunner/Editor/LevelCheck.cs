using System.Collections.Generic;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Меню «Pixel Runner 999 → Проверить карты уровней».
    /// Карту правят руками в блокноте, и опечатку там видно не сразу:
    /// уровень просто соберётся криво. Проверка ловит это до запуска.
    /// </summary>
    public static class LevelCheck
    {
        [MenuItem("Pixel Runner 999/Проверить карты уровней")]
        public static void Run()
        {
            var report = new StringBuilder();
            bool allGood = true;

            for (int i = 1; i <= Cfg.Levels; i++)
            {
                var asset = Resources.Load<TextAsset>("urovni/uroven-" + i);
                if (asset == null)
                {
                    report.AppendLine("уровень " + i + ": файла нет в Resources/urovni/");
                    allGood = false;
                    continue;
                }

                var problems = Check(asset.text);
                if (problems.Count == 0)
                {
                    report.AppendLine("уровень " + i + ": ошибок нет");
                }
                else
                {
                    allGood = false;
                    report.AppendLine("уровень " + i + ":");
                    foreach (var p in problems) report.AppendLine("   • " + p);
                }
            }

            if (allGood) Debug.Log("Карты уровней в порядке.\n" + report);
            else Debug.LogError("В картах уровней есть ошибки:\n" + report);
        }

        static List<string> Check(string map)
        {
            var problems = new List<string>();
            var lines = new List<string>(map.Replace("\r", "").Split('\n'));
            while (lines.Count > 0 && lines[lines.Count - 1].Trim().Length == 0)
                lines.RemoveAt(lines.Count - 1);

            if (lines.Count != Cfg.LevelRows)
                problems.Add("строк " + lines.Count + ", а должно быть " + Cfg.LevelRows);

            int width = 0;
            for (int i = 0; i < lines.Count; i++) width = Mathf.Max(width, lines[i].Length);

            const string known = " XSB?Mpogk=^FCcbh";
            int flags = 0;
            for (int r = 0; r < lines.Count; r++)
            {
                for (int x = 0; x < lines[r].Length; x++)
                {
                    char ch = lines[r][x];
                    if (known.IndexOf(ch) < 0)
                        problems.Add("непонятный знак '" + ch + "' в строке " + (r + 1) + ", позиция " + (x + 1));
                    if (ch == 'F') flags++;
                }
            }

            if (flags != 1) problems.Add("флагов " + flags + ", а нужен ровно один");

            // яма шире пяти клеток непреодолима даже с разбега
            if (lines.Count == Cfg.LevelRows)
            {
                int run = 0;
                string bottom = lines[lines.Count - 1].PadRight(width);
                for (int x = 0; x < width; x++)
                {
                    if (bottom[x] == ' ')
                    {
                        run++;
                        if (run == 6) problems.Add("яма шире пяти клеток около позиции " + (x + 1));
                    }
                    else run = 0;
                }
            }

            return problems;
        }
    }
}
