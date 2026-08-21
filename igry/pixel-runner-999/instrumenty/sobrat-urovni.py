# Генератор уровней: собирает ASCII-карты и проверяет их на ошибки.
# Результат — обычные .txt, которые дальше правятся руками в блокноте.

H = 15          # строк в уровне
GROUND = 13     # с этой строки вниз — земля


class Level:
    def __init__(self, width):
        self.w = width
        self.g = [[' '] * width for _ in range(H)]
        for row in range(GROUND, H):
            for x in range(width):
                self.g[row][x] = 'X'

    def put(self, x, row, ch):
        if 0 <= x < self.w and 0 <= row < H:
            self.g[row][x] = ch

    def row(self, x0, x1, row, ch):
        for x in range(x0, x1 + 1):
            self.put(x, row, ch)

    def rect(self, x0, x1, r0, r1, ch):
        for r in range(r0, r1 + 1):
            self.row(x0, x1, r, ch)

    def pit(self, x0, x1):
        """яма: убираем землю"""
        self.rect(x0, x1, GROUND, H - 1, ' ')

    def pipe(self, x, height):
        """труба шириной 2, высотой height, стоит на земле"""
        top = GROUND - height
        self.rect(x, x + 1, top, GROUND - 1, 'p')

    def stairs(self, x, steps, direction=1):
        """лесенка из блоков S"""
        for i in range(steps):
            col = x + i * direction
            self.rect(col, col, GROUND - 1 - i, GROUND - 1, 'S')

    def cloud(self, x, row):
        self.put(x, row, 'c')

    def bush(self, x):
        self.put(x, GROUND - 1, 'b')

    def hill(self, x):
        self.put(x, GROUND - 1, 'h')

    def text(self):
        return '\n'.join(''.join(r) for r in self.g)


def check(name, lv):
    """проверки, которые ловят самые обидные ошибки в карте"""
    problems = []
    lines = lv.text().split('\n')
    if len(lines) != H:
        problems.append('строк не %d, а %d' % (H, len(lines)))
    for i, line in enumerate(lines):
        if len(line) != lv.w:
            problems.append('строка %d длиной %d вместо %d' % (i, len(line), lv.w))

    solid = set('XSBpP?M')
    # враги и монеты не должны стоять внутри блока
    for r in range(H):
        for x in range(lv.w):
            ch = lv.g[r][x]
            if ch in 'gko' and lv.g[r][x] in solid:
                problems.append('%s внутри блока на %d,%d' % (ch, x, r))
            # враг обязан на что-то опираться
            if ch in 'gk':
                below = lv.g[r + 1][x] if r + 1 < H else 'X'
                if below not in solid:
                    problems.append('враг %s висит в воздухе на %d,%d' % (ch, x, r))
            # монета не в блоке
            if ch == 'o' and r + 1 < H and lv.g[r][x] != 'o':
                pass

    # ямы не шире 5 клеток — иначе не перепрыгнуть
    run = 0
    for x in range(lv.w):
        if lv.g[H - 1][x] == ' ':
            run += 1
            if run > 5:
                problems.append('яма шире 5 клеток около x=%d' % x)
                run = 0
        else:
            run = 0

    # флаг должен быть ровно один
    flags = sum(line.count('F') for line in lines)
    if flags != 1:
        problems.append('флагов %d, а надо 1' % flags)

    print('=== %s: %s' % (name, 'ошибок нет' if not problems else '; '.join(problems)))
    return not problems


# ---------------------------------------------------------------- уровень 1
# Знакомство: широкая земля, три трубы, первые гумбы, лесенка перед флагом.
l1 = Level(180)
for x, r in [(6, 2), (18, 3), (33, 2), (52, 3), (70, 2), (96, 3), (120, 2), (150, 3), (166, 2)]:
    l1.cloud(x, r)
for x in [10, 26, 44, 62, 88, 110, 140, 160]:
    l1.bush(x)
for x in [3, 30, 58, 100, 132, 155]:
    l1.hill(x)

l1.put(14, 9, '?')
l1.put(20, 9, 'B')
l1.put(21, 9, '?')
l1.put(22, 9, 'B')
l1.put(23, 9, 'M')          # гриб
l1.put(24, 9, 'B')
l1.put(21, 5, '?')
l1.row(20, 24, 4, 'o')

