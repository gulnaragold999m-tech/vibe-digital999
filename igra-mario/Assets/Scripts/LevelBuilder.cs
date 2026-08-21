using UnityEngine;

// Собирает уровень из букв (см. LevelData) в объекты сцены.
//
// Ничего не кэшируем и не переиспользуем: уровень строится заново
// при каждой смерти. Это дороже, но исключает целый класс ошибок,
// когда после перезапуска остаётся разбитый кирпич или съеденная монета.
public static class LevelBuilder
{
    public struct Info
    {
        public Transform Koren;
        public Vector3 Start;
        public float Shirina;
        public float Vysota;
    }

    public static Info Postroit(string[] karta, string imya)
    {
        var koren = new GameObject(imya).transform;

        int vysota = karta.Length;
        int shirina = 0;
        for (int i = 0; i < vysota; i++) if (karta[i].Length > shirina) shirina = karta[i].Length;

        // Кривая карта — самая обидная ошибка: игра запускается, но
        // половина уровня уезжает. Поэтому ругаемся вслух и сразу.
        for (int i = 0; i < vysota; i++)
            if (karta[i].Length != shirina)
                Debug.LogWarning(string.Format(
                    "Уровень {0}: строка {1} длиной {2}, а должна быть {3}. Карта поедет.",
                    imya, i, karta[i].Length, shirina));

        var info = new Info
        {
            Koren = koren,
            Shirina = shirina,
            Vysota = vysota,
            Start = new Vector3(3f, 3f, 0f)
        };

        for (int row = 0; row < vysota; row++)
        {
            string stroka = karta[row];
            for (int col = 0; col < stroka.Length; col++)
            {
                char c = stroka[col];
                if (c == '.') continue;

                // Верхняя строка массива — верх экрана, поэтому переворачиваем.
                var poz = new Vector3(col, vysota - 1 - row, 0f);
                Postavit(c, poz, koren, ref info);
            }
        }

        return info;
    }

    static void Postavit(char c, Vector3 poz, Transform koren, ref Info info)
    {
        switch (c)
        {
            case '#': Tverdy(Art.Ground, poz, koren, "Zemlya"); break;
            case '=': Tverdy(Art.Solid, poz, koren, "Blok"); break;

            case '[': Tverdy(Art.PipeTopL, poz, koren, "Truba"); break;
            case ']': Tverdy(Art.PipeTopR, poz, koren, "Truba"); break;
            case '{': Tverdy(Art.PipeBodyL, poz, koren, "Truba"); break;
            case '}': Tverdy(Art.PipeBodyR, poz, koren, "Truba"); break;

            case 'B': Novy("Kirpich", poz, koren).AddComponent<Kirpich>(); break;

            case '?': Vopros(poz, koren, BlokVopros.Chto.Moneta); break;
            case 'M': Vopros(poz, koren, BlokVopros.Chto.Rost); break;
            case 'U': Vopros(poz, koren, BlokVopros.Chto.Zhizn); break;

            case 'o': Novy("Moneta", poz, koren).AddComponent<Moneta>(); break;
            case 'g': Novy("Gribysh", poz, koren).AddComponent<Gribysh>(); break;
            case 'k': Novy("Pancir", poz, koren).AddComponent<Pancir>(); break;

            case 'F': Novy("Flag", poz, koren).AddComponent<Flag>(); break;
            case 'S': info.Start = poz; break;

            case 'c': Fon(Art.Cloud, poz, koren, 2.2f); break;
            case 'h': Fon(Art.Hill, poz, koren, 3.4f); break;
            case 'v': Fon(Art.Bush, poz, koren, 2.0f); break;
        }
    }

    static GameObject Novy(string imya, Vector3 poz, Transform koren)
    {
        var go = new GameObject(imya);
        go.transform.SetParent(koren, false);
        go.transform.position = poz;
        return go;
    }

    static void Vopros(Vector3 poz, Transform koren, BlokVopros.Chto chto)
    {
        var b = Novy("BlokVopros", poz, koren).AddComponent<BlokVopros>();
        b.Vnutri = chto;
    }

    // Неподвижная твёрдая клетка: земля, труба, монолитный блок.
    static void Tverdy(Sprite s, Vector3 poz, Transform koren, string imya)
    {
        var go = Novy(imya, poz, koren);
        go.layer = Layers.Ground;

        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = s;
        sr.sortingOrder = 1;

        var col = go.AddComponent<BoxCollider2D>();
        col.size = Vector2.one;
    }

    // Задник: холмы, кусты, облака. Без коллайдеров и позади всего.
    static void Fon(Sprite s, Vector3 poz, Transform koren, float masshtab)
    {
        var go = Novy("Fon", poz, koren);
        go.transform.localScale = Vector3.one * masshtab;
        // Ставим так, чтобы низ картинки остался на своей клетке,
        // иначе увеличенный холм уползает под землю.
        go.transform.position = poz + new Vector3(0f, (masshtab - 1f) * 0.5f, 0f);

        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = s;
        sr.sortingOrder = -5;
        sr.color = new Color(1f, 1f, 1f, 0.85f);
    }
}
