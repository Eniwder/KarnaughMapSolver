<template>
  <svg :x="offset.x" :y="offset.y" :width="kvi.width" :height="kvi.height" ref="svgChild" @click="select($event)">
    <!-- ネストされた子svgでクリックイベントが機能するように背景に透明な四角形を置く -->
    <rect :x="kvi.left - kvi.padding" :y="kvi.top - kvi.padding" :width="kvi.width" :height="kvi.height" stroke="none"
      fill="transparent" />
    <!-- 外枠 -->
    <line :x1="kvi.left - 1" :y1="kvi.top" :x2="kvi.right + 1" :y2="kvi.top" stroke="black" stroke-width="2" />
    <line :x1="kvi.left" :y1="kvi.top - 1" :x2="kvi.left" :y2="kvi.bottom + 1" stroke="black" stroke-width="2" />
    <line :x1="kvi.left - 1" :y1="kvi.bottom" :x2="kvi.right + 1" :y2="kvi.bottom" stroke="black" stroke-width="2" />
    <line :x1="kvi.right" :y1="kvi.top - 1" :x2="kvi.right" :y2="kvi.bottom + 1" stroke="black" stroke-width="2" />
    <!-- grid col -->
    <line v-for="col in 2 * kvi.colIn" :key="'col' + col" :x1="col * kvi.oneCell + kvi.left + kvi.inNameWidth"
      :y1="kvi.top" :x2="col * kvi.oneCell + kvi.left + kvi.inNameWidth" :y2="kvi.bottom" stroke="black" />
    <!-- grid row -->
    <line v-for="row in 2 * kvi.rowIn" :key="'row' + row" :x1="kvi.left" :y1="row * kvi.oneCell + kvi.top" :x2="kvi.right"
      :y2="row * kvi.oneCell + kvi.top" stroke="black" />
    <!-- separate input -->
    <line :x1="kvi.left" :y1="kvi.top" :x2="kvi.left + kvi.oneCell + kvi.inNameWidth" :y2="kvi.top + kvi.oneCell"
      stroke="black" />
    <!-- col header -->
    <text :x="kvi.colHeaderLabel.x" :y="kvi.colHeaderLabel.y" :font-size="kvi.fontLabelSize" :font-family="kvi.fontInFam"
      text-anchor="middle" dominant-baseline="central">
      {{ kvi.colHeaderLabel.v }}
    </text>
    <text v-for="ch in kvi.colHeader" :key="ch.key" :x="ch.x + kvi.inNameWidth" :y="ch.y" :font-size="kvi.fontInSize"
      :font-family="kvi.fontInFam" text-anchor="middle" dominant-baseline="central">
      {{ ch.v }}
    </text>
    <!-- row header -->
    <text :x="kvi.rowHeaderLabel.x" :y="kvi.rowHeaderLabel.y" :font-size="kvi.fontLabelSize" :font-family="kvi.fontInFam"
      text-anchor="middle" dominant-baseline="central">
      {{ kvi.rowHeaderLabel.v }}
    </text>
    <text v-for="rh in kvi.rowHeader" :key="rh.key" :x="rh.x + kvi.inNameWidth / 2" :y="rh.y" :font-size="kvi.fontInSize"
      :font-family="kvi.fontInFam" text-anchor="middle" dominant-baseline="central">
      {{ rh.v }}
    </text>
    <!-- table body -->
    <text v-for="tb in tableBody" :key="tb.key" :x="tb.x + kvi.inNameWidth" :y="tb.y" :font-size="kvi.fontBodySize"
      :font-family="kvi.fontBodyFam" text-anchor="middle" dominant-baseline="central"
      :fill="colors[parseInt((tb.x) / kvi.oneCell) - 1][parseInt((tb.y) / kvi.oneCell) - 1]">
      {{ tb.v }}
    </text>
    <path v-for="p in arcs" :d="svgArc(p)" :key="p.key" fill="none" :stroke="p.sc" :stroke-width="p.sw" />
    <path v-for="p in bezs" :d="svgBez(p)" :key="p.key" fill="none" :stroke="p.sc" :stroke-width="p.sw" />
    <ellipse v-for="p in ellipses" :key="p.key" v-bind="p" fill="none" :stroke="p.sc" :stroke-width="p.sw" />
    <rect v-for="p in rects" :key="p.key" v-bind="p" fill="none" :stroke="p.sc" :stroke-width="p.sw" />
  </svg>
</template>

<script setup>
import { reactive, computed, onMounted, watch, nextTick, ref, inject, isProxy, toRaw } from 'vue';
import { useComputedReactive } from '../composables/useComputedReactive';
const { computedReactive } = useComputedReactive();
const kvi = inject('karnaughViewInfo');
const emit = defineEmits(['msg', 'grouped', 'click',]);
defineExpose({ deselection, grouping, getSelects, reset });

