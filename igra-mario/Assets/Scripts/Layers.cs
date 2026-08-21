using UnityEngine;

// Слои и общие договорённости всей игры.
//
// Номера слоёв должны совпадать с ProjectSettings/TagManager.asset.
// Если добавите слой в Unity руками — впишите его и сюда, иначе
// столкновения начнут срабатывать «через раз» и это очень трудно ловить.
public static class Layers
{
    public const int Ground = 8;   // земля, блоки, трубы — всё твёрдое
    public const int Player = 9;
    public const int Enemy  = 10;
    public const int Item   = 11;  // монеты и усилители: их собирают, а не толкают

    public static int MaskGround { get { return 1 << Ground; } }
    public static int MaskEnemy  { get { return 1 << Enemy; } }
    public static int MaskItem   { get { return 1 << Item; } }

    // Один тайл мира. Вся геометрия уровня кратна этой величине.
    public const float Tile = 1f;
}

// Блок, который можно ударить снизу головой.
public interface IBumpable
{
    void Bump(PlayerController geroy);
}

// Предмет, который герой подбирает, просто зайдя в него.
// Собирать через перекрытие, а не через физическое столкновение:
// иначе монета толкает героя, и он застревает в стене.
public interface IPickup
{
    void Podobrat(PlayerController geroy);
}
