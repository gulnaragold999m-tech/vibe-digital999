using UnityEngine;

namespace PixelRunner
{
    /// <summary>
    /// Все числа игры собраны здесь намеренно: подкрутить прыжок или скорость
    /// можно в одном файле, не читая остальной код.
    /// </summary>
    public static class Cfg
    {
        // --- размеры мира ---
        public const int PixelsPerUnit = 16;   // 1 клетка карты = 16 пикселей = 1 юнит
        public const int LevelRows = 15;       // высота уровня в клетках

        // --- слои. Имён у слоёв 8 и 9 в пустом проекте нет, и они не нужны:
        // физика работает по номерам, а номера есть всегда.
        public const int PlayerLayer = 8;
        public const int EnemyLayer = 9;

        // --- бег ---
        public const float WalkSpeed = 6.5f;
        public const float RunSpeed = 10.5f;
        public const float Accel = 45f;        // разгон
        public const float Decel = 38f;        // торможение без клавиши
        public const float SkidAccel = 90f;    // разворот на полном ходу
        public const float AirControl = 0.75f; // насколько слушается в воздухе

        // --- прыжок ---
        public const float Gravity = 4.2f;     // множитель к гравитации сцены
        public const float JumpVelocity = 19f;
        // с разбега прыжок выше — на этом держится половина уровней:
        // шагом достаём до блока в 4 клетки, с разбега до 5,5
        public const float RunJumpBonus = 0.22f;
        public const float MaxFallSpeed = 24f;
        public const float CoyoteTime = 0.09f; // прыжок прощается сразу после края
        public const float JumpBuffer = 0.12f; // нажатие прощается чуть раньше земли
        public const float CutJump = 0.45f;    // отпустил кнопку — полёт короче
        public const float StompBounce = 13f;  // отскок с головы врага

        // --- враги ---
        public const float GoombaSpeed = 2.2f;
        public const float KoopaSpeed = 2.8f;
        public const float ShellSpeed = 13f;
        public const float WakeDistance = 16f; // на каком расстоянии враг оживает

        // --- прочее ---
        public const float MushroomSpeed = 4f;
        public const float PlatformSpeed = 2.5f;
        public const float PlatformRange = 3.5f;
        public const float CameraSize = 6.5f;
        public const float DeathLine = -4f;    // ниже этой высоты — падение в яму
        public const int LevelTime = 300;      // секунд на уровень
        public const int StartLives = 3;
        public const int Levels = 3;
    }

    /// <summary>
    /// Unity 6 переименовала velocity в linearVelocity. Чтобы игра собиралась
    /// и в старых версиях, и в новых, скорость читается только через эти два
    /// метода — версия проверяется на этапе компиляции.
    /// </summary>
    public static class Rb2D
    {
        public static Vector2 Vel(this Rigidbody2D rb)
        {
#if UNITY_6000_0_OR_NEWER
            return rb.linearVelocity;
#else
            return rb.velocity;
#endif
        }

        public static void SetVel(this Rigidbody2D rb, Vector2 v)
        {
#if UNITY_6000_0_OR_NEWER
            rb.linearVelocity = v;
#else
            rb.velocity = v;
#endif
        }

        public static void SetVel(this Rigidbody2D rb, float x, float y)
        {
            rb.SetVel(new Vector2(x, y));
        }
    }
}
