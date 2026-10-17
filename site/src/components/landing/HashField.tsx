import { buildHashColumns, colVisibility, TONE } from "./hashTiles"

const COLS = 14
const ROWS = 42

const COLUMN_DATA = buildHashColumns({
  cols: COLS,
  rows: ROWS,
  minHeightPct: 48,
  heightSpanPct: 52,
})

function Columns({ side }: { side: "left" | "right" }) {
  const cols = side === "right" ? [...COLUMN_DATA].reverse() : COLUMN_DATA
  return (
    <div
      className={
        side === "left"
          ? "absolute inset-y-0 left-0 flex w-[min(44%,24rem)] items-start justify-start gap-1.5 pl-2 pt-0 sm:gap-2 sm:pl-4 md:w-[min(42%,26rem)] md:gap-2.5 md:pl-6 lg:pl-8"
          : "absolute inset-y-0 right-0 flex w-[min(44%,24rem)] items-start justify-end gap-1.5 pr-2 pt-0 sm:gap-2 sm:pr-4 md:w-[min(42%,26rem)] md:gap-2.5 md:pr-6 lg:pr-8"
      }
    >
      {cols.map((col, i) => {
        const depth = side === "left" ? i : COLS - 1 - i
        return (
          <div
            key={`${side}-${i}`}
            className={`${colVisibility(depth, COLS)} w-3 shrink-0 justify-between sm:w-3.5 md:w-4`}
            style={{ height: `${col.height}%` }}
          >
            {col.cells.map((tone, row) => (
              <span
                key={row}
                className={`block w-full shrink-0 rounded-[1px] ${
                  row % 2 === 1 ? "hidden sm:block" : ""
                } h-1 sm:h-[4.5px] md:h-[5px]`}
                style={{ backgroundColor: TONE[tone] }}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

export function HashField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <Columns side="left" />
      <Columns side="right" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_58%_at_50%_48%,#08101f_0%,rgba(8,16,31,0.68)_34%,transparent_66%)] sm:bg-[radial-gradient(ellipse_44%_54%_at_50%_46%,#08101f_0%,rgba(8,16,31,0.5)_32%,transparent_64%)]" />
    </div>
  )
}
