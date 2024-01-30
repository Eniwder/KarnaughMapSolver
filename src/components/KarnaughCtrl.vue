<template>
  <div class="root" @keydown="keydown($event)" tabindex="0">
    <v-card class="karnaughCtrl">
      <v-card>
        <v-tabs bg-color="indigo-lighten-3" v-model="selectedTab" slider-color="indigo-lighten-1">
          <v-tab v-for="tab in tabItems" :key="tab.key">{{ tab.name }}</v-tab>
          <v-menu icon class="viewOpt optMenu" :close-on-content-click="false">
            <template v-slot:activator="{ props }">
              <v-btn icon variant="text" v-bind="props" style="margin: auto 8px auto auto; width: 48px; height: 48px">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-subheader dark>{{ $t('表示設定') }}</v-list-subheader>
              <v-list-item v-for="(item, index) in viewOpt" :key="item.key">
                <v-tooltip bottom open-delay="600">
                  <template v-slot:activator="{ props }">
                    <span v-bind="props">
                      <v-switch v-model="item.value" inset :label="item.label" theme="light" color="white"
                        style="height: 48px"></v-switch>
                    </span>
                  </template>
                  <span>{{ $t(item.disc) }}</span>
                </v-tooltip>
              </v-list-item>
              <v-list-subheader dark>{{ $t('図の出力') }}</v-list-subheader>
              <v-list-item v-for="(item, index) in optExport" :key="index" :prepend-icon="item.icon"
                :title="$t(item.title)" @click="item.handlar">
              </v-list-item>
              <v-list-subheader dark>{{ $t('その他') }}</v-list-subheader>
              <v-list-item>
                <v-switch v-model="advancedOpt" inset :label="$t('高度な設定を表示')" theme="light" color="white"
                  style="height: 48px"></v-switch>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-tabs>

        <v-window v-model="selectedTab">
          <v-window-item v-for="table in props.tables" :key="table.key" ref="tabItem">
            <v-card>
              <KarnaughMaster :_tableData="table" :viewOpt="viewOptProps" :drawOpt="drawOpt" @msg="updateMsg($event)"
                @grouped="grouped($event)" ref="karnaughs">
              </KarnaughMaster>
            </v-card>
          </v-window-item>
        </v-window>
      </v-card>

      <v-row class="msg">
        <v-text-field :placeholder="msg" disabled></v-text-field>
      </v-row>
      <v-row class="controlButton">
        <v-btn elevation="2" color="indigo-lighten-4" @click="grouping">{{ $t('囲む解除') }}
        </v-btn>
        <v-btn elevation="2" color="indigo-lighten-4" @click="deselection">{{
          $t('選択解除')
        }}</v-btn>
        <v-btn elevation="2" color="indigo-lighten-4" @click="reset(null)">{{
          $t('リセット')
        }}</v-btn>
        <v-btn elevation="2" color="indigo-lighten-4" @click="autoGrouping">{{
          $t('自動で囲む')
        }}</v-btn>
      </v-row>
      <v-row v-show="advancedOpt" @keydown="$event.stopPropagation()" class="advanced-opt">
        <v-col cols="3"> <v-text-field type="number" step="any" min="18" max="100" :label="$t('セルのサイズ')"
            v-model.number="_drawOpt.oneCell"></v-text-field> </v-col>
        <v-col cols="3"><v-text-field type="number" step="any" min="0" max="24" :label="$t('図のパディング')"
            v-model.number="_drawOpt.padding"></v-text-field></v-col>
        <v-col cols="3"> <v-text-field type="number" step="any" min="0" max="10" :label="$t('外周のボーダー幅')"
            v-model.number="_drawOpt.outBorderSw"></v-text-field> </v-col>
        <v-col cols="3"> <v-text-field type="number" step="any" min="0" max="10" :label="$t('セルのボーダー幅')"
            v-model.number="_drawOpt.cellBorderSw"></v-text-field> </v-col>
        <v-col cols="3"> <v-text-field type="string" :label="$t('ラベルのフォント名')"
            v-model="_drawOpt.fontLabelFam"></v-text-field>
        </v-col>
        <v-col cols="3"> <v-text-field type="number" step="any" min="4" max="64" :label="$t('ラベルのフォントサイズ')"
            v-model.number="_drawOpt.fontLabelSize"></v-text-field> </v-col>
        <v-col cols="3"> <v-text-field type="string" :label="$t('ヘッダーのフォント名')"
            v-model="_drawOpt.fontInFam"></v-text-field>
        </v-col>
        <v-col cols="3"> <v-text-field type="number" step="any" min="4" max="64" :label="$t('ヘッダーのフォントサイズ')"
            v-model.number="_drawOpt.fontInSize"></v-text-field> </v-col>
        <v-col cols="3"> <v-text-field type="string" :label="$t('テーブルのフォント名')"
            v-model="_drawOpt.fontBodyFam"></v-text-field> </v-col>
        <v-col cols="3"> <v-text-field type="number" step="any" min="4" max="64" :label="$t('テーブルのフォントサイズ')"
            v-model.number="_drawOpt.fontBodySize"></v-text-field> </v-col>
        <v-col cols="3"><v-text-field type="number" step="any" min="1" max="10" :label="$t('グループの線の太さ')"
            v-model.number="_drawOpt.strokeMap.grp.sw"></v-text-field></v-col>
        <v-col cols="3"><v-text-field type="string" :label="$t('グループの線の色')"
            v-model="_drawOpt.strokeMap.grp.sc"></v-text-field></v-col>
        <v-col cols="3"><v-text-field type="number" step="any" min="1" max="10" :label="$t('グループの線の太さ') + 2"
            v-model.number="_drawOpt.strokeMap.rowGrp.sw"></v-text-field></v-col>
        <v-col cols="3"><v-text-field type="string" :label="$t('グループの線の色') + 2"
            v-model="_drawOpt.strokeMap.rowGrp.sc"></v-text-field></v-col>
        <v-col cols="3"><v-text-field type="number" step="any" min="1" max="10" :label="$t('グループの線の太さ') + 3"
            v-model.number="_drawOpt.strokeMap.colGrp.sw"></v-text-field></v-col>
        <v-col cols="3"><v-text-field type="string" :label="$t('グループの線の色') + 3"
            v-model="_drawOpt.strokeMap.colGrp.sc"></v-text-field></v-col>
        <v-col cols="3"><v-text-field type="number" step="any" min="1" max="10" :label="$t('グループの線の太さ') + 4"
            v-model.number="_drawOpt.strokeMap.allGrp.sw"></v-text-field></v-col>
        <v-col cols="3"><v-text-field type="string" :label="$t('グループの線の色') + 4"
            v-model="_drawOpt.strokeMap.allGrp.sc"></v-text-field></v-col>
        <v-col cols="4"> <v-btn elevation="2" color="indigo-lighten-4" @click="resetAdancedSetting">{{
          $t('設定をデフォルトに戻す') }}</v-btn></v-col>

      </v-row>
    </v-card>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue';
