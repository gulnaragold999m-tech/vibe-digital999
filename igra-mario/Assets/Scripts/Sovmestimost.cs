using UnityEngine;

// Совместимость с разными версиями Unity.
//
// В Unity 6 свойство Rigidbody2D.velocity переименовали в linearVelocity,
// а старое пометили устаревшим. Игра работает и там, и в 2022.3 LTS,
// но без этой обёртки при открытии в Unity 6 сыпались бы предупреждения
// на каждой строчке — а для человека, который открыл проект первый раз,
// экран жёлтых сообщений неотличим от «всё сломано».
//
// Всё различие собрано здесь, в одном месте. Появится новая версия —
// править эти четыре строки, а не двадцать файлов.
public static class Sovmestimost
{
    public static Vector2 Skorost(this Rigidbody2D rb)
    {
#if UNITY_6000_0_OR_NEWER
        return rb.linearVelocity;
#else
        return rb.velocity;
#endif
    }

    public static void ZadatSkorost(this Rigidbody2D rb, Vector2 v)
    {
#if UNITY_6000_0_OR_NEWER
        rb.linearVelocity = v;
#else
        rb.velocity = v;
#endif
    }
}
