using UnityEngine;
#if !ENABLE_LEGACY_INPUT_MANAGER && ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace PixelRunner
{
    /// <summary>
    /// Клавиатура. В Unity две системы ввода, и в разных шаблонах проектов
    /// включена разная. Игра поддерживает обе: ветка выбирается компилятором,
    /// поэтому лишний пакет ставить не нужно.
    /// </summary>
    public static class Controls
    {
#if ENABLE_LEGACY_INPUT_MANAGER
        static bool Held(params KeyCode[] keys)
        {
            for (int i = 0; i < keys.Length; i++) if (Input.GetKey(keys[i])) return true;
            return false;
        }

        static bool Pressed(params KeyCode[] keys)
        {
            for (int i = 0; i < keys.Length; i++) if (Input.GetKeyDown(keys[i])) return true;
            return false;
        }

        public static bool Left { get { return Held(KeyCode.LeftArrow, KeyCode.A); } }
        public static bool Right { get { return Held(KeyCode.RightArrow, KeyCode.D); } }
        public static bool Down { get { return Held(KeyCode.DownArrow, KeyCode.S); } }
        public static bool Run { get { return Held(KeyCode.LeftShift, KeyCode.RightShift, KeyCode.X); } }
        public static bool JumpHeld { get { return Held(KeyCode.Space, KeyCode.UpArrow, KeyCode.W, KeyCode.Z); } }
        public static bool JumpPressed { get { return Pressed(KeyCode.Space, KeyCode.UpArrow, KeyCode.W, KeyCode.Z); } }
        public static bool PausePressed { get { return Pressed(KeyCode.Escape, KeyCode.P); } }
        public static bool StartPressed { get { return Pressed(KeyCode.Space, KeyCode.Return, KeyCode.KeypadEnter); } }
        public static bool RestartPressed { get { return Pressed(KeyCode.R); } }
        public static bool MusicPressed { get { return Pressed(KeyCode.M); } }
        public static bool AnyPressed { get { return Input.anyKeyDown; } }

#elif ENABLE_INPUT_SYSTEM
        static bool Held(params Key[] keys)
        {
            var kb = Keyboard.current;
            if (kb == null) return false;
            for (int i = 0; i < keys.Length; i++) if (kb[keys[i]].isPressed) return true;
            return false;
        }

        static bool Pressed(params Key[] keys)
        {
            var kb = Keyboard.current;
            if (kb == null) return false;
            for (int i = 0; i < keys.Length; i++) if (kb[keys[i]].wasPressedThisFrame) return true;
            return false;
        }

        public static bool Left { get { return Held(Key.LeftArrow, Key.A); } }
        public static bool Right { get { return Held(Key.RightArrow, Key.D); } }
        public static bool Down { get { return Held(Key.DownArrow, Key.S); } }
        public static bool Run { get { return Held(Key.LeftShift, Key.RightShift, Key.X); } }
        public static bool JumpHeld { get { return Held(Key.Space, Key.UpArrow, Key.W, Key.Z); } }
        public static bool JumpPressed { get { return Pressed(Key.Space, Key.UpArrow, Key.W, Key.Z); } }
        public static bool PausePressed { get { return Pressed(Key.Escape, Key.P); } }
        public static bool StartPressed { get { return Pressed(Key.Space, Key.Enter, Key.NumpadEnter); } }
        public static bool RestartPressed { get { return Pressed(Key.R); } }
        public static bool MusicPressed { get { return Pressed(Key.M); } }
        public static bool AnyPressed
        {
            get
            {
                var kb = Keyboard.current;
                return kb != null && kb.anyKey.wasPressedThisFrame;
            }
        }

#else
        public static bool Left { get { return false; } }
        public static bool Right { get { return false; } }
        public static bool Down { get { return false; } }
        public static bool Run { get { return false; } }
        public static bool JumpHeld { get { return false; } }
        public static bool JumpPressed { get { return false; } }
        public static bool PausePressed { get { return false; } }
        public static bool StartPressed { get { return false; } }
        public static bool RestartPressed { get { return false; } }
        public static bool MusicPressed { get { return false; } }
        public static bool AnyPressed { get { return false; } }
#endif

        /// <summary>-1 влево, +1 вправо, 0 стоим.</summary>
        public static float Horizontal
        {
            get { return (Right ? 1f : 0f) - (Left ? 1f : 0f); }
        }
    }
}
