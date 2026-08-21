using UnityEngine;

// Камера едет за героем по горизонтали и никогда не показывает то,
// чего в уровне нет: за краями карты пустота, и её видно сразу.
public class CameraFollow : MonoBehaviour
{
    public Transform Cel;
    public float MinX, MaxX;
    public float VysotaKamery = 7f;

    Camera _cam;

    void Awake() { _cam = GetComponent<Camera>(); }

    public void Nastroit(Transform cel, float shirinaUrovnya, float vysotaUrovnya)
    {
        Cel = cel;
        _cam = _cam != null ? _cam : GetComponent<Camera>();

        float polShiriny = _cam.orthographicSize * _cam.aspect;
        MinX = polShiriny - 0.5f;
        MaxX = Mathf.Max(MinX, shirinaUrovnya - polShiriny - 0.5f);

        // По вертикали камеру не двигаем совсем: уровень ровно по высоте
        // экрана. Дёргающаяся вверх-вниз камера в платформере утомляет.
        VysotaKamery = vysotaUrovnya * 0.5f - 0.5f;

        if (cel != null)
            transform.position = new Vector3(Mathf.Clamp(cel.position.x, MinX, MaxX),
                                             VysotaKamery, -10f);
    }

    void LateUpdate()
    {
        if (Cel == null) return;

        float x = Mathf.Clamp(Cel.position.x, MinX, MaxX);
        float sglazheno = Mathf.Lerp(transform.position.x, x, 1f - Mathf.Exp(-12f * Time.deltaTime));
        transform.position = new Vector3(sglazheno, VysotaKamery, -10f);
    }
}
