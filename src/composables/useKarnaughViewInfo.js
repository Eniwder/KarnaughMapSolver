import { computed } from 'vue';
const range = (n) => [...Array(n).keys()];

// offsetに依存しないカルノー図の図形情報を管理する
// あとは共通で使うオマケメソッド
export function useKarnaghViewInfo(tableData, drawOpt, viewOpt) {
  const { padding, fontInFam, fontLabelSize, oneCell, fontBodyFam, fontBodySize,
    strokeMap, fontInSize, fontLabelFam, outBorderSw, cellBorderSw } = drawOpt;
  const ctx = document.createElement('canvas').getContext('2d');

  // 列の数
  const colIn = computed(() =>
    Math.min(2, parseInt(tableData.meta.inputNum / 2) +
      (tableData.meta.inputNum === 3 && viewOpt.A_BC_or_A_BC ? 1 : 0))
  );
  // 行の数
  const rowIn = computed(() =>
    Math.min(2,
      (tableData.meta.inputNum - parseInt(tableData.meta.inputNum / 2)) -
      (tableData.meta.inputNum === 3 && viewOpt.A_BC_or_A_BC ? 1 : 0)
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
    if (tableData.meta.inputNum < 5) return 0;
    const colLabel = tableData.headers[4] || '';
    const rowLabel = tableData.headers[5] || '';
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

  // A Bなど
  const colHeaderLabel = computed(() => {
    const colLabel = range(colIn.value).map((i) => tableData.headers[i]).join(' ');
    return {
      v: colLabel,
      x: left.value + inNameWidth.value / 2 + (oneCell / 4) * 3 - 4 + inNameWidth.value / 5,
      y: top.value + oneCell / 4
    };
  });
  // 00 01 11 11など
  const colHeader = computed(() => {
    return range(colIn.value * 2).map((i) => ({
      v: (i ^ (i >> 1)).toString(2).padStart(colIn.value, '0'),
      key: `ch${i}`,
      x: left.value + oneCell * i + oneCell + oneCell / 2,
      y: top.value + oneCell / 2,
    }));
  });
  const rowHeaderLabel = computed(() => {
    const rowLabel = range(rowIn.value).map((i) => tableData.headers[i + colIn.value]).join(' ');
    return {
      v: rowLabel,
      x: left.value + inNameWidth.value / 2 + (oneCell / 4) * 1 + 4 - inNameWidth.value / 5,
      y: top.value + oneCell - oneCell / 4,
    };
  });
  const rowHeader = computed(() => {
    return range(rowIn.value * 2).map((i) => ({
      v: (i ^ (i >> 1)).toString(2).padStart(rowIn.value, '0'),
      key: `rh${i}`,
      x: left.value + oneCell / 2,
      y: top.value + oneCell * i + oneCell + oneCell / 2,
    }));
  });

  // E
  const dimColHeaderLabel = computed(() => {
    const dimColLabel = tableData.headers.slice(4)[0];
    return {
      v: dimColLabel,
      x: left.value + outerInNameWidth.value / 2 + (oneCell / 4) * 3 + outerInNameWidth.value / 5,
      y: top.value + oneCell / 3
    };
  });
  const dimColHeader = computed(() => {
    return [0, 1].map((v, idx) => ({
      v,
      x: dimColHeaderLabel.value.x + (width.value / 2) + (width.value * idx) + outerInNameWidth.value / 3 + padding,
      y: dimColHeaderLabel.value.y
    }));
  });
  // F
  const dimRowHeaderLabel = computed(() => {
    const dimRowLabel = tableData.headers.slice(4)[1];
    return {
      v: dimRowLabel,
      x: left.value + outerInNameWidth.value / 2 + (oneCell / 4) * 1 + 4 - outerInNameWidth.value / 5,
      y: top.value + oneCell - oneCell / 4,
    };
  });
  const dimRowHeader = computed(() => {
    return [0, 1].map((v, idx) => ({
      v,
      x: dimRowHeaderLabel.value.x,
      y: dimRowHeaderLabel.value.y + height.value / 2 + (height.value * idx) + padding
    }));
  });

  function isNeighbor(poss, d) {
    const xy = d === 'x' ? 0 : 1;
    const max = (d === 'x' ? colIn.value : rowIn.value) * 2 - 1;
    const arr = poss.map((_) => _[xy]).sort((a, b) => a - b);
    let ret = true;
    for (let i = 0; i < arr.length - 1; i++) {
      const diff1 = arr[i + 1] - arr[i];
      const diff2 = arr[i] - (arr[i + 1] % max);
      ret = ret && (diff1 === 1 || diff2 === 0);
    }
    return ret;
  }
  function isAllNeighbor(arr) {
    // [empty, [1], [2]].flat() -> [[1], [2]]
    const idxGroup = (idx) => (acc, v) => {
      acc[v[idx]] = acc[v[idx]] || [];
      acc[v[idx]].push(v);
      return acc;
    };
    // xかyで繋がりのあるセルの数を行か列ごとに計算して集計する
    const idxLens = (idx) => (brr) =>
      brr.map((brr) =>
        brr
          .map((ssc) => arr.filter((_) => _[idx] === ssc[idx]).length)
          .reduce((acc, v) => acc + parseInt(v), 0)
      );
    const sameCols = [arr.reduce(idxGroup(0), [])].flat();
    const sameRows = [arr.reduce(idxGroup(1), [])].flat();
    const colLens = idxLens(1)(sameCols).flat();
    const rowLens = idxLens(0)(sameRows).flat();
    let ret = true;
    ret = sameCols.reduce((acc, v) => acc && isNeighbor(v, 'y'), ret); // 縦が繋がってるか
    ret = sameRows.reduce((acc, v) => acc && isNeighbor(v, 'x'), ret); // 横も繋がってるか
    ret = ret && colLens.every((_) => arr.length === _); // 繋がりを全て集計したら選択した合計数と同じになるか(縦から見る)
    ret = ret && rowLens.every((_) => arr.length === _); // 繋がりを全て集計したら選択した合計数と同じになるか(横から見る)
    return ret;
  }

  return {
    colIn, rowIn, width, height, left, top, right, bottom, inNameWidth, outerInNameWidth,
    padding, fontInFam, fontLabelSize, oneCell, fontBodyFam, fontBodySize, fontInSize, fontLabelFam, strokeMap, outBorderSw, cellBorderSw,
    colHeaderLabel, colHeader, rowHeaderLabel, rowHeader, dimColHeaderLabel, dimColHeader, dimRowHeaderLabel, dimRowHeader,
    isAllNeighbor
  };
}

