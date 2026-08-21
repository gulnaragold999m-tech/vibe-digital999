using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Точка входа. Ничего настраивать в редакторе не нужно: Unity сама зовёт
    /// этот метод при запуске любой сцены, и игра поднимается из кода.
    /// Поэтому проект работает даже в пустой сцене нового проекта.
    /// </summary>
    public static class Bootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Launch()
        {
            if (Game.Instance != null) return;
            var go = new GameObject("Pixel Runner 999");
            go.AddComponent<Game>();
            Object.DontDestroyOnLoad(go);
        }
    }
}
