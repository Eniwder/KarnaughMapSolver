<template>
  <div class="karnaugh">
    <svg viewbox="0 0 300 300" :width="width + offset * 2 + inNameOffset" :height="height + offset * 2"
      @click="select($event)" ref="svgRoot">
      <!-- 外枠 -->
      <line :x1="left - 1" :y1="top" :x2="right + 1 + inNameOffset" :y2="top" stroke="black" stroke-width="2"></line>
      <line :x1="left" :y1="top - 1" :x2="left" :y2="bottom + 1" stroke="black" stroke-width="2"></line>
      <line :x1="left - 1" :y1="bottom" :x2="right + 1 + inNameOffset" :y2="bottom" stroke="black" stroke-width="2">
      </line>
      <line :x1="right + inNameOffset" :y1="top - 1" :x2="right + inNameOffset" :y2="bottom + 1" stroke="black"
        stroke-width="2"></line>
      <!-- grid col -->
      <line v-for="col in 2 * colIn" :key="'col' + col" :x1="col * colW + left + inNameOffset" :y1="top"
        :x2="col * colW + left + inNameOffset" :y2="bottom" stroke="black"></line>
      <!-- grid row -->
      <line v-for="row in 2 * rowIn" :key="'row' + row" :x1="left" :y1="row * rowH + top" :x2="right + inNameOffset"
        :y2="row * rowH + top" stroke="black"></line>
      <!-- separate input -->
      <line :x1="left" :y1="top" :x2="left + colW + inNameOffset" :y2="top + rowH" stroke="black"></line>
      <!-- col header -->
      <text :x="colHeaderLabel.x" :y="colHeaderLabel.y" :font-size="fontLabelSize" :font-family="fontInFam"
        text-anchor="middle" dominant-baseline="central">
        {{ colHeaderLabel.v }}
      </text>
      <text v-for="ch in colHeader" :key="ch.key" :x="ch.x + inNameOffset" :y="ch.y" :font-size="fontInSize"
        :font-family="fontInFam" text-anchor="middle" dominant-baseline="central">
        {{ ch.v }}
      </text>
      <!-- row header -->
      <text :x="rowHeaderLabel.x" :y="rowHeaderLabel.y" :font-size="fontLabelSize" :font-family="fontInFam"
        text-anchor="middle" dominant-baseline="central">
        {{ rowHeaderLabel.v }}
      </text>
      <text v-for="rh in rowHeader" :key="rh.key" :x="rh.x + inNameOffset / 2" :y="rh.y" :font-size="fontInSize"
        :font-family="fontInFam" text-anchor="middle" dominant-baseline="central">
        {{ rh.v }}
      </text>
      <!-- table body -->
      <text v-for="tb in tableBody" :key="tb.key" :x="tb.x + inNameOffset" :y="tb.y" :font-size="fontBodySize"
        :font-family="fontBodyFam" text-anchor="middle" dominant-baseline="central"
        :fill="colors[parseInt(tb.x / colW) - 1][parseInt(tb.y / rowH) - 1]">
        {{ tb.v }}
      </text>
      <path v-for="p in arcs" :d="svgArc(p)" :key="p.key" fill="none" stroke="black"></path>
      <path v-for="p in bezs" :d="svgBez(p)" :key="p.key" fill="none" stroke="black"></path>
      <ellipse v-for="p in ellipses" :key="p.key" v-bind="p" fill="none" stroke="black"></ellipse>
      <rect v-for="p in rects" :key="p.key" v-bind="p" fill="none" stroke="black"></rect>
    </svg>
    <v-row class="fomulas">
      <div id="fomula" v-html="mathjax"></div>
      <v-btn class="ma-2" variant="text" icon @click="copy4word">
        <v-icon>mdi-file-word-outline</v-icon>
      </v-btn>
    </v-row>
  </div>
</template>

<script setup>
import { reactive, defineProps, computed, onMounted, watch, defineEmits, nextTick, ref } from 'vue';
import { useI18n } from "vue-i18n";
const { t } = useI18n({ useScope: "global" });
const emit = defineEmits(['msg', 'grouped'])
defineExpose({ deselection, grouping, autoGrouping, reset })

const range = (n) => [...Array(n).keys()];
const size = 360;

