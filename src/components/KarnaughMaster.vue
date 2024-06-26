<template>
  <div class="karnaugh">
    <svg :width="svgWidth" :height="svgHeight" ref="svgRootRef">
      <template v-if="tableData.meta.inputNum > 4">
        <text :x="kvi.dimColHeaderLabel.x" :y="kvi.dimColHeaderLabel.y" :font-size="kvi.fontLabelSize"
          :font-family="kvi.fontLabelFam" text-anchor="middle" dominant-baseline="central" fill="black">
          {{ kvi.dimColHeaderLabel.v }} </text>
        <text v-for="v in kvi.dimColHeader" :x="v.x" :y="v.y" text-anchor="middle" dominant-baseline="central"
          fill="black" :font-size="kvi.fontInSize">{{
      v.v }}</text>
      </template>
      <template v-if="tableData.meta.inputNum > 5">
        <line :x1="kvi.padding + 8" :y1="kvi.padding + 8" :x2="offsets[0].x" :y2="offsets[0].y" stroke="black"
          :stroke-width="kvi.cellBorderSw" />
        <text :x="kvi.dimRowHeaderLabel.x" :y="kvi.dimRowHeaderLabel.y" :font-size="kvi.fontLabelSize"
          :font-family="kvi.fontLabelFam" text-anchor="middle" dominant-baseline="central" fill="black">
          {{ kvi.dimRowHeaderLabel.v }}
        </text>
        <text v-for="v in kvi.dimRowHeader" :x="v.x" :y="v.y" text-anchor="middle" dominant-baseline="central"
          fill="black" :font-size="kvi.fontInSize">{{ v.v }}</text>
      </template>
      <KarnaughChild v-for="(v, idx) in subTables" :tableData="v" :offset="offsets[idx]" :config="config" :idx="idx"
        :key="idx" ref="karnaughChildRef" @edit="edit">
      </KarnaughChild>
    </svg>
    <v-row class="fomulas" :style="{ maxWidth: Math.max(600, svgWidth) + 'px' }">
      <div id="fomula" v-html="mathjax"></div>
      <v-btn class="ma-2" variant="text" icon @click="copy4word">
        <v-icon>mdi-file-word-outline</v-icon>
      </v-btn>
    </v-row>
    <v-overlay v-model="isAutoGrouping" persistent width="auto" class="align-center justify-center">
      <v-progress-circular indeterminate color="white" size="128" width="12" class="mb-0"></v-progress-circular>
    </v-overlay>
  </div>
</template>

<script setup>
import { saveAs } from 'file-saver';
import { computed, nextTick, provide, reactive, readonly, ref, watch } from 'vue';
import { useI18n } from "vue-i18n";
import { useComputedReactive } from '../composables/useComputedReactive';
import { useKarnaghViewInfo } from '../composables/useKarnaughViewInfo';
import { useWebWorkerAsync } from '../composables/useWebWorkerAsync';
import KarnaughChild from './KarnaughChild.vue';
const { t } = useI18n({ useScope: "global" });
const { computedReactive } = useComputedReactive();
const { webWorkerAsync } = useWebWorkerAsync();

const emit = defineEmits(['msg', 'grouped', 'edit']);
defineExpose({ deselection, grouping, autoGrouping, reset, save });

const range = (n) => [...Array(n).keys()];

const props = defineProps({
  _tableData: {
    body: [],
    meta: {
      inputNum: Number,
      outputNum: Number
    },
    headers: [],
    outName: String,
    outIdx: Number,
    groups: [{
      grp: [],
      rowGrp: [],
      colGrp: [],
      allGrp: [],
    }],
  },
  viewOpt: {
    AB_or_BA: Boolean,
    A_BC_or_A_BC: Boolean,
    // ABCD_EF_or_AB_CDEF: Boolean,
  },
  drawOpt: {
    oneCell: Number,
    padding: Number,
    outBorderSw: Number,
    cellBorderSw: Number,
    fontInFam: String,
    fontInSize: Number,
    fontLabelFam: String,
    fontLabelSize: Number,
    fontBodyFam: String,
    fontBodySize: Number,
    strokeMap: {
      grp: {
        sw: Number,
        sc: String
      },
      rowGrp: {
        sw: Number,
        sc: String
      },
      colGrp: {
        sw: Number,
        sc: String
      },
      allGrp: {
        sw: Number,
        sc: String
      }
    }
  },
  config: {
    directEdit: Boolean
  }
});

