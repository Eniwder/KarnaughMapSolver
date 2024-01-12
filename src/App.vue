<template>
  <v-app id="app">
    <v-toolbar color="indigo">
      <v-menu class="optMenu" :close-on-content-click="false">
        <template v-slot:activator="{ props }">
          <v-btn icon variant="text" v-bind="props">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-subheader>{{ $t('プロジェクト設定') }}</v-list-subheader>
          <v-list-item v-for="(item, index) in optMenu" :key="index" :prepend-icon="item.icon" :title="$t(item.title)"
            @click="item.handlar">
          </v-list-item>
          <!-- @clickをつけることでホバー時にオーバーレイがかかる -->
          <v-list-item prepend-icon="mdi-upload" @click="">
            <label class="import">
              <v-list-item-title>
                <input type="file" accept="application/json" @change="loadFile($event)" />{{
                  $t('ファイルを読み込み')
                }}
              </v-list-item-title>
            </label>
          </v-list-item>
          <v-list-subheader>{{ $t('言語設定') }}</v-list-subheader>
          <v-list-item>
            <v-radio-group v-model="opts.lang" inline v-on:change="languageSetup">
              <v-radio label="日本語" value="ja"></v-radio>
              <v-radio label="English" value="en"></v-radio>
            </v-radio-group>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-toolbar-title>
        <v-responsive max-width="344">
          <v-text-field v-model="projectName" variant="underlined"></v-text-field>
        </v-responsive>
      </v-toolbar-title>

      <v-btn icon href="https://github.com/Eniwder/KarnaughMapSolver" target="_blank">
        <v-icon>mdi-github</v-icon>
      </v-btn>
      <!-- タブ一覧 -->
      <template v-slot:extension>
        <v-tabs v-model="tab" slider-color="yellow">
          <v-tab v-for="tab in tabs" :key="tab.id" :data-id="tab.id">
            {{ tab.name }}
            <close-button :tab="tab" @confirmDelete="deleteTab(tab.id)"></close-button>
          </v-tab>
          <v-btn icon @click="addTab">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-tabs>
      </template>
    </v-toolbar>

    <!-- タブの中身 -->
    <v-window v-model="tab">
      <v-window-item v-for="(tab, idx) in tabs" :key="tab.id">
        <v-container class="grey-lighten-5 margin-initial">
          <v-row>
            <v-col class="d-flex" cols="3">
              <v-responsive max-width="180">
                <v-text-field v-model="tab.name" variant="underlined">
                  <!-- <v-icon slot="prepend">mdi-pencil</v-icon> -->
                </v-text-field>
              </v-responsive>
            </v-col>
            <v-col class="d-flex inout" cols="2">
              <v-select :items="[2, 3, 4]" variant="outlined" density="compact" v-model="tab.sheets.meta.inputNum"
                label="Inputs" @update:modelValue="changeInOut(tab.id, 'input', $event, idx)"></v-select>
            </v-col>
            <v-col class="d-flex inout" cols="2">
              <v-select :items="[1, 2, 3, 4]" variant="outlined" density="compact" v-model="tab.sheets.meta.outputNum"
                label="Outputs" @update:modelValue="changeInOut(tab.id, 'output', $event, idx)"></v-select>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" sm="6" class="sheets" :style="{ height: tab.sheetHeight }">
              <MySheets :tableData="tab.sheets" @changeCell="changeCell(tab.id, $event, idx)" ref="sheetsRef">
              </MySheets>
            </v-col>
            <v-col cols="12" sm="6" class="karnaughTable">
              <KarnaughCtrl :tables="karnaughTable" ref="karnaughTableRef" @grouped="grouped($event)"></KarnaughCtrl>
            </v-col>
          </v-row>
        </v-container>
      </v-window-item>
    </v-window>
  </v-app>
</template>

<script setup>
import MySheets from './components/MySheets.vue';
import KarnaughCtrl from './components/KarnaughCtrl.vue';
import CloseButton from './components/CloseButtonWithDialog.vue';
import { saveAs } from 'file-saver';
import { reactive, ref, watch, onMounted, computed, nextTick } from 'vue'
import { useI18n } from "vue-i18n";
const { t, locale } = useI18n({ useScope: "global" });

const range = (n) => [...Array(n).keys()];
Array.prototype.zip = function (...args) {
  const new_array = [];
  for (let i = 0; i < length; i++) {
    new_array.push([this[i], ...args.map((arg) => arg[i])]);
  }
  return new_array;
};

const optMenu = [
  { title: t('ファイルへ保存'), icon: 'mdi-download', handlar: exportProject },
  // { title: 'ファイルを読み込み', handlar: loadFile },
]

