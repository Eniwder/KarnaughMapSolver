import App from './App.vue';
import i18n from "./i18n";
import { registerPlugins } from '@/plugins';
import { createApp } from 'vue';

const app = createApp(App);

registerPlugins(app);
app.use(i18n);

app.mount('#app')


