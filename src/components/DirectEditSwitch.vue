<template>
  <v-tooltip bottom open-delay="100">
    <template v-slot:activator="{ props }">
      <span v-bind="props">
        <v-switch v-model="model" inset :label="$t('直接編集')" theme="light" color="indigo"
          style="height: 48px"></v-switch>
      </span>
    </template>
    <span>{{ $t('カルノー図のセルを選択して直接編集ができます。') }}</span>
  </v-tooltip>
</template>

<script setup>


import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from "vue-i18n";
const { t } = useI18n({ useScope: "global" });

const model = defineModel()

</script>