// TODO 消したタブを戻せる
// TODO github flow (electron build)
// TODO 図サイズ変更
const projectName = ref('Project1');
const tab = ref(0);
const tabs = reactive([]);
const karnaughTableRef = ref(null);
const sheetsRef = ref(null)

const opts = reactive({
  lang: window.navigator.language.startsWith('ja') ? 'ja' : 'en'
})
const activeTab = computed(() => tabs[tab.value])
const karnaughTable = computed(() => {
  if (!activeTab.value) return {};
  return range(activeTab.value.sheets.meta.outputNum).map((idx) => {
    const ret = {};
    const tab = activeTab.value;
    ret.inputNum = tab.sheets.meta.inputNum;
    ret.headers = tab.sheets.body[0].slice(0, ret.inputNum);
    ret.outName = tab.sheets.body[0][ret.inputNum + idx];
    ret.body = tab.sheets.body.filter((_, idx) => idx !== 0);
    ret.key = tab.id + ret.outName + idx;
    ret.grp = tab.sheets.grp[idx];
    ret.outIdx = idx; // bodyを分けほうがよかったかもしれない
    return ret;
  });
})

function exportProject() {
  const save = {};
  tabs.forEach((tab) => {
    tab.modified = false;
  });
  save.tabs = tabs;
  save.config = {
    projectName: projectName.value,
  };
  const blob = new Blob([JSON.stringify(save)], {
    type: 'application/json',
  });
  saveAs(blob, `${projectName.value}.json`);
}

function languageSetup() {
  // localeを直接v-modelに指定するとなぜかうまくいかない
  locale.value = opts.lang;
  if (!sheetsRef.value || !karnaughTableRef.value) return;
  sheetsRef.value.forEach(_ => _.translateHeader())
  karnaughTableRef.value.forEach(_ => {
    _.updateMsg(t('表示言語を変更しました。'));
  });
}

// 名前をimportにするとHTMLの方で呼び出す時にバグる
async function loadFile(event) {
  const getFileData = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }
  const file = (event.target.files || event.dataTransfer.files)[0];
  try {
    const json = await getFileData(file);
    const save = JSON.parse(json);
    projectName.value = save.config.projectName;
    tabs.splice(0, tabs.length)
    nextTick(() => {
      const _tabs = JSON.parse(JSON.stringify(save.tabs));
      _tabs.forEach((tab, idx) => {
        tabs.push(tab)
      });
    });
  } catch (e) {
    alert('ファイルを読み込めませんでした');
    console.error(e);
  }
}

function grouped(event) {
  activeTab.value.sheets.grp[event[0]] = event[1];
}

function createTruthTable(inputNum, outputNum) {
  const ret = {
    headers: [],
    body: [],
    grp: [],
    meta: {
      inputNum,
      outputNum,
    },
  };
  ret.headers = [
    ...range(inputNum).map((n) => `${t('入力')}${n + 1}`),
    ...range(outputNum).map((n) => `${t('出力')}${n + 1}`),
  ];
  ret.body = [
    [
      ...range(inputNum).map((n) => String.fromCharCode(0x41 + n)), // a,b,c,...
      ...range(outputNum).map((n) => String.fromCharCode(0x58 + (n < 3 ? n : -(n - 2)))), // x,y,z,w,v,...
    ],
    ...range(Math.pow(2, inputNum)).map((n) =>
      n
        .toString(2)
        .padStart(inputNum, 0)
        .padEnd(inputNum + outputNum, 1)
        .split('')
    ),
  ];

  return ret;
}
function addTab() {
  const nextId = tabs.reduce((acc, v) => (acc > v ? acc : v.id), -1) + 1;
  const tabId = tabs.length;
  tabs.push({
    id: nextId,
    name: `work${nextId + 1}`,
    sheetHeight: 500 + 'px',
    sheets: createTruthTable(4, 1),
    modified: true,
  });

  // nextTickだと真理値表がレンダリングされる前？なのでその対策
  setTimeout(() => {
    tab.value = tabId;
  }, 1);
}

function deleteTab(id) {
  const tabId = tabs.findIndex((_) => _.id === id);
  tabs.splice(tabId, 1);
  tab.value = tabs.find(_ => _.id)
}

