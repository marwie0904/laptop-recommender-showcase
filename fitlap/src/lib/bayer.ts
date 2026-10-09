/** 4×4 ordered-dither matrix. Sets per-dot animation delays (section 5). */
export const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]] as const;
export const bayerAt = (i: number, j: number) => BAYER[i % 4][j % 4];
