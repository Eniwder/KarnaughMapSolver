<template>
  <v-card class="karnaughCtrl">
    <v-tabs background-color="indigo lighten-3" color="white" v-model="selectedTab">
      <v-tabs-slider color="indigo lighten-1"></v-tabs-slider>
      <v-tab v-for="tab in tabItems" :key="tab.key">{{ tab.name }}</v-tab>
      <v-tab-item v-for="table in tables" :key="table.key">
        <Karnaugh :tableData="table" ref="karnaugh" @msg="updateMsg($event)"></Karnaugh>
      </v-tab-item>
    </v-tabs>
    <v-row align="center" class="msg">
      <v-text-field :placeholder="msg" filled disabled></v-text-field>
    </v-row>
    <v-row align="center" class="controlButton">
      <v-btn elevation="2" color="indigo lighten-4" @click="grouping">囲む/解除[E]</v-btn>
      <v-btn elevation="2" color="indigo lighten-4" @click="deselection">選択解除[D]</v-btn>
      <v-btn elevation="2" color="indigo lighten-4" @click="reset(null)">リセット[R]</v-btn>
    </v-row>
    <v-row align="center" class="controlButton">
      <v-btn elevation="2" color="indigo lighten-4" @click="autoGrouping">自動で囲む</v-btn>
      <v-btn elevation="2" color="indigo lighten-4" @click="save">保存</v-btn>
    </v-row>
  </v-card>
</template>
<script>
import Karnaugh from './Karnaugh.vue';

export default {
  components: { Karnaugh },
  data: function () {
    return {
      msg: 'まずは真理値表を編集。0,1以外はドントケア扱い。',
      changed: [],
      selectedTab: null,
    };
  },
  props: {
    tables: {},
  },
  methods: {
    grouping() {
      this.$refs.karnaugh[this.selectedTab].grouping();
      this.changed[this.selectedTab] = true;
    },
    deselection() {
      this.$refs.karnaugh[this.selectedTab].deselection();
    },
    autoGrouping() {
      this.reset();
      this.$refs.karnaugh[this.selectedTab].autoGrouping();
      this.msg = `囲みました。自分でも確認してね。`;
    },
    save() {},
    reset(idx) {
      idx = idx ?? this.selectedTab;
      if (this.$refs.karnaugh[idx]) this.$refs.karnaugh[idx].reset();
      this.msg = `タブ[${this.tabItems[idx].name}]の内容をリセットしました。`;
    },
    updateMsg(msg) {
      this.msg = msg;
    },
    changeCell(outIdx) {
      this.reset(outIdx);
      if (!this.changed[outIdx]) {
        this.msg = 'カルノー図の「1」をクリックして「囲む」を選択。';
      } else {
      }
    },
  },
  computed: {
    tabItems() {
      return this.tables.map((t) => ({
        name: t.outName,
        key: `tb${t.outName}`,
      }));
    },
  },
};
</script>

<style scoped>
.v-tab--active {
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