const props = defineProps({
  _tableData: {
    inputNum: Number,
    headers: [],
    outName: String,
    outIdx: Number,
    grp: [],
    body: [],
  },
  optView: {
    AB_or_BA: Boolean,
    A_BC_or_A_BC: Boolean,
  }
})
const offset = 8
const fontInFam = 'Meiryo'
const fontLabelSize = 16
const fontInSize = 24
const fontBodyFam = 'Arial'
const fontBodySize = 24
const selects_ = reactive([])
const group_ = reactive(props._tableData.grp || [])
const svgRoot = ref(null)

const tableData = computed(() => {
  // 入力ラベルの描画順序を変えない場合は何もしない
  if (!props.optView.AB_or_BA) return props._tableData;
  // 入力ラベルの描画順序を変える場合は中のデータ順序を入れ替える
  // 描画ロジックは変更しない
  function replaceTableData(td, idxs) {
    const replaceArrElem = (arr, idxs) =>
      arr.reduce((acc, v, idx) => {
        acc.push(arr[idxs[idx]] || v);
        return acc;
      }, []);

    const replaceArrsElem = (arrs, idxs) => arrs.map((arr) => replaceArrElem(arr, idxs));

    td.headers = replaceArrElem(td.headers, idxs);
    td.body = replaceArrsElem(td.body, idxs);
    return td;
  }
  const indices =
    props._tableData.inputNum === 2
      ? [1, 0]
      : props._tableData.inputNum === 3 && props.optView.A_BC_or_A_BC
        ? [1, 2, 0]
        : props._tableData.inputNum === 3 && !props.optView.A_BC_or_A_BC
          ? [2, 0, 1]
          : props._tableData.inputNum === 4
            ? [2, 3, 0, 1]
            : [0, 1, 2, 3];

  return replaceTableData(Object.assign({}, props._tableData), indices);
})