function changeInOut(id, inout, event, idx) {
  const tabId = tabs.findIndex((_) => _.id === id);
  const oldBody = tabs[tabId].sheets.body;
  const { inputNum, outputNum } = tabs[tabId].sheets.meta;
  tabs[tabId].sheets = createTruthTable(inputNum, outputNum);
  // 出力の数が変わった場合は過去の情報を引き継ぐ
  if (inout === 'output') {
    for (let i = 0; i < inputNum; i++) {
      tabs[tabId].sheets.body[0][i] = oldBody[0][i]
    }
    const restoreCol = Math.min(inputNum + outputNum, oldBody[0].length)
    for (let i = inputNum; i < restoreCol; i++) {
      range(oldBody.length).forEach((row) => {
        tabs[tabId].sheets.body[row][i] = oldBody[row][i];
      });
    }
    // 出力が減った場合はタブの位置を修正
    if (tabs[tabId].sheets.body[0].length < oldBody[0].length) {
      karnaughTableRef.value[idx].deletedTab(outputNum);
    }
  }

  const heightMap = ['0px', '0px', '180px', '280px', '500px'];
  tabs[tabId].sheetHeight = heightMap[tabs[tabId].sheets.meta.inputNum];
  // 出力が変化していた場合「以外」にカルノー図の状態をリセットする
  if (inout !== 'output') {
    karnaughTableRef.value[idx].reset();
  }
}

function changeCell(id, e, idx) {
  if (!e) return;
  const tabId = tabs.findIndex((_) => _.id === id);
  const [y, x, old, v] = e;
  let nextRow = [...tabs[tabId].sheets.body[y]];
  // 入出力ラベルは2文字以上を許可
  if (y === 0) {
    nextRow[x] = v || old;
  } else {
    nextRow[x] = (v && v[0]) || old;
  }

  tabs[tabId].sheets.body.splice(y, 1, nextRow);
  tabs[tabId].modified = true;
  karnaughTableRef.value[idx].changeCell(e[1] - tabs[tabId].sheets.meta.inputNum);
}

function confirmSave(event) {
  if (tabs.some((_) => _.modified)) {
    event.returnValue = '編集を保存せずにページを離れようとしています。このまま移動しますか？';
    return '編集を保存せずにページを離れようとしています。このまま移動しますか？';
  }
}

watch(opts, (newVal, oldVal) => {
  Object.entries(opts).forEach((([k, v]) => localStorage.setItem(k, v)))
})

onMounted(() => {
  Object.keys(opts).forEach((k => {
    if (localStorage.getItem(k)) opts[k] = localStorage.getItem(k);
  }))
  languageSetup();
  addTab();
  tabs.forEach((_) => (_.modified = false));
  window.addEventListener('beforeunload', confirmSave);
})
</script>

<style>
#app {
  background-color: #f9fafb;
}

.margin-initial {
  margin: initial;
}

.v-text-field__slot input {
  margin-top: 16px !important;
}

.v-toolbar__content .v-input {
  font-size: inherit;
  max-height: 64px !important;
  padding-bottom: 0px;
}

.v-input {
  align-items: normal !important;
}

.v-toolbar-title .v-field {
  font-size: 1.4rem;
}

.sheets {
  /* height: 500px; */
  max-height: 600px;
  min-width: 400px;
  flex-basis: 30%;
}

.v-select {
  min-width: 72px !important;
}

.v-list-item__prepend {
  margin-right: -16px;
}

.v-select .v-text-field__details {
  display: none !important;
}

.v-select .v-field__field {
  margin-top: 6px;
}

.col {
  padding-top: 0px !important;
}

.d-flex.marginTopButton {
  margin-top: 24px !important;
}

.v-tab {
  text-transform: none !important;
}

.theme--light.v-tabs-items {
  background-color: inherit !important;
}

.v-tabs-slider-wrapper+.v-tab {
  margin-left: 0px !important;
}


.v-tab .mdi-close {
  font-size: 16px !important;
}

.v-tab .mdi-close::before {
  margin-top: -3px;
  margin-left: -1px;
}

button[role='tab'] div .v-btn--icon {
  height: 24px !important;
  width: 24px !important;
  min-height: 24px !important;
  margin-left: 24px !important;
  margin-right: 12px !important;
}

.v-input__slot,
.v-btn {
  min-height: 48px !important;
}

.optMenu .v-list {
  background-color: #000000b5 !important;
}

.optMenu .v-list-subheader {
  background-color: transparent !important;
}

.optMenu .v-list-item-title {
  color: #e1e1e1 !important;
  cursor: pointer;
}

.optMenu .v-list i,
.optMenu .v-list .v-list-subheader__text,
.optMenu .v-list label {
  color: #e1e1e1 !important;
}

.optMenu .v-switch__track {
  background-color: gray;
}

.import input[type='file'] {
  display: none;
}

.onBtn::before {
  opacity: 0.2;
}

@media (max-width: 450px) {
  .karnaughTable {
    transform: scale(0.8);
    margin-left: -30px;
    margin-top: -80px;

  }
}

.karnaughTable {
  max-width: none;
}
</style>
