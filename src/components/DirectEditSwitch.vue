<template>
  <v-tooltip location="bottom" open-delay="100">
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
const model = defineModel();
</script>