import { useI18n } from "vue-i18n";
import KarnaughMaster from './KarnaughMaster.vue';
const { t } = useI18n({ useScope: "global" });

const props = defineProps({
  tables: {
    meta: {
      inputNum: Number,
      outputNum: Number,
    },
    headers: [],
    body: [],
    groups: [[{
      grp: [],
      rowGrp: [],
      colGrp: [],
      allGrp: [],
    }]],
    outIdx: Number
  },
});
const emit = defineEmits(["grouped"]);
defineExpose({ changeCell, updateMsg, reset, deletedTab });
const optExport = [
  { title: 'PNG保存', icon: 'mdi-download', handlar: () => save('png') },
  { title: 'SVG保存', icon: 'mdi-download', handlar: () => save('svg') },
];

const msg = ref(t('まずは真理値表を編集。0,1以外はドントケア扱い。'));
const changed = reactive([]);
const selectedTab = ref(0);
const tabItem = ref(null);
const karnaughs = ref(null);
// const mathjax = ref('');
const viewOpt = reactive([
  {
    key: 'AB_or_BA',
    label: 'A/B ↔ B/A',
    value: false,
    disc: '入力の描画順序を入れ替えます。',
  },
  {
    key: 'A_BC_or_A_BC',
    label: 'A/BC ↔ AB/C',
    value: false,
    disc: '3入力の時に入力の区切り位置を変更します。',
  },
  // TODO 気が向いたら対応する。useKarnaugの方に色々手を加える必要がある
  // {
  //   key: 'ABCD_EF_or_AB_CDEF',
  //   label: 'ABCD/EF ↔ AB/CDEF',
  //   value: false,
  //   disc: '5入力以上の時に入力の区切り位置を変更します。',
  // },
]);
const advancedOpt = ref(false);
const DrawOptDefault = {
  oneCell: 72,
  padding: 8, // paddingがないと外枠の太線をきれいに引けない
  outBorderSw: 2,
  cellBorderSw: 1,
  fontInFam: 'Meiryo',
  fontInSize: 24,
  fontLabelFam: 'Meiryo',
  fontLabelSize: 16,
  fontBodyFam: 'Arial',
  fontBodySize: 24,
  strokeMap: {
    grp: {
      sw: 1,
      sc: 'black'
    },
    rowGrp: {
      sw: 2,
      sc: '#FFC107'
    },
    colGrp: {
      sw: 3,
      sc: '#2196F3'
    },
    allGrp: {
      sw: 4,
      sc: '#F44336'
    }
  }
};
const _drawOpt = reactive(JSON.parse(JSON.stringify(DrawOptDefault)));

