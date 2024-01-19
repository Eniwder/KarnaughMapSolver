import { computed, reactive } from 'vue';
export function useComputedReactive() {
  function computedReactive(f, keys) {
    const obj = reactive({});
    const tmp = computed(f);
    (Reflect.ownKeys(tmp.value) || Object.keys(keys.reduce((acc, v) => Object.assign(acc, { [v]: v }), {})))
      .forEach(k => { Object.defineProperty(obj, k, { get: () => tmp.value[k] }); });
    return obj;
  }
  return { computedReactive };
}