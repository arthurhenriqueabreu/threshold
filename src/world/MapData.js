export const MAP = [
    '###################',
    '#S.......#..R....W#',
    '#.######.#.######.#',
    '#.#....#.#.#....#.#',
    '#.#.F..#...#.P..#.#',
    '#.#....#.#.#....#.#',
    '#.##.###.#.##.###.#',
    '#..#.....#..#.....#',
    '##.#####.##.#####.#',
    '#..#...#.......K.##',
    '#.##.#.#####.######',
    '#.#..#.....#.######',
    '#.#.#######..######',
    '#C........#...D..O#',
    '###################'
];

export const POINT_LIGHT_CELLS = [
    [2, 1], [13, 1], [8, 4], [14, 4],
    [5, 7], [9, 9], [12, 11], [16, 13]
];

export const FLICKER_INDICES = [2, 6];

// Itens de suporte por dificuldade (células): fantasma se a dificuldade não usar
export const SUPPORT_ITEM_CELLS = {
    radar: { col: 12, row: 1 },
    phone: { col: 1, row: 13 },
    flashlight: { col: 17, row: 1 }
};