const in2MinMax = (v, min, max) => v < min ? min : v > max ? max : v;
const validCssOrElse = (str, v, key) => (str && str !== '') && CSS.supports(key, str) ? str : v;
// 各@inputの属性で値を修正することもできるが、入力値がすぐに修正されると入力感が気持ち悪くなるので入力データと実態を分ける
const drawOpt = computed(() => ({
  oneCell: in2MinMax(_drawOpt.oneCell, 18, 200),
  padding: in2MinMax(_drawOpt.padding, 0, 24),
  outBorderSw: in2MinMax(_drawOpt.outBorderSw, 0, 10),
  cellBorderSw: in2MinMax(_drawOpt.cellBorderSw, 0, 10),
  fontInFam: validCssOrElse(_drawOpt.fontInFam, DrawOptDefault.fontInFam, 'font-family'),
  fontInSize: in2MinMax(_drawOpt.fontInSize, 4, 64),
  fontLabelFam: validCssOrElse(_drawOpt.fontLabelFam, DrawOptDefault.fontLabelFam, 'font-family'),
  fontLabelSize: in2MinMax(_drawOpt.fontLabelSize, 4, 64),
  fontBodySize: in2MinMax(_drawOpt.fontBodySize, 4, 64),
  fontBodyFam: validCssOrElse(_drawOpt.fontBodyFam, DrawOptDefault.fontBodyFam, 'font-family'),
  strokeMap: {
    grp: {
      sw: in2MinMax(_drawOpt.strokeMap.grp.sw, 1, 10),
      sc: validCssOrElse(_drawOpt.strokeMap.grp.sc, DrawOptDefault.strokeMap.grp.sc, 'color')
    },
    rowGrp: {
      sw: in2MinMax(_drawOpt.strokeMap.rowGrp.sw, 1, 10),
      sc: validCssOrElse(_drawOpt.strokeMap.rowGrp.sc, DrawOptDefault.strokeMap.rowGrp.sc, 'color')
    },
    colGrp: {
      sw: in2MinMax(_drawOpt.strokeMap.colGrp.sw, 1, 10),
      sc: validCssOrElse(_drawOpt.strokeMap.colGrp.sc, DrawOptDefault.strokeMap.colGrp.sc, 'color')
    },
    allGrp: {
      sw: in2MinMax(_drawOpt.strokeMap.allGrp.sw, 1, 10),
      sc: validCssOrElse(_drawOpt.strokeMap.allGrp.sc, DrawOptDefault.strokeMap.allGrp.sc, 'color')
    }
  }
}));