l1.put(17, 12, 'g')
l1.put(28, 12, 'g')

l1.pipe(33, 2)
l1.pipe(41, 3)
l1.put(38, 12, 'g')
l1.pipe(50, 4)
l1.put(47, 12, 'g')
l1.pipe(58, 4)

l1.pit(66, 69)
l1.row(63, 65, 8, 'B')
l1.row(63, 65, 7, 'o')

l1.rect(74, 76, 9, 9, 'B')
l1.put(75, 9, '?')
l1.put(78, 12, 'g')
l1.put(80, 12, 'g')

l1.pit(86, 89)
l1.row(92, 95, 9, 'S')
l1.row(92, 95, 8, 'o')
l1.put(98, 12, 'g')

l1.rect(102, 103, 10, 10, 'B')
l1.put(104, 10, '?')
l1.rect(105, 106, 10, 10, 'B')
l1.rect(108, 110, 6, 6, 'B')
l1.put(109, 6, 'M')
l1.row(108, 110, 5, 'o')

l1.pit(115, 118)
l1.put(113, 12, 'g')

l1.pipe(122, 3)
l1.put(126, 12, 'g')
l1.put(128, 12, 'g')
l1.row(131, 134, 9, 'B')
l1.put(132, 9, '?')
l1.row(131, 134, 8, 'o')

l1.pit(139, 142)
l1.row(137, 138, 8, 'S')
l1.row(145, 146, 8, 'S')
l1.row(145, 146, 7, 'o')

l1.put(150, 12, 'g')
l1.stairs(155, 4)
l1.stairs(163, 4, -1)

l1.put(170, 12, 'F')        # флаг
l1.put(175, 12, 'C')        # замок

# ---------------------------------------------------------------- уровень 2
# Сложнее: черепахи, движущиеся платформы, длинные ямы, блоки в два этажа.
l2 = Level(190)
for x, r in [(4, 2), (22, 3), (40, 2), (58, 3), (78, 2), (100, 3), (124, 2), (146, 3), (172, 2)]:
    l2.cloud(x, r)
for x in [12, 34, 66, 92, 118, 152, 178]:
    l2.bush(x)
for x in [7, 45, 84, 130, 165]:
    l2.hill(x)

l2.put(10, 12, 'k')
l2.row(13, 16, 9, 'B')
l2.put(14, 9, '?')
l2.put(16, 9, 'M')
l2.row(13, 16, 5, 'o')

l2.pipe(21, 3)
l2.put(19, 12, 'g')
l2.pipe(27, 5)
l2.put(25, 12, 'k')

l2.pit(33, 36)
l2.put(31, 8, 'B')
l2.put(32, 8, '?')

l2.rect(40, 42, 10, 10, 'S')
l2.put(41, 9, 'g')
l2.rect(46, 48, 8, 8, 'S')
l2.row(46, 48, 7, 'o')
l2.put(50, 12, 'k')

l2.pit(54, 58)
l2.put(56, 10, '=')          # движущаяся платформа над ямой

l2.rect(62, 64, 9, 9, 'B')
l2.put(63, 9, '?')
l2.put(66, 12, 'g')
l2.put(68, 12, 'g')
l2.put(70, 12, 'k')

l2.pipe(74, 4)
l2.pit(80, 83)
l2.row(78, 79, 8, 'S')
l2.row(85, 86, 8, 'S')
l2.row(85, 86, 7, 'o')

l2.rect(90, 92, 6, 6, 'B')
l2.put(91, 6, 'M')
l2.row(90, 92, 5, 'o')
l2.rect(90, 92, 10, 10, 'B')
l2.put(95, 12, 'k')

l2.pit(99, 103)
l2.put(101, 9, '^')         # платформа вверх-вниз

l2.rect(107, 110, 9, 9, 'S')
l2.put(108, 8, 'g')
l2.put(110, 8, 'g')
l2.rect(114, 116, 7, 7, 'B')
l2.put(115, 7, '?')
l2.row(114, 116, 6, 'o')

l2.pipe(121, 5)
l2.put(119, 12, 'k')
l2.pit(128, 132)
l2.put(130, 10, '=')

l2.rect(136, 139, 10, 10, 'B')
l2.put(137, 10, '?')
l2.put(139, 10, '?')
l2.put(142, 12, 'g')
l2.put(144, 12, 'k')
l2.row(136, 139, 6, 'o')

