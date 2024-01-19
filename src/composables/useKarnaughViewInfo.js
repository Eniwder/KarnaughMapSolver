import { computed } from 'vue';
const range = (n) => [...Array(n).keys()];

// offsetに依存しないカルノー図の図形情報を管理する
export function useKarnaghViewInfo(tableData, drawOpt, optView) {
  const { padding, fontInFam, fontLabelSize, oneCell, fontInSize, fontBodyFam, fontBodySize } = drawOpt;
  const ctx = document.createElement('canvas').getContext('2d');

  // 列の数
  const colIn = computed(() =>
    Math.min(2, parseInt(tableData.inputNum / 2) +
      (tableData.inputNum === 3 && optView.A_BC_or_A_BC ? 1 : 0))
  );
  // 行の数
  const rowIn = computed(() =>
    Math.min(2,
      (tableData.inputNum - parseInt(tableData.inputNum / 2)) -
      (tableData.inputNum === 3 && optView.A_BC_or_A_BC ? 1 : 0)
    ));

  // 入力名の横幅
  const inNameWidth = computed(() => {
    const colLabel = range(colIn.value).map((i) => tableData.headers[i]).join('');
    const rowLabel = range(rowIn.value).map((i) => tableData.headers[i + colIn.value]).join('');
    if (Math.max(colLabel.length, rowLabel.length) <= 2) return 0;
    ctx.font = `${fontLabelSize}px "${fontInFam}"`;
    let maxLen = Math.max(ctx.measureText(colLabel).width, ctx.measureText(rowLabel).width);
    maxLen = maxLen + parseInt(maxLen / 30) * 50;
    return parseInt(maxLen);
  });
  // 入力名の横幅(入力数が5,6以上の時に表示される)
  const outerInNameWidth = computed(() => {
    const colLabel = [];//range(colIn.value).map((i) => tableData.headers[i]).join('');
    const rowLabel = [];//range(rowIn.value).map((i) => tableData.headers[i + colIn.value]).join('');
    if (Math.max(colLabel.length, rowLabel.length) <= 2) return 0;
    ctx.font = `${fontLabelSize}px "${fontInFam}"`;
    let maxLen = Math.max(ctx.measureText(colLabel).width, ctx.measureText(rowLabel).width);
    maxLen = maxLen + parseInt(maxLen / 30) * 50;
    return parseInt(maxLen);
  });

  // paddingを含めたサイズ
  const width = computed(() => (colIn.value * 2 + 1) * oneCell + inNameWidth.value + (padding * 2));
  const height = computed(() => (rowIn.value * 2 + 1) * oneCell + (padding * 2));

  // paddingを考慮した図の座標
  // (svg要素の(0,0)ではなく、描画部分の各xy座標。paddingが0なら(0,0)となる)
  const left = computed(() => padding);
  const top = computed(() => padding);
  const right = computed(() => width.value - padding);
  const bottom = computed(() => height.value - padding);

  return {
    colIn, rowIn, width, height, left, top, right, bottom, inNameWidth, outerInNameWidth,
    padding, fontInFam, fontLabelSize, oneCell, fontInSize, fontBodyFam, fontBodySize
  };
}

