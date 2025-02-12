import {createApp} from 'vue';
import App from '/@/App.vue';
import router from '/@/router';
import './style/index.scss';
import naive from './naive-ui-load';


// maptalks.TileLayer.prototype.downloadTiles
// maptalks.TileLayer.prototype.downloadCascadeTiles
import './utils/downloadCascadeTiles';

createApp(App)
  .use(router)
  .use(naive)
  .mount('#app');
