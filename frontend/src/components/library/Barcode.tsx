// Code 128 (set B) barcode as SVG: what USB library scanners read. No external package.

// Bar/space widths for symbol values 0–106 (106 is the stop symbol, with its final bar).
export const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const STOP = 106;

/** Symbol values for text in code set B, with the start, check and stop symbols. */
export function code128Values(text: string): number[] {
  const data = Array.from(text).map((ch) => {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 127) throw new Error(`Character "${ch}" cannot be put in a Code 128 barcode`);
    return code - 32;
  });
  const check = data.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  return [START_B, ...data, check, STOP];
}

/** Module widths, alternating bar and space, starting with a bar. */
export function code128Widths(text: string): number[] {
  return code128Values(text).flatMap((v) => Array.from(PATTERNS[v]).map(Number));
}

export default function Barcode({ value, height = 48, module = 1.6, showText = true }: {
  value: string; height?: number; module?: number; showText?: boolean;
}) {
  const quiet = 10;
  let x = quiet;
  const bars: Array<{ x: number; w: number }> = [];
  code128Widths(value).forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  const total = x + quiet;
  const textH = showText ? 14 : 0;
  return (
    <svg role="img" aria-label={`Barcode ${value}`} viewBox={`0 0 ${total} ${height + textH}`}
      width={total * module} height={(height + textH) * module / 1.6} preserveAspectRatio="none" className="max-w-full">
      <rect width={total} height={height + textH} fill="#fff" />
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#000" />)}
      {showText && <text x={total / 2} y={height + 11} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#000">{value}</text>}
    </svg>
  );
}
