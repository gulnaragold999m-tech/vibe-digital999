using UnityEngine;

// Задний план едет медленнее камеры — от этого появляется глубина.
// Отставание 0 — предмет стоит на месте, 1 — приклеен к экрану.
public class Parallaks : MonoBehaviour
{
    public float Otstavanie = 0.5f;

    Vector3 svoeMesto;
    Transform kamera;

    void Start()
    {
        svoeMesto = transform.position;
        if (Camera.main != null) kamera = Camera.main.transform;
    }

    void LateUpdate()
    {
        if (kamera == null) return;
        transform.position = new Vector3(
            svoeMesto.x + kamera.position.x * Otstavanie,
            svoeMesto.y,
            svoeMesto.z);
    }
}
