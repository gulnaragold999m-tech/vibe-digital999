using UnityEngine;

// Камера едет за героем и никогда не отъезжает назад — так уровень читается
// как дорога вперёд, и нельзя «отмотать» пройденный кусок, чтобы отдышаться.
public class Kamera : MonoBehaviour
{
    public Transform Cel;
    public float LevyjKraj;
    public float PravyjKraj = 100f;
    public float NizhnijKraj;
    public float VerhnijKraj = 15f;

    Camera kamera;
    float samayaPravaya = float.NegativeInfinity;

    void Awake()
    {
        kamera = GetComponent<Camera>();
    }

    public void Sbrosit(Vector3 kuda)
    {
        samayaPravaya = float.NegativeInfinity;
        transform.position = new Vector3(kuda.x, kuda.y, -10f);
        Sledit(1f);
    }

    void LateUpdate()
    {
        Sledit(Mathf.Min(Time.deltaTime, 0.05f) * 8f);
    }

    void Sledit(float dolya)
    {
        if (Cel == null || kamera == null) return;

        float polovinaShiriny = kamera.orthographicSize * kamera.aspect;
        float polovinaVysoty = kamera.orthographicSize;

        float x = Mathf.Clamp(Cel.position.x,
                              LevyjKraj + polovinaShiriny,
                              Mathf.Max(LevyjKraj + polovinaShiriny, PravyjKraj - polovinaShiriny));
        samayaPravaya = Mathf.Max(samayaPravaya, x);
        x = samayaPravaya;

        float y = Mathf.Clamp(Cel.position.y + 1f,
                              NizhnijKraj + polovinaVysoty,
                              Mathf.Max(NizhnijKraj + polovinaVysoty, VerhnijKraj - polovinaVysoty));

        Vector3 gde = transform.position;
        // По вертикали догоняем плавно: резкие скачки камеры при прыжке
        // читаются как рывок картинки, даже если герой двигается ровно.
        transform.position = new Vector3(x, Mathf.Lerp(gde.y, y, Mathf.Clamp01(dolya)), -10f);
    }
}