const figureMargin = 16;
const svgRootRef = ref(null);
const karnaughChildRef = ref(null);
const isAutoGrouping = ref(false);
// subTablesが再計算されるたびにグループが初期化されるのを防ぐ
const groups = reactive([]);

const tableData = computedReactive(() => {
  // 入力ラベルの描画順序を変えない場合は何もしない
  if (!props.viewOpt.AB_or_BA) return props._tableData;
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
    props._tableData.meta.inputNum === 2
      ? [1, 0]
      : props._tableData.meta.inputNum === 3 && props.viewOpt.A_BC_or_A_BC
        ? [1, 2, 0]
        : props._tableData.meta.inputNum === 3 && !props.viewOpt.A_BC_or_A_BC
          ? [2, 0, 1]
          : props._tableData.meta.inputNum === 4
            ? [2, 3, 0, 1]
            : [2, 3, 0, 1];

  return replaceTableData(Object.assign({}, props._tableData), indices);
});
const subTables = computed(() => {
  // 4入力以下のテーブルに分割する
  function splitBody2In4(body, axis) {
    const bodies = [0, 1].map(v => body.filter(_ => _[axis] == v)).map(_ => _.reduce((acc, v) => {
      acc.push(v.filter((_, idx) => idx !== axis));
      return acc;
    }, []));
    if ((body[0].length - tableData.meta.outputNum) < 6) return bodies;
    else return bodies.flatMap(_ => splitBody2In4(_, axis));
  }
  groups.splice(0, groups.length);
  if (props._tableData.meta.inputNum <= 4) {
    groups[0] = props._tableData.groups[0];
    return [{
      inputNum: tableData.meta.inputNum,
      headers: tableData.headers,
      outName: tableData.outName,
      outIdx: tableData.outIdx,
      groups: groups[0],
      body: tableData.body
    }];
  } else {
    // const axis = props.viewOpt.ABCD_EF_or_AB_CDEF ? 1 : 4;
    const headers = tableData.headers.slice(0, 4); // この値は使われないけど一応
    const bodies = splitBody2In4(tableData.body, 4);
    bodies.forEach((_, idx) => {
      groups[idx] = props._tableData.groups[idx] || {
        grp: [],
        rowGrp: [],
        colGrp: [],
        allGrp: [],
      };
    });
    return bodies.map((body, idx) => ({
      body,
      outputNum: tableData.meta.outputNum,
      inputNum: 4,
      headers,
      outName: tableData.outName,
      outIdx: tableData.outIdx,
      groups: groups[idx]
    }));
  }
});
const kvi = computedReactive(() => useKarnaghViewInfo(tableData, props.drawOpt, props.viewOpt));
provide('karnaughViewInfo', readonly(kvi));
const baseOffset = computed(() => props._tableData.meta.inputNum <= 4 ? 0 : props.drawOpt.oneCell);
const svgWidth = computed(() =>
  baseOffset.value + (props._tableData.meta.inputNum <= 4 ? kvi.width :
    (kvi.width * 2 + figureMargin + kvi.outerInNameWidth))
);
const svgHeight = computed(() =>
  props._tableData.meta.inputNum <= 4 ? kvi.height :
    props._tableData.meta.inputNum <= 5 ? kvi.height + baseOffset.value :
      baseOffset.value + (kvi.height * 2 + figureMargin)
);
const offsets = computed(() => [
  { x: baseOffset.value + kvi.outerInNameWidth, y: baseOffset.value },
  { x: baseOffset.value + kvi.outerInNameWidth + kvi.width + figureMargin, y: baseOffset.value },
  { x: baseOffset.value + kvi.outerInNameWidth, y: baseOffset.value + kvi.height + figureMargin },
  { x: baseOffset.value + kvi.outerInNameWidth + kvi.width + figureMargin, y: baseOffset.value + kvi.height + figureMargin }
]);
// 汚染
Set.prototype.min = function () {
  return Math.min(...this.values());
};
Set.prototype.max = function () {
  return Math.max(...this.values());
};

