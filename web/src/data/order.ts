/**
 * Reads the year off whatever `period` already says, so there is no second date
 * field to keep in sync with the one on screen. Projects carry the year they were
 * built; roles carry a range, and an ongoing one sorts above every finished year.
 *
 * Ties keep the order they were written in, which is what lets same-year entries
 * be hand-ranked in the data file.
 */
export function newestFirst<T extends { period: string }>(items: readonly T[]): T[] {
    return [...items].sort((a, b) => latestYear(b.period) - latestYear(a.period))
}

function latestYear(period: string): number {
    if (/present/i.test(period)) return Infinity

    const years = period.match(/\d{4}/g)
    return years ? Math.max(...years.map(Number)) : 0
}
