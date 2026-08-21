using UnityEngine;

// Дальний план едет медленнее камеры — от этого появляется глубина.
// Коэффициент 0 — приклеено к камере, 1 — стоит на месте вместе с миром.
public class Parallax : MonoBehaviour
{
    public float Koefficient = 0.15f;

    Transform _cam;
    Vector3 _nachalo;
    float _camNachalo;

    void Start()
    {
        _cam = Camera.main != null ? Camera.main.transform : null;
        _nachalo = transform.position;
        if (_cam != null) _camNachalo = _cam.position.x;
    }

    void LateUpdate()
    {
        if (_cam == null) return;
        float sdvig = (_cam.position.x - _camNachalo) * (1f - Koefficient);
        transform.position = new Vector3(_nachalo.x + sdvig, _nachalo.y, _nachalo.z);
    }
}
