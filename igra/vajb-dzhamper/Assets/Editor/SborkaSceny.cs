using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

// Запасной ход. Сцена Assets/Scenes/Igra.unity лежит в репозитории готовой,
// но если Unity другой версии откажется её понимать — этот пункт меню
// соберёт её заново средствами самого редактора и пропишет в список сцен
// для сборки .exe. Меню: «Вайб Джампер» в верхней строке Unity.
public static class SborkaSceny
{
    const string PutSceny = "Assets/Scenes/Igra.unity";

    [MenuItem("Вайб Джампер/Собрать сцену заново")]
    public static void Sobrat()
    {
        Scene scena = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        GameObject predmet = new GameObject("Igra");
        predmet.AddComponent<Igra>();

        System.IO.Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scena, PutSceny);
        PropisatVSborku();

        Debug.Log("Сцена собрана заново: " + PutSceny + ". Можно нажимать Play.");
    }

    [MenuItem("Вайб Джампер/Прописать сцену в сборку")]
    public static void PropisatVSborku()
    {
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(PutSceny, true) };
        Debug.Log("Сцена прописана в настройки сборки.");
    }
}