const terms = computed(() => {
  const labels = groups.flatMap((k, idx) => {
    const getIdx = (grp) => grp.map(_ => _.split('@').map(xy => xy.split(',').map(_ => parseInt(_))));
    const dimLabelE = idx => tableData.headers[4] ? (idx % 2 === 0 ? '0' : '1') : '';
    const dimLabelF = idx => tableData.headers[5] ? (idx < 2 ? '0' : '1') : '';

    const ret = [];
    ret.push(...getIdx(k.grp).map(_ => _.map(([x, y]) => kvi.colHeader[x].v + kvi.rowHeader[y].v + dimLabelE(idx) + dimLabelF(idx))));
    // 縦横に跨るグループは2個目(idx=1)と3個目(idx=2)の図を見れば網羅できる
    if (idx === 1) {
      ret.push(...getIdx(k.rowGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].map(_ => kvi.colHeader[x].v + kvi.rowHeader[y].v + _ + dimLabelF(idx)))));
      ret.push(...getIdx(k.colGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].map(_ => kvi.colHeader[x].v + kvi.rowHeader[y].v + dimLabelE(idx) + _))));
    } else if (idx === 2) {
      ret.push(...getIdx(k.rowGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].map(_ => kvi.colHeader[x].v + kvi.rowHeader[y].v + _ + dimLabelF(idx)))));
      ret.push(...getIdx(k.colGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].map(_ => kvi.colHeader[x].v + kvi.rowHeader[y].v + dimLabelE(idx) + _))));
      ret.push(...getIdx(k.allGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].flatMap(e => ['0', '1'].flatMap(f => kvi.colHeader[x].v + kvi.rowHeader[y].v + e + f)))));
    }
    return ret;
  });

  return labels
    .map((l) => l.reduce((acc, v) => acc | (parseInt(l[0], 2) ^ parseInt(v, 2)), 0))
    .map((_) => _.toString(2).padStart(tableData.meta.inputNum, '0'))
    .map((_, li) =>
      _.split('')
        .map((bit, idx) =>
          bit === '0' ? { input: tableData.headers[idx], sign: labels[li][0][idx] } : null
        )
        .filter((_) => _)
    )
    .map((_) =>
      _.sort(
        (a, b) =>
          tableData.headers.indexOf(a.input) - tableData.headers.indexOf(b.input)
      )
    );
});
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

  return `$$${tableData.outName} = ${str}$$`;
});
const wordStr = computed(() => {
  // クリップボードに出力する文字列を生成する部分。
  // LaTeX形式で出力
  return (
    tableData.outName +
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
});

function copy4word() {
  navigator.clipboard.writeText(wordStr.value);
  emit('msg', t('数式をLaTeX形式でコピーしました。'));
}

function grouping() {
  // selects := [[[x,y]], ['0000', '0001', ...],...]
  const selects = karnaughChildRef.value.map(_ => _.getSelects());
  // 各カルノー図の選択が基本的な条件を満たしているかチェック
  // 5変数以上のチェックは別で行う
  if (!selects.some(_ => _[0].length > 0)) {
    emit('msg', t('1つ以上選択してから囲みましょう。'));
    return;
  }
  for (let i = 0; i < selects.length; i++) {
    const [xy, labels, values, _selects] = selects[i];
    if (values.includes('0')) {
      emit('msg', t('0を含んで囲むことはできません。'));
      return;
    }
    if ((values.length & (values.length - 1)) !== 0) {
      emit('msg', t('囲む数は2のべき乗にしましょう。'));
      return;
    }
    if (!kvi.isAllNeighbor(xy)) {
      emit('msg', t('隣接したセルを選びましょう。'));
      return;
    }
  }

  // ここで同じペアが含まれているか比較するために文字列化
  const selectsStr = selects.map(_ => _[3].sort().join('@'));

  // 指定されたグループで囲むor囲みを解除するヘルパー
  function helper(key) {
    subTables.value.forEach((v, idx) => {
      if (selects[idx][0].length === 0) return;
      const hasIdx = subTables.value[idx].groups[key].indexOf(selectsStr[idx]);
      if (hasIdx >= 0) {
        subTables.value[idx].groups[key].splice(hasIdx, 1);
        emit('msg', t('囲みを解除しました。'));
      } else {
        subTables.value[idx].groups[key].push(selectsStr[idx]);
        emit('msg', t('囲みました。'));
        emit('grouped', { oidx: tableData.outIdx, groups });
      }
    });
  }

  const strSet = new Set(selectsStr.filter(_ => _ !== ''));
  if (strSet.size !== 1) {
    emit('msg', t('各図で同じ座標のセルを選びましょう。'));
    return;
  }

  // 5変数以上でカルノー図をまたいで選択している場合の数(4変数以下の時は1)
  const kdim = selects.filter(_ => _[0].length > 0).length;
  if (kdim === 1) {
    helper('grp');
  } else if (kdim === 2) {
    const [fidx, lidx] = [selects.findIndex(_ => _[0].length > 0), selects.findLastIndex(_ => _[0].length > 0)];
    const idxSum = (fidx + lidx) % 4;
    // 0 1 カルノー図は左のIndexで配置されるので、
    // 2 3 indexを加算して%4の合計が1だと横、2の倍数だと縦、3だと斜め
    if (idxSum === 1) {
      helper('rowGrp');
    } else if ((idxSum % 2) === 0) {
      helper('colGrp');
    } else if (idxSum === 3) {
      emit('msg', t('隣り合う図を選択しましょう。'));
      return;
    }
  } else if (kdim === 3) {
    emit('msg', t('囲む数は2のべき乗にしましょう。'));
    return;
  } else if (kdim === 4) {
    helper('allGrp');
  }
  deselection();
}
function deselection() {
  karnaughChildRef.value.forEach(_ => _.deselection());
}

// 各子カルノー図が求めた4変数未満単位の最小項を使って、完全な最小項を組み合わせを総当りで求める
async function autoGrouping() {
  function eqSet(as, bs) {
    if (as.size !== bs.size) return false;
    for (let a of as) if (!bs.has(a)) return false;
    return true;
  }
  const getDiff = (a, b) => a.filter(aa => !b.some(bb => eqSet(aa, bb))); // a-b

  // 各groupを初期化
  groups.forEach(g => {
    g.grp.splice(0, g.grp.length);
    g.colGrp.splice(0, g.colGrp.length);
    g.rowGrp.splice(0, g.rowGrp.length);
    g.allGrp.splice(0, g.allGrp.length);
  });

  // 各4カルノー図
  const { canGroups, _groups, oneLists } = karnaughChildRef.value.reduce((acc, v) => {
    const { canGroup, group, oneList } = v.autoGrouping();
    acc.canGroups.push(canGroup);
    acc._groups.push(group || []);
    acc.oneLists.push(oneList);
    return acc;
  }, { canGroups: [], _groups: [], oneLists: [] });
  if (oneLists.every(_ => _.length === 0)) return;
  const acc6 = [];
  // groupにある値を改めてall,col,rowでくくる
  // その時、groupは他カルノー図の1かdon't careとペアを組める
  // 既存groupと再くくりの結果の全ての組み合わせで、onSetを網羅する最小項数を探す
  const allGrp = [];
  if (tableData.meta.inputNum === 6) {
    const noDup = _groups.map(g => g.filter(gg => canGroups.every(c => c(gg)))).reduce((acc, v) => {
      v.map(set => Array.from(set).join('@')).forEach(_ => acc.add(_));
      return acc;
    }, new Set());
    Array.from(noDup).map(_ => new Set(_.split('@'))).forEach(_ => allGrp.push(_));
  }

  const [rowIdxMap, colIdxMap] = [[1, 0, 3, 2], [2, 3, 0, 1]];
  range(4).forEach((_, idx) => acc6[idx] = { grp: [], rowGrp: [], colGrp: [], allGrp: allGrp });
  _groups.forEach((group, idx) => {
    const rowGrp = getDiff(group.filter(g => canGroups[rowIdxMap[idx]]?.(g)), allGrp || []); // [0,1] [1,0] [2,3] [3,2]
    const colGrp = getDiff(group.filter(g => canGroups[colIdxMap[idx]]?.(g)), allGrp || []); // [0,2] [1,3] [2,0] [3,1] 
    const grp = getDiff(getDiff(getDiff(group, colGrp), rowGrp), allGrp);
    acc6[idx].grp.push(...grp);
    acc6[idx].rowGrp.push(...rowGrp);
    acc6[idx].colGrp.push(...colGrp);
    acc6[idx].allGrp = allGrp;
  });

  // 組み合わせを計算しやすくするために全組み合わせを1次元の配列にする。例：acc7[X].all[Y] -> [X,all,Y]
  // 組み合わせ数を減らすためにデータをSetに変換して重複排除の枝刈りする
  const _kms = [];
  const acc7 = range(acc6.length).map((_, idx) => ({ grp: acc6[idx].grp, rowGrp: [], colGrp: [], allGrp: [] }));
  acc7[0].allGrp = allGrp;
  Array.from(new Set(Array.from(new Set([...acc6[0].rowGrp, ...acc6[1].rowGrp].map(_ => Array.from(_).join('@')))).map(_ => _.split('@'))))
    .forEach(rg => acc7[0].rowGrp.push(rg));
  Array.from(new Set(Array.from(new Set([...acc6[2].rowGrp, ...acc6[3].rowGrp].map(_ => Array.from(_).join('@')))).map(_ => _.split('@'))))
    .forEach(rg => acc7[2].rowGrp.push(rg));
  Array.from(new Set(Array.from(new Set([...acc6[0].colGrp, ...acc6[2].colGrp].map(_ => Array.from(_).join('@')))).map(_ => _.split('@'))))
    .forEach(rg => acc7[0].colGrp.push(rg));
  Array.from(new Set(Array.from(new Set([...acc6[1].colGrp, ...acc6[3].colGrp].map(_ => Array.from(_).join('@')))).map(_ => _.split('@'))))
    .forEach(rg => acc7[1].colGrp.push(rg));

  const kms = acc7.flatMap((grps, idx) => Object.keys(grps).flatMap(gkey => grps[gkey].map((v, subIdx) => [idx, gkey, subIdx])));

  const maxComb = acc7.reduce((acc, v) => acc + Object.values(v).reduce((acc, v) => acc + v.length, 0), 0);

  // webWorkerで処理できるように調整
  const task = (arg) => {
    const { vms, maxComb, kms, oneLists } = arg;
    function combination(nums, k) {
      let ans = [];
      if (nums.length < k || k < 1) return [];
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
    const getAns = (combs, funcKey) => {
      const [idxMapRow, idxMapCol] = [[1, 0, 3, 2], [2, 3, 0, 1]];
      return combs[funcKey](comb => {
        const fillSet = [[], [], [], []];
        comb.forEach(ks => {
          const [idx, key, subIdx] = ks;
          vms[idx][key][subIdx].forEach(g => {
            fillSet[idx].push(g);
            if (key === 'rowGrp') {
              fillSet[idxMapRow[idx]].push(g); // 0<-->1, 2<-->3
            } else if (key === 'colGrp') {
              fillSet[idxMapCol[idx]].push(g); // 0<-->2, 1<-->3
            } else if (key === 'allGrp') {
              fillSet[(idx + 1) % 4].push(g);
              fillSet[(idx + 2) % 4].push(g);
              fillSet[(idx + 3) % 4].push(g);
            }
          });
        });
        return oneLists.every((os, idx) => os.every(_ => fillSet[idx].includes(_)));
      });
    };
    const helper = (n) => {
      const ans = getAns(combination(kms, n), 'some');
      if (ans) return helper(n - 1);
      else return getAns(combination(kms, n + 1), 'filter');
    };
    return helper(maxComb - 1); // 処理の都合上、上から順に見ていく方が格段に早い(二分探索より早いことが多いはず)
  };
  if ((tableData.meta.inputNum === 6) && (kms.length > 10)) {
    emit('msg', t('囲んでいます。複雑なので結構時間がかかるかも。'));
    isAutoGrouping.value = true;
  }
  // console.time('autoGrouping');
  const taskArg = { vms: acc7, maxComb, kms, oneLists };
  const acc8 = window.Worker ? await webWorkerAsync(task, taskArg) : task(taskArg);
  // console.timeEnd('autoGrouping');
  isAutoGrouping.value = false;

  // 項数が同じ場合は、allGrp, colGrp=rowGrpの順で数が多くなるようにする
  const getScore = keys => {
    const [idx, key, subIdx] = keys;
    const grp = Array.from(acc7[idx][key][subIdx]);
    const weight = key === 'allGrp' ? 4 :
      (key === 'colGrp' || key === 'rowGrp') ? 2 : 1;
    return grp.length * weight;
  };
  acc8.sort((a, b) => {
    const first = a.length - b.length;
    const second = b.reduce((acc, v) => acc + getScore(v), 0) - a.reduce((acc, v) => acc + getScore(v), 0);
    return first !== 0 ? first : second;
  });
  acc8[0].forEach(ks => {
    const [idx, key, subIdx] = ks;
    const grp = Array.from(acc7[idx][key][subIdx])
      .map((_) =>
        _.split(',')
          .map((_) => parseInt(_))
          .join(',')
      )
      .sort()
      .join('@');
    groups[idx][key].push(grp);
    if (key === 'rowGrp') {
      groups[idx + ((idx % 2) === 0 ? 1 : -1)].rowGrp.push(grp); // 0<-->1, 2<-->3
    } else if (key === 'colGrp') {
      groups[idx + ((idx < 2) ? 2 : -2)].colGrp.push(grp); // 0<-->2, 1<-->3
    } else if (key === 'allGrp') {
      groups[(idx + 1) % 4].allGrp.push(grp);
      groups[(idx + 2) % 4].allGrp.push(grp);
      groups[(idx + 3) % 4].allGrp.push(grp);
    }
  });
  emit('grouped', { oidx: tableData.outIdx, groups });
};

function reset() {
  deselection();
  subTables.value.forEach(table => {
    Object.values(table.groups).forEach(_ => {
      _.splice(0, _.length);
    });
  });
}

function save(ext) {
  const svg = svgRootRef.value;
  const svgString = new XMLSerializer().serializeToString(svg);
  if (ext === 'png') {
    const canvas = document.createElement('canvas');
    canvas.width = svg.width.baseVal.value;
    canvas.height = svg.height.baseVal.value;
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.onload = () => {
      ctx.drawImage(image, 0, 0, image.width, image.height);
      let link = document.createElement('a');
      link.href = canvas.toDataURL(); // 描画した画像のURIを返す data:image/png;base64
      link.download = `${tableData.outName}.png`;
      link.click();
    };
    image.onerror = (error) => {
      console.error(error);
    };
    image.src = 'data:image/svg+xml;charset=utf-8;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  } else if (ext === 'svg') {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = svgUrl;
    a.download = `${tableData.outName}.svg`;
    a.click();
    URL.revokeObjectURL(svgUrl);
  } else if (ext === 'tex') {
    const str = createTexString();
    const blob = new Blob([str], {
      type: 'application/x-latex',
    });
    saveAs(blob, `${tableData.outName}.tex`);
  } else {
    console.warn(`非対応の拡張子：${ext}`);
  }
}

function createTexString() {
  const tableMaps = subTables.value.map(tb => tb.body.reduce((acc, v) => {
    acc[v.slice(0, tb.inputNum).join('')] = v[tb.inputNum + tb.outIdx];
    return acc;
  }, {}));
  const texIdxLabel = kvi.rowHeader.map((_, idx) => idx < 2 ? _.v : kvi.rowHeader[5 - idx].v)
    .flatMap(c => kvi.colHeader.map((_, idx) => idx < 2 ? _.v : kvi.colHeader[5 - idx].v).map(r => r + c));
  const texIdxBodies = tableMaps.map(tm => texIdxLabel.map((_, idx) => tm[_]));

  const [idxMapRow, idxMapCol] = [[1, 0, 3, 2], [2, 3, 0, 1]];
  const getTexIdx = ([x, y]) => {
    const _x = x < 2 ? x : 5 - x;
    const _y = y < 2 ? y : 5 - y;
    return _x + _y * kvi.colIn * 2;
  };
  const implicants = groups.flatMap((group, idx) =>
    Object.entries(group).flatMap(([key, gs]) =>
      gs.map(g => {
        const xys = g.split('@').map(xy => xy.split(',').map(_ => parseInt(_)));
        const xs = new Set(xys.map(_ => _[0]));
        const ys = new Set(xys.map(_ => _[1]));
        const [xmax, xmin, ymax, ymin] = [xs.max(), xs.min(), ys.max(), ys.min()];
        const dim = (key === 'grp') ? idx :
          key === 'rowGrp' ? [idx, idxMapRow[idx]].toSorted().join(',') :
            key === 'colGrp' ? [idx, idxMapCol[idx]].toSorted().join(',') :
              key === 'allGrp' ? '0,1,2,3' : '0';
        // input=4で四隅が選択されている場合
        if (xs.size === 2 && xmax - xmin > 1 && ys.size === 2 && ymax - ymin > 1) {
          return `\\implicantcorner{0}{0}{2}{2}{8}{8}{10}{10}[${dim}]`;
        } else if (xs.size == 2 && xmax - xmin > 1) { // 横の端と端
          // xminのymin ymaxと　xmaxのymin ymax
          const xmins = xys.filter(xy => xy[0] === xmin).sort((a, b) => (a[0] - b[0]) + (a[1] - b[1])).map(_ => getTexIdx(_));
          const xmaxs = xys.filter(xy => xy[0] === xmax).sort((a, b) => (a[0] - b[0]) + (a[1] - b[1])).map(_ => getTexIdx(_));
          return `\\implicantedge{${xmins[0]}}{${xmins[xmins.length - 1]}}{${xmaxs[0]}}{${xmaxs[xmins.length - 1]}}[${dim}]`;
        } else if (ys.size == 2 && ymax - ymin > 1) { // 縦の端と端
          // yminのxmin xmaxと　ymaxのxmin xmax
          const ymins = xys.filter(xy => xy[1] === ymin).sort((a, b) => (a[0] - b[0]) + (a[1] - b[1])).map(_ => getTexIdx(_));
          const ymaxs = xys.filter(xy => xy[1] === ymax).sort((a, b) => (a[0] - b[0]) + (a[1] - b[1])).map(_ => getTexIdx(_));
          return `\\implicantedge{${ymins[0]}}{${ymins[ymins.length - 1]}}{${ymaxs[0]}}{${ymaxs[ymins.length - 1]}}[${dim}]`;
        } else { // 全部
          const _xys = xys.sort((a, b) => (a[0] - b[0]) + (a[1] - b[1]));
          return `\\implicant{${getTexIdx(_xys[0])}}{${getTexIdx(_xys[_xys.length - 1])}}[${dim}]`;
        }
      })
    )
  );
  const dimMap = [0, 1, 1, 1, 1, 2, 4];
  const headerLabel = `[$${kvi.colHeaderLabel.v}$][$${kvi.rowHeaderLabel.v}$]`;
  const dimLabel = tableData.meta.inputNum > 4 ? `[$${((kvi.dimColHeaderLabel.v + ' ') || '') + kvi.dimRowHeaderLabel.v || ''}$]` : '';
  return `\\documentclass[a4paper]{article}
\\usepackage{karnaugh-map}
\\begin{document}

% 下にある*を抜くとカラーになります (詳細: https://ctan.org/pkg/karnaugh-map)
\\begin{karnaugh-map}*[${kvi.colIn * 2}][${kvi.rowIn * 2}][${dimMap[tableData.meta.inputNum]}]${headerLabel}${dimLabel}
\\manualterms{${texIdxBodies.map((v, idx) => v.join(',')).join(',')}}
${Array.from(new Set(implicants)).join('\n')}
\\end{karnaugh-map}

\\end{document}`;
}

// groupがgroup_を参照しているのでgroupを直接変形したい時におかしくなるの回避
function regroup(oldGrp, newGrp) {
  oldGrp.splice(0, oldGrp.length);
  newGrp.forEach(_ => oldGrp.push(_));
}

function regroup4changeView(abbaNew, abbaOld, a_bcNew, a_bcOld) {
  // 3変数以外の場合はxとyを入れ替えるだけ
  if (tableData.meta.inputNum !== 3) {
    if (abbaNew !== abbaOld) {
      subTables.value.forEach(table => {
        Object.values(table.groups).forEach(grp => {
          regroup(grp,
            grp.map(_ => _.split('@').map(xy => xy.split(','))
              .map(([x, y]) => `${parseInt(y)},${parseInt(x)}`).join('@'))
          );
        });
      });
    }
    return;
  }

  // 3変数の場合オプションの適用順序によって変形順序が異なるので、
  // 一度全ての変形を標準に戻してからオプションに従って変形をする。
  // 綺麗な法則が分からなかったので愚直に変換をする。数式から戻すのが理想か…？

  // まずは戻す
  const grp = groups[0].grp;
  regroup(grp, grp.map(_ => _.split('@').map(_ => _.split(',').map(_ => parseInt(_)))
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
      return `${dx},${dy}`;
    })
    .join('@')
  ));
  // 次に変形
  regroup(grp, grp.map(_ => _.split('@').map(_ => _.split(',').map(_ => parseInt(_)))
    .map(([x, y]) => {
      let [dx, dy] = [parseInt(x), parseInt(y)];
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

function edit(ev) {
  const { xy, idx } = ev;
  const dimLabelE = idx => tableData.headers[4] ? (idx % 2 === 0 ? '0' : '1') : '';
  const dimLabelF = idx => tableData.headers[5] ? (idx < 2 ? '0' : '1') : '';

  let label = '';
  if (props.viewOpt.AB_or_BA) {
    label += kvi.rowHeader[xy[1]].v + kvi.colHeader[xy[0]].v;
  } else {
    label += kvi.colHeader[xy[0]].v + kvi.rowHeader[xy[1]].v;
  }
  label += dimLabelE(idx) + dimLabelF(idx);
  emit('edit', label);
}

watch(() => props.viewOpt.AB_or_BA, (newV, oldV) => {
  regroup4changeView(newV, oldV, props.viewOpt.A_BC_or_A_BC, props.viewOpt.A_BC_or_A_BC);
});
watch(() => props.viewOpt.A_BC_or_A_BC, (newV, oldV) => {
  regroup4changeView(props.viewOpt.AB_or_BA, props.viewOpt.AB_or_BA, newV, oldV);
});
</script>

<style scoped>
.fomulas {
  justify-content: center;
  margin-left: -3px;
  margin-bottom: -4px;
  margin-right: 4px;
}

#fomula {
  overflow-x: scroll;
  scrollbar-width: thin;
  font-size: 12px;
  flex-basis: calc(95% - 48px);
  padding-left: 8px;
  height: 60px;
}

#fomula::-webkit-scrollbar {
  height: 8px;
}

#fomula::-webkit-scrollbar-track {
  border-radius: 10px;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, .1);
}

#fomula::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 50, .5);
  border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .3);
}

.fomulas button {
  width: 48px
}
</style>