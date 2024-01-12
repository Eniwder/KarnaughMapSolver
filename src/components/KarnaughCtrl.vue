<template>
  <div class="root" @keydown="keydown($event)" tabindex="0">
    <v-card class="karnaughCtrl">
      <v-card>
        <v-tabs bg-color="indigo-lighten-3" v-model="selectedTab" slider-color="indigo-lighten-1">
          <v-tab v-for="tab in tabItems" :key="tab.key">{{ tab.name }}</v-tab>
          <v-menu icon class="optView optMenu" :close-on-content-click="false">
            <template v-slot:activator="{ props }">
              <v-btn icon variant="text" v-bind="props" style="margin: auto 8px auto auto; width: 48px; height: 48px">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-subheader dark>{{ $t('表示設定') }}</v-list-subheader>
              <v-list-item v-for="(item, index) in optView" :key="item.key">
                <v-tooltip bottom open-delay="600">
                  <template v-slot:activator="{ props }">
                    <span v-bind="props">
                      <v-switch v-model="item.value" inset :label="item.label" theme="light" color="white"
                        style="height: 48px"></v-switch>
                    </span>
                  </template>
                  <span>{{ item.disc }}</span>
                </v-tooltip>
              </v-list-item>
              <v-list-subheader dark>{{ $t('図の出力') }}</v-list-subheader>
              <v-list-item v-for="(item, index) in optExport" :key="index" :prepend-icon="item.icon"
                :title="$t(item.title)" @click="item.handlar">
              </v-list-item>
            </v-list>
          </v-menu>
        </v-tabs>

        <v-window v-model="selectedTab">
          <v-window-item v-for="table in props.tables" :key="table.key" ref="tabItem">
            <v-card>
              <Karnaugh :_tableData="table" :optView="optViewProps" @msg="updateMsg($event)" @grouped="grouped($event)"
                ref="karnaughs">
              </Karnaugh>
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
    </v-card>
  </div>
</template>
<script setup>
import Karnaugh from './Karnaugh.vue';
import { ref, reactive, defineProps, defineEmits, onMounted, computed, watch } from 'vue'
import { useI18n } from "vue-i18n";
const { t } = useI18n({ useScope: "global" });

const props = defineProps({
  tables: {
    meta: {
      inputNum: Number,
      outputNum: Number,
    },
    headers: [],
    body: [],
    grp: [],
  },
})
const emit = defineEmits(["grouped"])
defineExpose({ changeCell, updateMsg })

const optExport = [
  { title: 'PNG保存', icon: 'mdi-download', handlar: () => save('png') },
  { title: 'SVG保存', icon: 'mdi-download', handlar: () => save('svg') },
]

const msg = ref(t('まずは真理値表を編集。0,1以外はドントケア扱い。'))
const changed = reactive([]);
const selectedTab = ref(0);
const tabItem = ref(null);
const karnaughs = ref(null);
// const mathjax = ref('');
const optView = reactive([
  {
    key: 'AB_or_BA',
    label: 'A/B ↔ B/A',
    value: false,
    disc: t('入力の描画順序を入れ替えます。'),
  },
  {
    key: 'A_BC_or_A_BC',
    label: 'A/BC ↔ AB/C',
    value: false,
    disc: t('3変数の時に入力の区切り位置を変更します。'),
  },
])

const tabItems = computed(() => {
  if (!props.tables.map) return {};
  return props.tables.map((t, idx) => ({
    name: t.outName,
    key: `tb${t.outName}${idx}`,
  }));
})

const activeKarnaugh = computed(() => {
  return karnaughs.value[selectedTab.value];
})

const optViewProps = computed(() => {
  return Object.entries(optView).reduce((acc, [k, v]) => {
    // console.log(v.key v.value)
    acc[v.key] = v.value;
    return acc;
  }, {});
})

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

function autoGrouping() {
  reset();
  activeKarnaugh.value.autoGrouping();
  msg.value = t(`囲みました。自分でも確認してね。`);
}

function save(ext) {
  activeKarnaugh.value.save(ext);
  msg.value = t(`図をダウンロードしました。`);
}

function reset(idx) {
  activeKarnaugh.value.reset();
  if (idx >= 0 && idx < tabItem.length) {
    msg.value = t(`タブ@@@の内容をリセットしました。`).replace(
      '@@@',
      activeKarnaugh.value.name
    );
  }
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

onMounted(() => {
  selectedTab.value = 0;
})

watch(optView, () => {
  // reset();
})
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
</style>

<style>
.msg .v-field--disabled {
  opacity: 1 !important;
}
</style>