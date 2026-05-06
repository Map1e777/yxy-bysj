<template>
  <div class="stop-map-editor">
    <div class="sme-toolbar">
      <el-select v-model="activeStopName" placeholder="选择站点 → 点击地图定位" clearable style="width: 240px">
        <el-option v-for="s in uniqueStops" :key="s.stop_name" :label="s.stop_name" :value="s.stop_name" />
      </el-select>
      <el-tag v-if="activeStopName" type="warning">
        点击地图可将「{{ activeStopName }}」移到新位置，或直接拖动标记
      </el-tag>
      <el-tag v-else type="info">选择站点后点击地图定位，或直接拖动任意标记</el-tag>
    </div>
    <div ref="mapRef" class="sme-canvas"></div>
    <p class="sme-hint">修改后坐标实时保存，刷新地图面板即可看到更新后的站点位置。</p>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { updateRouteStopPosition } from '../api/dashboard';

const props = defineProps({
  routes: { type: Array, default: () => [] }
});

const mapRef = ref(null);
const activeStopName = ref('');
let mapInstance = null;
let leafletReady = false;
const markerMap = new Map();

const uniqueStops = computed(() => {
  const seen = new Map();
  props.routes.forEach((route) => {
    (route.stops || []).forEach((stop) => {
      if (!seen.has(stop.stop_name)) seen.set(stop.stop_name, stop);
    });
  });
  return Array.from(seen.values());
});

function ensureLeafletCss() {
  if (document.querySelector('link[data-leaflet-css="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.dataset.leafletCss = 'true';
  document.head.appendChild(link);
}

function loadLeafletScript() {
  return new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }
    const existing = document.querySelector('script[data-leaflet-js="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', () => reject(new Error('Leaflet 加载失败')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.dataset.leafletJs = 'true';
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Leaflet 加载失败'));
    document.body.appendChild(script);
  });
}

function buildIcon(L, isActive) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${isActive ? '#f59e0b' : '#2563eb'};
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

async function savePosition(stopName, lat, lng) {
  try {
    await updateRouteStopPosition({ stopName, lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) });
    ElMessage.success(`「${stopName}」位置已保存`);
  } catch {
    ElMessage.error('保存失败，请重试');
  }
}

function renderMarkers(L) {
  markerMap.forEach((m) => m.remove());
  markerMap.clear();

  uniqueStops.value.forEach((stop) => {
    const pos = stop.position || { lat: 29.538375, lng: 106.601167 };
    const isActive = stop.stop_name === activeStopName.value;
    const marker = L.marker([pos.lat, pos.lng], {
      draggable: true,
      icon: buildIcon(L, isActive)
    })
      .bindTooltip(stop.stop_name, { direction: 'top', permanent: false })
      .addTo(mapInstance);

    marker.on('dragend', async (e) => {
      const { lat, lng } = e.target.getLatLng();
      await savePosition(stop.stop_name, lat, lng);
    });

    marker.on('click', () => {
      activeStopName.value = stop.stop_name;
    });

    markerMap.set(stop.stop_name, marker);
  });
}

async function initMap() {
  await nextTick();
  if (!mapRef.value || leafletReady) return;
  try {
    ensureLeafletCss();
    const L = await loadLeafletScript();
    mapInstance = L.map(mapRef.value, { zoomControl: true }).setView([29.538375, 106.601167], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    mapInstance.on('click', async (e) => {
      if (!activeStopName.value) return;
      const { lat, lng } = e.latlng;
      const marker = markerMap.get(activeStopName.value);
      if (marker) marker.setLatLng([lat, lng]);
      await savePosition(activeStopName.value, lat, lng);
    });

    leafletReady = true;
    renderMarkers(L);
  } catch (e) {
    ElMessage.error(e.message || '地图加载失败');
  }
}

onMounted(initMap);

watch(() => props.routes, () => {
  if (leafletReady && window.L) renderMarkers(window.L);
}, { deep: true });

watch(activeStopName, () => {
  if (leafletReady && window.L) renderMarkers(window.L);
});

onBeforeUnmount(() => {
  markerMap.forEach((m) => m.remove());
  markerMap.clear();
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }
});
</script>

<style scoped>
.stop-map-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sme-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sme-canvas {
  height: 420px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
}

.sme-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 0;
}
</style>