l2.pit(149, 153)
l2.row(147, 148, 8, 'S')
l2.row(155, 156, 8, 'S')

l2.rect(160, 162, 9, 9, 'B')
l2.put(161, 9, 'M')
l2.put(165, 12, 'k')
l2.put(167, 12, 'g')

l2.stairs(172, 5)
l2.put(180, 12, 'F')
l2.put(185, 12, 'C')

# ---------------------------------------------------------------- уровень 3
# Финал: много воздуха, платформы, ямы подряд, плотная охрана перед флагом.
l3 = Level(200)
for x, r in [(5, 2), (26, 3), (48, 2), (70, 3), (94, 2), (118, 3), (144, 2), (170, 3), (190, 2)]:
    l3.cloud(x, r)
for x in [14, 38, 62, 108, 136, 184]:
    l3.bush(x)
for x in [9, 55, 100, 158]:
    l3.hill(x)

l3.put(8, 12, 'g')
l3.put(10, 12, 'k')
l3.rect(13, 15, 9, 9, 'B')
l3.put(14, 9, '?')
l3.rect(13, 15, 5, 5, 'B')
l3.put(14, 5, 'M')

l3.pit(19, 23)
l3.put(21, 10, '=')

l3.pipe(27, 4)
l3.put(31, 12, 'k')
l3.rect(34, 36, 8, 8, 'S')
l3.row(34, 36, 7, 'o')
l3.put(35, 7, 'o')

l3.pit(40, 44)
l3.pit(47, 51)
l3.row(45, 46, 9, 'S')
l3.put(49, 9, '^')

l3.rect(55, 58, 10, 10, 'B')
l3.put(56, 10, '?')
l3.put(58, 10, '?')
l3.put(56, 9, 'k')
l3.put(60, 12, 'g')
l3.put(62, 12, 'g')

l3.pipe(66, 5)
l3.pit(72, 76)
l3.put(74, 10, '=')
l3.rect(79, 81, 9, 9, 'B')
l3.put(80, 9, 'M')
l3.row(79, 81, 8, 'o')

l3.put(85, 12, 'k')
l3.put(87, 12, 'g')
l3.rect(90, 92, 8, 8, 'S')
l3.put(91, 7, 'g')
l3.rect(96, 98, 5, 5, 'B')
l3.put(97, 5, '?')
l3.row(96, 98, 4, 'o')

l3.pit(102, 106)
l3.pit(109, 113)
l3.row(107, 108, 8, 'S')
l3.put(111, 9, '^')

l3.pipe(117, 3)
l3.pipe(122, 5)
l3.put(120, 12, 'g')
l3.rect(127, 130, 9, 9, 'B')
l3.put(128, 9, '?')
l3.put(130, 9, '?')
l3.row(127, 130, 5, 'o')

l3.pit(135, 139)
l3.put(137, 10, '=')
l3.rect(142, 145, 10, 10, 'S')
l3.put(143, 9, 'k')
l3.put(145, 9, 'g')

l3.pit(149, 153)
l3.row(147, 148, 8, 'S')
l3.row(155, 157, 8, 'B')
l3.put(156, 8, 'M')
l3.row(155, 157, 7, 'o')

l3.put(160, 12, 'k')
l3.put(162, 12, 'k')
l3.pipe(166, 4)
l3.pit(172, 176)
l3.put(174, 9, '^')

l3.rect(179, 182, 9, 9, 'B')
l3.put(180, 9, '?')
l3.put(184, 12, 'g')
l3.put(186, 12, 'k')

l3.stairs(190, 5)
l3.put(194, 12, 'F')
l3.put(197, 12, 'C')


import os
# кладём готовые карты прямо туда, откуда их читает игра
out = os.path.join(os.path.dirname(__file__), '..', 'Assets', 'PixelRunner', 'Resources', 'urovni')
os.makedirs(out, exist_ok=True)
ok = True
for i, lv in enumerate([l1, l2, l3], start=1):
    ok = check('uroven-%d' % i, lv) and ok
    with open(os.path.join(out, 'uroven-%d.txt' % i), 'w') as f:
        f.write(lv.text() + '\n')

# показать кусок первого уровня глазами
print()
for line in l1.text().split('\n'):
    print(line[:90])
print('ok' if ok else 'ЕСТЬ ОШИБКИ')
