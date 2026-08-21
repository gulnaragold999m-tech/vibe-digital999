using System.Collections;
using UnityEngine;

namespace PixelRunner
{
    /// <summary>Флагшток в конце уровня. Коснулись — флаг едет вниз, уровень пройден.</summary>
    public class Flag : MonoBehaviour
    {
        Transform cloth;
        float baseY;
        bool taken;

        public static Flag Create(Vector3 basePos, int height, Transform cloth)
        {
            var go = new GameObject("Флагшток");
            go.transform.position = basePos + Vector3.up * (height * 0.5f);
            var f = go.AddComponent<Flag>();
            f.cloth = cloth;
            f.baseY = basePos.y + 0.6f;

            var col = go.AddComponent<BoxCollider2D>();
            col.size = new Vector2(0.6f, height);
            col.isTrigger = true;
            return f;
        }

        void OnTriggerEnter2D(Collider2D other)
        {
            if (taken) return;
            var p = other.GetComponent<Player>();
            if (p == null || p.IsDead) return;

            taken = true;
            p.Victory();
            Sfx.MusicStop();
            Sfx.Play("flag");
            StartCoroutine(Lower());
            Game.Instance.LevelComplete();
        }

        IEnumerator Lower()
        {
            if (cloth == null) yield break;
            float t = 0f;
            Vector3 from = cloth.position;
            Vector3 to = new Vector3(from.x, baseY, from.z);
            while (t < 1f)
            {
                t += Time.deltaTime * 1.6f;
                cloth.position = Vector3.Lerp(from, to, t);
                yield return null;
            }
        }
    }
}