const tabItems = computed(() => {
  if (!props.tables.map) return [];
  return props.tables.map((t, idx) => ({
    name: t.outName,
    key: `tb${t.outName}${idx}`,
  }));
});


const activeKarnaugh = computed(() => karnaughs.value[selectedTab.value]);

const viewOptProps = computed(() => {
  return Object.entries(viewOpt).reduce((acc, [k, v]) => {
    // console.log(v.key v.value)
    acc[v.key] = v.value;
    return acc;
  }, {});
});

function resetAdancedSetting() {
  Object.assign(_drawOpt, JSON.parse(JSON.stringify(DrawOptDefault)));
}

function exportData() {
  props.tables.modified = false;
  return tabItem.value.map(_ => _.exportData());
}

function keydown(key) {
  // console.log(key);
  const code = key.code;
  if (code === 'KeyE' || code === 'NumpadEnter' || code === 'Enter' || code === 'Space') {
    grouping();
  } else if (code === 'KeyD' || code === 'Delete') {
    deselection();
  } else if (code === 'KeyR') {
    reset();
  }
}

function grouping() {
  activeKarnaugh.value.grouping();
  changed[selectedTab.value] = true;
}

function deselection() {
  activeKarnaugh.value.deselection();
}

async function autoGrouping() {
  reset();
  await activeKarnaugh.value.autoGrouping();
  msg.value = t(`囲みました。自分でも確認してね。`);
}

function save(ext) {
  activeKarnaugh.value.save(ext);
  msg.value = t(`図をダウンロードしました。`);
}

function reset(idx) {
  const karnaugh = idx !== undefined ? karnaughs.value[idx] : activeKarnaugh.value;
  karnaugh?.reset();
  msg.value = t(`タブZZZの内容をリセットしました。`).replace('ZZZ', tabItems.value[selectedTab.value].name);
}

function updateMsg(_msg) {
  msg.value = _msg;
}

function grouped(event) {
  emit('grouped', event);
}

function changeCell(outIdx) {
  reset(outIdx);
  if (!changed[outIdx]) {
    msg.value = t('カルノー図の「1」をクリックして「囲む」を選択。');
  } else {
  }
}

// 新たにn個のタブになる
function deletedTab(n) {
  // 選択中のタブに影響が無い場合は何もしない
  if (tabItems.value.length < n || selectedTab.value < n) return;
  selectedTab.value = n - 1;
}

onMounted(() => {
  selectedTab.value = 0;
});

// タブを強制的にレンダリングさせる
// これをしないと出力を子要素を参照できない箇所が出てくる
// UI的にも奇妙な挙動をするが妥協
watch(() => props.tables.length, () => {
  const _selectedTab = selectedTab.value;
  function render(idx) {
    idx = (idx % props.tables.length);
    if (idx === _selectedTab) {
      selectedTab.value = _selectedTab;
      return;
    };
    selectedTab.value = idx;
    nextTick(() => render((idx + 1)));
  }
  render(_selectedTab + 1);
});
</script>

<style scoped>
.root {
  outline: none;
}

.v-tab--selected {
  background-color: #5c6bc0;
  /* indigo lighten-3 */
}

.karnaughCtrl {
  min-width: 430px;
  padding-bottom: 24px;
}

.controlButton button {
  width: 160px;
  margin-left: 24px;
  margin-top: 8px;
}

.msg {
  margin: 0;
  margin-bottom: -32px;
}

.advanced-opt {
  padding: 16px
}
</style>

<style>
.msg .v-field--disabled {
  opacity: 1 !important;
}
</style>