using UnityEngine;

namespace PixelRunner
{
    /// <summary>Камера едет за героем и не выходит за края уровня.</summary>
    public class CameraFollow : MonoBehaviour
    {
        public Transform target;
        public float minX, maxX, minY, maxY;

        Vector3 vel;

        void LateUpdate()
        {
            if (target == null) return;

            float x = Mathf.Clamp(target.position.x + 1.5f, minX, maxX);
            float y = Mathf.Clamp(target.position.y + 0.8f, minY, maxY);

            Vector3 want = new Vector3(x, y, transform.position.z);
            transform.position = Vector3.SmoothDamp(transform.position, want, ref vel, 0.12f);
        }

        public void Snap()
        {
            if (target == null) return;
            vel = Vector3.zero;
            transform.position = new Vector3(
                Mathf.Clamp(target.position.x + 1.5f, minX, maxX),
                Mathf.Clamp(target.position.y + 0.8f, minY, maxY),
                transform.position.z);
        }
    }
}