const range = (n) => [...Array(n).keys()];

const props = defineProps({
  tableData: {
    body: [],
    inputNum: Number,
    headers: [],
    outName: String,
    outIdx: Number,
    groups: {
      grp: [],
      rowGrp: [],
      colGrp: [],
      allGrp: [],
    },
  },
  offset: {
    x: Number,
    y: Number
  },
  idx: Number,
  subGroups: [],
});
const _selects = reactive([]);
const svgChild = ref(null);
const offset = computed(() => props.offset);
const tableData = computedReactive(() => props.tableData);

const tableMap = computed(() => {
  return tableData.body.reduce((acc, v) => {
    const [ins, out] = [
      v.slice(0, tableData.inputNum),
      v[tableData.inputNum + tableData.outIdx],
    ];
    acc[ins.join('')] = out;
    return acc;
  }, {});
});
const tableBody = computed(() => {
  return kvi.colHeader
    .map((c) =>
      kvi.rowHeader.map((r) => ({
        key: `tb${c.v}${r.v}`,
        v: tableMap.value[c.v + r.v],
        x: c.x,
        y: r.y,
      }))
    )
    .flat();
});
const selects = computed(() => _selects.map((_) => _.split(',').map((_) => parseInt(_) - 1)));
const arcs = computed(() => circles.value.filter((_) => _.type === 'arc').sort((a, b) => b.sw - a.sw));
const ellipses = computed(() => circles.value.filter((_) => _.type === 'ellipse').sort((a, b) => b.sw - a.sw));
const rects = computed(() => circles.value.filter((_) => _.type === 'rect').sort((a, b) => b.sw - a.sw));
const bezs = computed(() => circles.value.filter((_) => _.type === 'bez').sort((a, b) => b.sw - a.sw));
const circles = computed(() => {
  const ret = [];
  const addArc = (x1, y1, x2, y2, w, h, f2, sw, sc) => {
    const [ajx, px] = x1 === x2 ? [kvi.oneCell / 2.4, 0] : [-4, 2];
    const [ajy, py] = y1 == y2 ? [kvi.oneCell / 2.4, 0] : [-4, 2];
    ret.push({
      type: 'arc',
      x1: kvi.left + (x1 + 1) * kvi.oneCell + kvi.inNameWidth + px,
      y1: kvi.top + (y1 + 1) * kvi.oneCell + py,
      rx: (w / 2) * kvi.oneCell + ajx - sw,
      ry: (h / 2) * kvi.oneCell + ajy,
      katamuki: 0,
      f1: 1,
      f2: f2 === 'r' ? 1 : 0,
      x2: kvi.left + (x2 + 1) * kvi.oneCell + kvi.inNameWidth - px,
      y2: kvi.top + (y2 + 1) * kvi.oneCell - py,
      key: 'arc' + x1 + y1 + x2 + y2 + sw + sc,
      sw,
      sc
    });
  };
  const addBez = (x1, y1, cx, cy, x2, y2, px1, px2, py1, py2, sw, sc) => {
    ret.push({
      type: 'bez',
      x1: kvi.left + (x1 + 1) * kvi.oneCell + px1 + kvi.inNameWidth,
      y1: kvi.top + (y1 + 1) * kvi.oneCell + py1,
      cx: kvi.left + (cx + 1) * kvi.oneCell + kvi.inNameWidth + (cx > 1 ? sw : -sw),
      cy: kvi.top + (cy + 1) * kvi.oneCell + (cy > 1 ? sw : -sw),
      x2: kvi.left + (x2 + 1) * kvi.oneCell + px2 + kvi.inNameWidth,
      y2: kvi.top + (y2 + 1) * kvi.oneCell + py2,
      key: 'arc2' + x1 + y1 + x2 + y2 + sw + sc,
      sw,
      sc
    });
  };
  const addEllipse = (x, y, w, h, sw, sc) => {
    ret.push({
      type: 'ellipse',
      cx: kvi.left + (x + 1) * kvi.oneCell + (w / 2) * kvi.oneCell + kvi.inNameWidth,
      cy: kvi.top + (y + 1) * kvi.oneCell + (h / 2) * kvi.oneCell,
      rx: (w * kvi.oneCell) / 2 - 2 - sw,
      ry: (h * kvi.oneCell) / 2 - 2 - sw,
      key: 'ellipse' + x + y + w + h + sw + sc,
      sw,
      sc
    });
  };
  const addRect = (x, y, w, h, sw, sc) => {
    ret.push({
      type: 'rect',
      x: kvi.left + (x + 1) * kvi.oneCell + 8 + kvi.inNameWidth + sw,
      y: kvi.top + (y + 1) * kvi.oneCell + 8 + sw,
      width: w * kvi.oneCell - 16 - sw * 3,
      height: h * kvi.oneCell - 16 - sw * 2,
      rx: 16,
      ry: 16,
      key: 'rect' + x + y + w + h + sw + sc,
      sw,
      sc
    });
  };
  Object.keys(tableData.groups).forEach(grpKey => {
    drawGrp(tableData.groups[grpKey]).forEach((set) => {
      const xs = new Set(set.map((_) => _[0]));
      const ys = new Set(set.map((_) => _[1]));
      const [xmax, xmin, ymax, ymin] = [xs.max(), xs.min(), ys.max(), ys.min()];
      const { sw, sc } = kvi.strokeMap[grpKey];
      // input=4で四隅が選択されている場合
      if (xs.size === 2 && xmax - xmin > 1 && ys.size === 2 && ymax - ymin > 1) {
        addBez(xmin + 1, ymin, xmin + 1, ymin + 1, xmin, ymin + 1, -4, 0, 0, -4, sw, sc); // 7
        addBez(xmax, ymin, xmax, ymin + 1, xmax + 1, ymin + 1, 4, 0, 0, -4, sw, sc); // 9
        addBez(xmin, ymax, xmin + 1, ymax, xmin + 1, ymax + 1, 0, -4, 4, 0, sw, sc); // 3
        addBez(xmax + 1, ymax, xmax, ymax, xmax, ymax + 1, 0, 4, 4, 0, sw, sc); // 1
        // 横の端と端
      } else if (xs.size == 2 && xmax - xmin > 1) {
        addArc(xmin, ymin, xmin, ymax + 1, 1, ymax - ymin + 1, 'r', sw, sc);
        addArc(xmax + 1, ymin, xmax + 1, ymax + 1, 1, ymax - ymin + 1, 'l', sw, sc);
        // 縦の端と端
      } else if (ys.size == 2 && ymax - ymin > 1) {
        addArc(xmin, ymin, xmax + 1, ymin, xmax - xmin + 1, 1, 'l', sw, sc);
        addArc(xmin, ymax + 1, xmax + 1, ymax + 1, xmax - xmin + 1, 1, 'r', sw, sc);
        // 全部
      } else if (xs.size == kvi.colIn * 2 && ys.size == kvi.rowIn * 2) {
        addRect(xmin, ymin, xmax - xmin + 1, ymax - ymin + 1, sw, sc);
      } else {
        addEllipse(xmin, ymin, xmax - xmin + 1, ymax - ymin + 1, sw, sc);
      }
    });
  });

  return ret;
});