const width = computed(() => colIn.value * 180)
const height = computed(() => rowIn.value * 180)
const colHeaderLabel = computed(() => {
  const colLabel = range(colIn.value).map((i) => tableData.value.headers[i]).join(' ');
  return {
    v: colLabel,
    x: left.value + inNameOffset.value / 2 + (colW.value / 4) * 3 - 4 + inNameOffset.value / 5,
    y: top.value + rowH.value / 4
  };
})
const colHeader = computed(() => {
  return range(colIn.value * 2).map((i) => ({
    v: (i ^ (i >> 1)).toString(2).padStart(colIn.value, '0'),
    key: `ch${i}`,
    x: left.value + colW.value * i + colW.value + colW.value / 2,
    y: top.value + rowH.value / 2,
  }));
})
const rowHeaderLabel = computed(() => {
  const rowLabel = range(rowIn.value).map((i) => tableData.value.headers[i + colIn.value]).join(' ');
  return {
    v: rowLabel,
    x: left.value + inNameOffset.value / 2 + (colW.value / 4) * 1 + 4 - inNameOffset.value / 5,
    y: top.value + rowH.value - rowH.value / 4,
  };
})
const rowHeader = computed(() => {
  return range(rowIn.value * 2).map((i) => ({
    v: (i ^ (i >> 1)).toString(2).padStart(rowIn.value, '0'),
    key: `rh${i}`,
    x: left.value + colW.value / 2,
    y: top.value + rowH.value * i + rowH.value + rowH.value / 2,
  }));
})
const inNameOffset = computed(() => {
  const colLabel = range(colIn.value).map((i) => tableData.value.headers[i]).join('');
  const rowLabel = range(rowIn.value).map((i) => tableData.value.headers[i + colIn.value]).join('');
  if (Math.max(colLabel.length, rowLabel.length) <= 2) return 0;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${fontLabelSize}px "${fontFamily}"`;
  let maxLen = Math.max(ctx.measureText(colLabel).width, ctx.measureText(rowLabel).width);
  maxLen = maxLen + parseInt(maxLen / 30) * 50
  return parseInt(maxLen);
})
const tableBody = computed(() => {
  return colHeader.value
    .map((c) =>
      rowHeader.value.map((r) => ({
        key: `tb${c.v}${r.v}`,
        v: tableMap.value[c.v + r.v],
        x: c.x,
        y: r.y,
      }))
    )
    .flat();
})
const tableMap = computed(() => {
  return tableData.value.body.reduce((acc, v) => {
    const [ins, out] = [
      v.slice(0, tableData.value.inputNum),
      v[tableData.value.inputNum + tableData.value.outIdx],
    ];
    acc[ins.join('')] = out;
    return acc;
  }, {});
})
const colW = computed(() => {
  return width.value / (1 + colIn.value * 2);
})
const rowH = computed(() => {
  return height.value / (1 + rowIn.value * 2);
})
const colIn = computed(() => {
  return (
    parseInt(tableData.value.inputNum / 2) +
    (tableData.value.inputNum === 3 && props.optView.A_BC_or_A_BC ? 1 : 0)
  );
})
const rowIn = computed(() => {
  return (
    tableData.value.inputNum -
    parseInt(tableData.value.inputNum / 2) -
    (tableData.value.inputNum === 3 && props.optView.A_BC_or_A_BC ? 1 : 0)
  );
})
const left = computed(() => offset)
const top = computed(() => offset)
const right = computed(() => offset + width.value)
const bottom = computed(() => offset + height.value)
const selects = computed(() => selects_.map((_) => _.split(',').map((_) => parseInt(_) - 1)))
const group = computed(() => {
  return group_.map((_) =>
    _.split('@')
      .sort()
      .map((_) => _.split(',').map((_) => parseInt(_) - 1))
  );
})
const groupStr = computed(() => {
  const [ch, rh] = [colHeader.value, rowHeader.value];
  return group.map((_) =>
    _.map((_) => {
      const [x, y] = _;
      const label = ch[x].v + rh[y].v;
      return label;
    })
  );
})
const colors = computed(() => {
  const ret = range((tableData.value.inputNum - parseInt(tableData.value.inputNum / 2)) * 2).map(
    (_) => range(parseInt(tableData.value.inputNum / 2) * 2).fill('black')
  );
  selects.value.forEach((_) => {
    const [x, y] = _;
    if (x >= 0 && y >= 0) {
      ret[x][y] = 'crimson';
    }
  });
  return ret;
})
const arcs = computed(() => circles.value.filter((_) => _.type === 'arc'))
const ellipses = computed(() => circles.value.filter((_) => _.type === 'ellipse'));
const rects = computed(() => circles.value.filter((_) => _.type === 'rect'));
const bezs = computed(() => circles.value.filter((_) => _.type === 'bez'));
const circles = computed(() => {
  const ret = [];
  const addArc = (x1, y1, x2, y2, w, h, f2) => {
    const [ajx, px] = x1 === x2 ? [colW.value / 2.4, 0] : [-4, 2];
    const [ajy, py] = y1 == y2 ? [rowH.value / 2.4, 0] : [-4, 2];
    ret.push({
      type: 'arc',
      x1: left.value + (x1 + 1) * colW.value + inNameOffset.value + px,
      y1: top.value + (y1 + 1) * rowH.value + py,
      rx: (w / 2) * colW.value + ajx,
      ry: (h / 2) * rowH.value + ajy,
      katamuki: 0,
      f1: 1,
      f2: f2 === 'r' ? 1 : 0,
      x2: left.value + (x2 + 1) * colW.value + inNameOffset.value - px,
      y2: top.value + (y2 + 1) * rowH.value - py,
      key: 'arc' + x1 + y1 + x2 + y2,
    });
  }
  const addBez = (x1, y1, cx, cy, x2, y2, px1, px2, py1, py2) => {
    ret.push({
      type: 'bez',
      x1: left.value + (x1 + 1) * colW.value + px1 + inNameOffset.value,
      y1: top.value + (y1 + 1) * rowH.value + py1,
      cx: left.value + (cx + 1) * colW.value + inNameOffset.value,
      cy: top.value + (cy + 1) * rowH.value,
      x2: left.value + (x2 + 1) * colW.value + px2 + inNameOffset.value,
      y2: top.value + (y2 + 1) * rowH.value + py2,
      key: 'arc2' + x1 + y1 + x2 + y2,
    });
  };
  const addEllipse = (x, y, w, h) => {
    ret.push({
      type: 'ellipse',
      cx: left.value + (x + 1) * colW.value + (w / 2) * colW.value + inNameOffset.value,
      cy: top.value + (y + 1) * rowH.value + (h / 2) * rowH.value,
      rx: (w * colW.value) / 2 - 2,
      ry: (h * rowH.value) / 2 - 2,
      key: 'ellipse' + x + y + w + h,
    });
  };
  const addRect = (x, y, w, h) => {
    ret.push({
      type: 'rect',
      x: left.value + (x + 1) * colW.value + 8 + inNameOffset.value,
      y: top.value + (y + 1) * rowH.value + 8,
      width: w * colW.value - 16,
      height: h * rowH.value - 16,
      rx: 16,
      ry: 16,
      key: 'rect' + x + y + w + h,
    });
  };

  // 汚染
  Set.prototype.min = function () {
    return Math.min(...this.values());
  };
  Set.prototype.max = function () {
    return Math.max(...this.values());
  };
  group.value.forEach((set) => {
    const xs = new Set(set.map((_) => _[0]));
    const ys = new Set(set.map((_) => _[1]));
    const [xmax, xmin, ymax, ymin] = [xs.max(), xs.min(), ys.max(), ys.min()];
    // input=4で四隅が選択されている場合
    if (xs.size === 2 && xmax - xmin > 1 && ys.size === 2 && ymax - ymin > 1) {
      addBez(xmin + 1, ymin, xmin + 1, ymin + 1, xmin, ymin + 1, -4, 0, 0, -4); // 7
      addBez(xmax, ymin, xmax, ymin + 1, xmax + 1, ymin + 1, 4, 0, 0, -4); // 9
      addBez(xmin, ymax, xmin + 1, ymax, xmin + 1, ymax + 1, 0, -4, 4, 0); // 3
      addBez(xmax + 1, ymax, xmax, ymax, xmax, ymax + 1, 0, 4, 4, 0); // 1
      // 横の端と端
    } else if (xs.size == 2 && xmax - xmin > 1) {
      addArc(xmin, ymin, xmin, ymax + 1, 1, ymax - ymin + 1, 'r');
      addArc(xmax + 1, ymin, xmax + 1, ymax + 1, 1, ymax - ymin + 1, 'l');
      // 縦の端と端
    } else if (ys.size == 2 && ymax - ymin > 1) {
      addArc(xmin, ymin, xmax + 1, ymin, xmax - xmin + 1, 1, 'l');
      addArc(xmin, ymax + 1, xmax + 1, ymax + 1, xmax - xmin + 1, 1, 'r');
      // 全部
    } else if (xs.size == colIn.value * 2 && ys.size == rowIn.value * 2) {
      addRect(xmin, ymin, xmax - xmin + 1, ymax - ymin + 1);
    } else {
      addEllipse(xmin, ymin, xmax - xmin + 1, ymax - ymin + 1);
    }
  });
  return ret;
})
const terms = computed(() => {
  const labels = group.value.map((_) =>
    _.map((_) => {
      const [x, y] = _;
      const label = colHeader.value[x].v + rowHeader.value[y].v;
      return label;
    })
  );
  return labels
    .map((l) => l.reduce((acc, v) => acc | (parseInt(l[0], 2) ^ parseInt(v, 2)), 0))
    .map((_) => _.toString(2).padStart(colIn.value + rowIn.value, '0'))
    .map((_, li) =>
      _.split('')
        .map((bit, idx) =>
          bit === '0' ? { input: tableData.value.headers[idx], sign: labels[li][0][idx] } : null
        )
        .filter((_) => _)
    )
    .map((_) =>
      _.sort(
        (a, b) =>
          props._tableData.headers.indexOf(a.input) - props._tableData.headers.indexOf(b.input)
      )
    );
})
const mathjax = computed(() => {
  nextTick(function () {
    if (MathJax && MathJax.Hub) MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'editor-output']);
  });
  const str =
    terms.value.length === 0
      ? '0'
      : terms.value.length === 1 && terms.value[0].length === 0
        ? '1'
        : terms.value
          .map((_) =>
            _.length === 0
              ? '1'
              : _.map((_) => (_.sign === '1' ? _.input : `\\overline{${_.input}}`)).join(
                ` \\cdot `
              )
          )
          .join('+');

  return `$$${tableData.value.outName} = ${str}$$`;
})
const wordStr = computed(() => {
  // クリップボードに出力する文字列を生成する部分。
  // LaTeX形式で出力
  return (
    tableData.value.outName +
    ' = ' +
    (terms.value.length === 0
      ? '0' //何も囲まれていない場合
      : terms.value.length === 1 && terms.value[0].length === 0
        ? '1' //すべて囲まれている場合
        : terms.value
          .map((term) => {
            let buff = '';
            let psign = '';
            if (term.length === 0) buff = '1';
            for (let i = 0; i < term.length; i++) {
              const pad = i === 0 ? '' : ' \\cdot ';
              //  psign === '0' && term[i].sign === '0' ? '' : psign === '0' ? '\\cdot' : '';
              const sign = term[i].sign === '1' ? '' : '\\bar ';
              psign = term[i].sign;
              buff += pad + sign + term[i].input;
            }
            return buff;
          })
          .join(' + '))
  );
})

function svgArc(v) {
  if (!v) return '';
  return `M${v.x1} ${v.y1} A${v.rx} ${v.ry} ${v.katamuki} ${v.f1} ${v.f2} ${v.x2} ${v.y2}`;
}

function svgBez(v) {
  if (!v) return '';
  return `M${v.x1} ${v.y1} Q${v.cx} ${v.cy} ${v.x2} ${v.y2}`;
}

function exportData() {
  return { grp: group_ };
}

function copy4word() {
  navigator.clipboard.writeText(wordStr.value);
  emit('msg', t('数式をLaTeX形式でコピーしました。'));
}

function select(ev) {
  const selectCell = (x, y) => {
    return [parseInt(x / colW.value), parseInt(y / rowH.value)];
  };
  const bcr = svgRoot.value.getBoundingClientRect();
  const [ox, oy] = [bcr.x, bcr.y].map((_) => parseInt(_));
  const sc = selectCell(ev.clientX - ox - left.value - inNameOffset.value, ev.clientY - oy - top.value);
  if (sc[0] < 1 || colIn.value * 2 < sc[0] || sc[1] < 1 || rowIn.value * 2 < sc[1]) return;
  const scs = sc.join(',');
  const hasIdx = selects_.indexOf(scs);
  if (hasIdx >= 0) {
    selects_.splice(hasIdx, 1);
  } else {
    selects_.push(scs);
  }
}
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
function grouping() {
  const labels = selects.value.map((_) => {
    const [x, y] = _;
    const label = colHeader.value[x].v + rowHeader.value[y].v;
    return label;
  });
  const vs = labels.map((_) => tableMap.value[_]);
  if (vs.includes('0')) {
    emit('msg', t('0を含んで囲むことはできません。'));
    return;
  }
  const len = vs.length;
  if (len === 0) {
    emit('msg', t('1つ以上選択してから囲みましょう。'));
    return;
  }
  if ((len & (len - 1)) !== 0) {
    emit('msg', t('囲む数は2のべき乗にしましょう。'));
    return;
  }
  if (!isAllNeighbor(selects.value)) {
    emit('msg', t('隣接したセルを選びましょう。'));
    return;
  }
  const selectsStr = selects_.sort().join('@');
  const hasIdx = group_.indexOf(selectsStr);
  if (hasIdx >= 0) {
    group_.splice(hasIdx, 1);
    emit('msg', t('囲みを解除しました。'));
  } else {
    group_.push(selectsStr);
    emit('msg', t('囲みました。'));
  }
  deselection();
}
function deselection() {
  selects_.splice(0, selects_.length);
}
function combination(nums, k) {
  let ans = [];
  if (nums.length < k) return [];
  if (k === 1) {
    for (let i = 0; i < nums.length; i++) {
      ans[i] = [nums[i]];
    }
  } else {
    for (let i = 0; i < nums.length - k + 1; i++) {
      let row = combination(nums.slice(i + 1), k - 1);
      for (let j = 0; j < row.length; j++) {
        ans.push([nums[i]].concat(row[j]));
      }
    }
  }
  return ans;
}
function autoGrouping() {
  const indices = range(colIn.value * 2)
    .map((c) => range(rowIn.value * 2).map((r) => [c, r]))
    .flat();
  const label = xy => colHeader.value[xy[0]].v + rowHeader.value[xy[1]].v;
  const allLabels = indices.map((_) => label(_));
  // 総当りで求める
  const maxCombN = colIn.value * 2 * rowIn.value * 2;
  const getAllCombLabels = (n) => {
    if (n === 1) return combination(allLabels, n);
    else return combination(allLabels, n).concat(getAllCombLabels(n / 2));
  };
  const allCombLabels = getAllCombLabels(maxCombN);
  // 0を含むもの、1を含まないものを除外
  const acc1 = allCombLabels.filter(
    (comb) =>
      !comb.some((_) => tableMap.value[_].includes('0')) &&
      comb.some((_) => tableMap.value[_].includes('1'))
  );
  // 隣あっているものに限定。効率は悪いがlabelを一度indexに戻す
  const _grping = (acc, v, idx) => {
    acc[v.v] = idx;
    return acc;
  };
  const ch2idx = colHeader.value.reduce(_grping, {});
  const rh2idx = rowHeader.value.reduce(_grping, {});
  const acc2 = acc1.map((_) =>
    _.map((_) => {
      const [xl, yl] = [_.slice(0, colIn.value), _.slice(colIn.value)];
      return [ch2idx[xl], rh2idx[yl]];
    })
  );
  // console.log(ch2idx, rh2idx);

  const acc3 = acc2.filter((_) => isAllNeighbor(_));
  // 同じ要素を含んでいるものを削除。ドントケアは無視する。
  const isSuperset = (set, subset) => {
    for (let elem of subset) {
      if (!set.has(elem)) return false;
    }
    return set.size !== subset.size; // 「⊆」ではなく「⊂」とする
  };
  function union(setA, setB) {
    let _union = new Set(setA);
    for (let elem of setB) {
      _union.add(elem);
    }
    return _union;
  }
  function eqSet(as, bs) {
    if (as.size !== bs.size) return false;
    for (let a of as) if (!bs.has(a)) return false;
    return true;
  }
  function difference(setA, setB) {
    let _difference = new Set(setA);
    for (let elem of setB) {
      _difference.delete(elem);
    }
    return _difference;
  }
  const toOneList = (_) =>
    Array.from(_).filter((_) => tableMap.value[label(_.split(','))] === '1');

  const acc4 = acc3
    .map((_) => new Set(_.map((_) => _.join(','))))
    .filter((v, _, arr) => !arr.some((_) => isSuperset(_, v)))
    .filter(
      (v, _, arr) =>
        !arr.some(
          (_) => _.size >= v.size && isSuperset(new Set(toOneList(_)), new Set(toOneList(v)))
        )
    );

  // ある程度絞った「囲み」の組み合わせを全て求めて、
  // 出力が1となるセルを全て含む組み合わせを総当りで求める
  // 優先順位：項の少なさ > 各項のシンプルさ
  const oneList = allLabels
    .filter((label) => tableMap.value[label].includes('1'))
    .map((_) => {
      const [xl, yl] = [_.slice(0, colIn.value), _.slice(colIn.value)];
      return [ch2idx[xl], rh2idx[yl]].join(',');
    });
  const oneSet = new Set(oneList);
  const getGrpComb = (arr) => {
    const getAns = (comb) =>
      comb.filter((sets) => {
        const set = sets.reduce((acc, v) => union(acc, v));
        return eqSet(set, oneSet) || isSuperset(set, oneSet);
      });
    const helper = (n) => {
      if (n >= arr.length) return getAns(combination(arr, n));
      else {
        const ans = getAns(combination(arr, n));
        if (ans.length > 0) return ans;
        else return helper(n + 1);
      }
    };
    return helper(1);
  };

  const acc5 = getGrpComb(acc4);
  acc5.sort((a, b) => {
    const first = a.length - b.length;
    const second =
      a.reduce((acc, v) => acc + v.size, 0) - b.reduce((acc, v) => acc + v.size, 0);
    return first !== 0 ? first : second;
  });

  group_.splice(0, group_.length);
  acc5[0].map((_) =>
    Array.from(_)
      .map((_) =>
        _.split(',')
          .map((_) => parseInt(_) + 1)
          .join(',')
      )
      .sort()
      .join('@')
  ).forEach(_ => group_.push(_));
}
function reset() {
  deselection();
  group_.splice(0, group_.length);
}
function save(ext) {
  const svg = svgRoot.value;
  const svgString = new XMLSerializer().serializeToString(svg);
  if (ext === 'png') {
    const canvas = document.createElement('canvas');
    canvas.width = svg.width.baseVal.value;
    canvas.height = svg.height.baseVal.value;
    const ctx = canvas.getContext('2d');

    let image = new Image();
    image.onload = () => {
      ctx.drawImage(image, 0, 0, image.width, image.height);
      let link = document.createElement('a');
      link.href = canvas.toDataURL(); // 描画した画像のURIを返す data:image/png;base64
      link.download = `${tableData.value.outName}.png`;
      link.click();
    };
    image.onerror = (error) => {
      console.log(error);
    };
    image.src = 'data:image/svg+xml;charset=utf-8;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  } else if (ext === 'svg') {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = svgUrl;
    a.download = `${tableData.value.outName}.svg`;
    a.click();
    URL.revokeObjectURL(svgUrl);
  } else {
    console.log(`非対応の拡張子：${ext}`);
  }
}

// groupがgroup_を参照しているのでgroupを直接変形したい時におかしくなるの回避
function regroup(grp) {
  group_.splice(0, group_.length);
  grp.forEach(_ => group_.push(_))
}

function regroup4changeView(abbaNew, abbaOld, a_bcNew, a_bcOld) {
  // 2n変数の場合はxとyを入れ替えるだけ
  if (tableData.value.inputNum % 2 === 0) {
    if (abbaNew !== abbaOld) {
      regroup(group.value.map((grp) => grp.map(([x, y]) => `${y + 1},${x + 1}`).join('@')));
    }
    return;
  }
  // 3変数の場合オプションの適用順序によって変形順序が異なるので、
  // 一度全ての変形を標準に戻してからオプションに従って変形をする。
  // 綺麗な法則が分からなかったので愚直に変換をする。数式から戻すのが理想か…？
  group_.splice(0, group_.length);

  // まずは戻す
  group.value.map((grp) =>
    grp
      .map(([x, y]) => {
        let [dx, dy] = [x, y];
        if (abbaOld) {
          const _dx = x < 2 ? 3 * y : 1 + y;
          const _dy = x % 3 === 0 ? 0 : 1;
          [x, y] = a_bcOld ? [_dx, _dy] : [y, x];
        }
        if (abbaOld || a_bcOld) {
          dx = x < 2 ? 0 : 1;
          dy = x % 3 === 0 ? y : 3 - y;
        }
        return `${dx + 1},${dy + 1}`;
      })
      .join('@')
  )
  // 次に変形
  regroup(group.value.map((grp) =>
    grp
      .map(([x, y]) => {
        let [dx, dy] = [x, y];
        if (abbaNew || a_bcNew) {
          dx = y % 3 === 0 ? 0 : 1;
          dy = x === 0 ? (y < 2 ? 0 : 1) : y < 2 ? 3 : 2;
        }
        if (a_bcNew) {
          const [_dx, _dy] = [dy, dx];
          dx = _dx % 3 === 0 ? _dy : 3 - _dy;
          dy = _dx < 2 ? 0 : 1;
          [dx, dy] = abbaNew ? [dx, dy] : [_dx, _dy];
        }
        return `${dx + 1},${dy + 1}`;
      })
      .join('@')
  ));
}
onMounted(() => {
  console.log('mounted' + tableData.value.outName);
  Object.assign(group, tableData.value.grp || []);
})
watch(group_, () => { emit('grouped', [tableData.value.outIdx, group_]); })
watch(() => props.optView.A_BC_or_A_BC, (newV, oldV) => {
  regroup4changeView(props.optView.AB_or_BA, props.optView.AB_or_BA, newV, oldV);
})
watch(() => props.optView.AB_or_BA, (newV, oldV) => {
  regroup4changeView(newV, oldV, props.optView.A_BC_or_A_BC, props.optView.A_BC_or_A_BC);
})
</script>

<style scoped>
/* .karnaugh {
  border: 1px black solid; 
} */
svg {
  user-select: none;
}

.fomulas {
  justify-content: center;
  margin-left: -3px;
  margin-bottom: -4px;
  margin-right: 4px;
  max-width: 600px;
}

#fomula {
  overflow-x: scroll;
  font-size: 12px;
  flex-basis: calc(95% - 48px);
  padding-left: 8px;
}

.fomulas button {
  width: 48px
}
</style>
        