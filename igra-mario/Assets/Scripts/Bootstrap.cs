using UnityEngine;

// Точка входа. Собирает игру целиком в коде: камеру, физику, звук,
// правила и надписи.
//
// Почему так, а не «расставить объекты в сцене»: сцена Unity —
// это большой файл, который нельзя прочитать и починить в чате.
// Пока вся сборка здесь, игру можно править текстом, а сцена нужна
// пустая — и её нечему сломаться.
//
// [RuntimeInitializeOnLoadMethod] означает: этот метод Unity вызовет
// сама при запуске, из любой сцены. Нажали Play — игра поднялась.
public static class Bootstrap
{
    static bool _podnyata;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Zapusk()
    {
        if (_podnyata) return;
        _podnyata = true;

        Art.Init();
        NastroitFiziku();

        var host = new GameObject("Vibe Jumper");
        Object.DontDestroyOnLoad(host);

        Sfx.Init(host);
        host.AddComponent<GameManager>();
        host.AddComponent<Hud>();

        var kamera = SozdatKameru();
        GameManager.I.PrivyazatKameru(kamera);

        Application.targetFrameRate = 60;
        QualitySettings.vSyncCount = 1;
    }

    static void NastroitFiziku()
    {
        // Тяжесть сильно больше земной: с реалистичной прыжок получается
        // «лунным» и играть неприятно. Это не физика, а ощущение.
        Physics2D.gravity = new Vector2(0f, -40f);
        Time.fixedDeltaTime = 1f / 60f;

        // Луч, пущенный изнутри коллайдера, не должен находить сам себя.
        Physics2D.queriesStartInColliders = false;

        // Кто с кем не сталкивается и почему — разобрано в Layers.cs
        // и в комментариях к врагам. Менять только вместе с ними.
        Physics2D.IgnoreLayerCollision(Layers.Enemy, Layers.Enemy, true);
        Physics2D.IgnoreLayerCollision(Layers.Item, Layers.Enemy, true);
        Physics2D.IgnoreLayerCollision(Layers.Item, Layers.Item, true);
        Physics2D.IgnoreLayerCollision(Layers.Item, Layers.Player, true);
    }

    static CameraFollow SozdatKameru()
    {
        var cam = Camera.main;
        if (cam == null)
        {
            var go = new GameObject("Kamera");
            go.tag = "MainCamera";
            cam = go.AddComponent<Camera>();
        }

        cam.orthographic = true;
        cam.orthographicSize = 7.5f;      // ровно 15 клеток по высоте — вся карта
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = Art.Ink;
        cam.transform.position = new Vector3(0f, 7f, -10f);
        cam.nearClipPlane = 0.3f;
        cam.farClipPlane = 100f;

        var f = cam.GetComponent<CameraFollow>();
        if (f == null) f = cam.gameObject.AddComponent<CameraFollow>();
        return f;
    }
}