const colors = computed(() => {
  const ret = range((tableData.inputNum - parseInt(tableData.inputNum / 2)) * 2).map(
    (_) => range(parseInt(tableData.inputNum / 2) * 2).fill('black')
  );
  selects.value.forEach((_) => {
    const [x, y] = _;
    if (x >= 0 && y >= 0) {
      ret[x][y] = 'crimson';
    }
  });
  return ret;
});

function drawGrp(grp) {
  return grp.map(_ => _.split('@')
    .sort()
    .map((_) => _.split(',').map((_) => parseInt(_) - 1))
  );
}

function svgArc(v) {
  if (!v) return '';
  return `M${v.x1} ${v.y1} A${v.rx} ${v.ry} ${v.katamuki} ${v.f1} ${v.f2} ${v.x2} ${v.y2}`;
}

function svgBez(v) {
  if (!v) return '';
  return `M${v.x1} ${v.y1} Q${v.cx} ${v.cy} ${v.x2} ${v.y2}`;
}

function select(ev) {
  const selectCell = (x, y) => {
    return [parseInt(x / kvi.oneCell), parseInt(y / kvi.oneCell)];
  };
  const bcr = svgChild.value.getBoundingClientRect();
  const [ox, oy] = [bcr.x, bcr.y].map((_) => parseInt(_));
  const sc = selectCell(ev.clientX - ox - kvi.left - kvi.inNameWidth, ev.clientY - oy - kvi.top);
  if (sc[0] < 1 || kvi.colIn * 2 < sc[0] || sc[1] < 1 || kvi.rowIn * 2 < sc[1]) return;
  const scs = sc.join(',');
  const hasIdx = _selects.indexOf(scs);
  if (hasIdx >= 0) {
    _selects.splice(hasIdx, 1);
  } else {
    _selects.push(scs);
  }
}

function getSelects() {
  const labels = selects.value.map((_) => {
    const [x, y] = _;
    const label = kvi.colHeader[x].v + kvi.rowHeader[y].v;
    return label;
  });
  const values = labels.map((_) => tableMap.value[_]);
  return [selects.value, labels, values, _selects];
}

function grouping() {

}
function deselection() {
  _selects.splice(0, _selects.length);
}
function reset() {
  deselection();
  tableData.groups.forEach(_ => _.splice(0, _.length));
}
</script>

<style>
svg {
  user-select: none;
}
</style>
        