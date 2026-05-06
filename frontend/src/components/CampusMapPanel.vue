<template>
  <div class="campus-map-shell">
    <div class="campus-map-toolbar">
      <el-tag type="success">Leaflet 开放地图 SDK</el-tag>
      <el-tag type="info">重邮南山校区示意</el-tag>
      <span class="campus-map-note">底图来自 OpenStreetMap，线路和车辆为系统实时模拟数据</span>
    </div>

    <div v-if="loadError" class="campus-map-fallback">
      <div class="campus-map-fallback-copy">
        <strong>开放地图底图加载失败，已回退到内置校园示意图。</strong>
        <p>{{ loadError }}</p>
      </div>
      <svg viewBox="0 0 960 520" class="campus-map-svg" role="img" aria-label="重庆邮电大学校园班车示意图">
        <defs>
          <linearGradient id="campusBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#eef7ff" />
            <stop offset="100%" stop-color="#f9fcff" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="960" height="520" rx="28" fill="url(#campusBg)" />
        <rect x="34" y="36" width="220" height="108" rx="22" fill="#dbeafe" opacity="0.85" />
        <rect x="690" y="44" width="226" height="118" rx="24" fill="#dcfce7" opacity="0.88" />
        <rect x="318" y="196" width="288" height="126" rx="26" fill="#e0e7ff" opacity="0.85" />
        <rect x="76" y="350" width="220" height="110" rx="24" fill="#fee2e2" opacity="0.82" />
        <rect x="660" y="336" width="212" height="118" rx="24" fill="#fef3c7" opacity="0.9" />

        <text x="88" y="88" class="campus-zone-title">宿舍区</text>
        <text x="716" y="96" class="campus-zone-title">图书馆与行政区</text>
        <text x="392" y="252" class="campus-zone-title">教学核心区</text>
        <text x="114" y="404" class="campus-zone-title">食堂与生活区</text>
        <text x="698" y="402" class="campus-zone-title">实验楼片区</text>

        <g>
          <path d="M120 130 C 250 160, 320 218, 410 242" class="campus-road" />
          <path d="M410 242 C 560 278, 640 212, 770 142" class="campus-road" />
          <path d="M206 384 C 308 332, 352 308, 410 260" class="campus-road" />
          <path d="M550 302 C 640 324, 700 344, 774 388" class="campus-road" />
        </g>

        <g v-for="route in routes" :key="route.id">
          <polyline
            v-if="routePoints(route).length > 1"
            :points="routePoints(route)"
            class="campus-route-line"
          />
        </g>

        <g v-for="stop in uniqueStops" :key="stop.stop_name">
          <circle :cx="scaleX(stop.position.lng)" :cy="scaleY(stop.position.lat)" r="9" class="campus-stop-dot" />
          <text :x="scaleX(stop.position.lng) + 12" :y="scaleY(stop.position.lat) + 4" class="campus-stop-label">
            {{ stop.stop_name }}
          </text>
        </g>

        <g v-for="vehicle in vehicles" :key="vehicle.id">
          <circle
            :cx="scaleX(vehicle.position.lng)"
            :cy="scaleY(vehicle.position.lat)"
            r="11"
            :class="['campus-vehicle-dot', `status-${statusClass(vehicle.runStatus)}`]"
          />
          <text
            :x="scaleX(vehicle.position.lng) + 14"
            :y="scaleY(vehicle.position.lat) - 10"
            class="campus-vehicle-label"
          >
            {{ vehicle.plateNumber }}
          </text>
        </g>
      </svg>
    </div>

    <div v-else class="campus-map">
      <div ref="mapRef" class="leaflet-map-canvas"></div>
      <div class="campus-map-legend">
        <span><i class="legend-dot normal"></i>正常</span>
        <span><i class="legend-dot delayed"></i>延误</span>
        <span><i class="legend-dot rerouting"></i>绕行</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  routes: {
    type: Array,
    default: () => []
  },
  vehicles: {
    type: Array,
    default: () => []
  }
});

const mapRef = ref(null);
const loadError = ref('');
let mapInstance = null;
let routeLayer = null;
let stopLayer = null;
let vehicleLayer = null;
let leafletReady = false;
let animationFrameId = null;
let boundsLocked = false;
const vehicleMarkers = new Map();
const vehicleAnimations = new Map();

const bounds = {
  minLng: 106.5985,
  maxLng: 106.6065,
  minLat: 29.5348,
  maxLat: 29.5408
};

function scaleX(lng) {
  const ratio = (Number(lng) - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1);
  return 70 + ratio * 820;
}

function scaleY(lat) {
  const ratio = (Number(lat) - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1);
  return 450 - ratio * 360;
}

function routePoints(route) {
  return (route.stops || [])
    .filter((stop) => stop.position)
    .map((stop) => `${scaleX(stop.position.lng)},${scaleY(stop.position.lat)}`)
    .join(' ');
}

function statusClass(status) {
  if (status === '延误') return 'delayed';
  if (status === '绕行') return 'rerouting';
  return 'normal';
}

const uniqueStops = computed(() => {
  const seen = new Map();
  props.routes.forEach((route) => {
    (route.stops || []).forEach((stop) => {
      if (!seen.has(stop.stop_name)) {
        seen.set(stop.stop_name, stop);
      }
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
    if (window.L) {
      resolve(window.L);
      return;
    }

    const existing = document.querySelector('script[data-leaflet-js="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', () => reject(new Error('Leaflet SDK 脚本加载失败')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.dataset.leafletJs = 'true';
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Leaflet SDK 脚本加载失败'));
    document.body.appendChild(script);
  });
}

function buildRouteColor(index) {
  return ['#2563eb', '#0ea5e9', '#f97316', '#22c55e', '#9333ea'][index % 5];
}

function interpolatePoint(start, end, progress) {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress
  ];
}

function getVehiclePopup(vehicle) {
  return (
    `<strong>${vehicle.routeName}</strong><br>` +
    `${vehicle.plateNumber}<br>` +
    `当前位置：${vehicle.currentStop}<br>` +
    `下一站：${vehicle.nextStop}<br>` +
    `ETA：${vehicle.etaMinutes} 分钟<br>` +
    `状态：${vehicle.runStatus}<br>` +
    `拥挤度：${vehicle.occupancyLevel}<br>` +
    `更新时间：${new Date(vehicle.lastReportedAt).toLocaleTimeString('zh-CN', { hour12: false })}`
  );
}

function destroyLayers() {
  routeLayer?.clearLayers?.();
  stopLayer?.clearLayers?.();
  vehicleLayer?.clearLayers?.();
  vehicleMarkers.clear();
  vehicleAnimations.clear();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function renderRoutes(L) {
  routeLayer = routeLayer || L.layerGroup().addTo(mapInstance);
  routeLayer.clearLayers();

  props.routes.forEach((route, index) => {
    const latLngs = (route.stops || [])
      .filter((stop) => stop.position)
      .map((stop) => [stop.position.lat, stop.position.lng]);

    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: buildRouteColor(index),
        weight: 5,
        opacity: 0.78,
        dashArray: '8, 12'
      })
        .bindPopup(`<strong>${route.route_name}</strong><br>${route.start_stop} → ${route.end_stop}`)
        .addTo(routeLayer);
    }
  });
}

function renderStops(L) {
  stopLayer = stopLayer || L.layerGroup().addTo(mapInstance);
  stopLayer.clearLayers();

  uniqueStops.value.forEach((stop) => {
    L.circleMarker([stop.position.lat, stop.position.lng], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#1d4ed8',
      fillOpacity: 0.95
    })
      .bindTooltip(stop.stop_name, { direction: 'top' })
      .bindPopup(`<strong>${stop.stop_name}</strong><br>所属线路站点`)
      .addTo(stopLayer);
  });
}

function queueVehicleAnimation(vehicle, marker) {
  const now = Date.now();
  const nextDuration = Math.max(12000, Math.min(30000, Number(vehicle.etaMinutes || 3) * 6000));
  const previousAnimation = vehicleAnimations.get(vehicle.id);
  const startLatLng = previousAnimation?.currentPosition
    || [vehicle.position.lat, vehicle.position.lng];
  const targetLatLng = vehicle.nextPosition
    ? [vehicle.nextPosition.lat, vehicle.nextPosition.lng]
    : [vehicle.position.lat, vehicle.position.lng];

  vehicleAnimations.set(vehicle.id, {
    marker,
    vehicle,
    startLatLng,
    targetLatLng,
    currentPosition: startLatLng,
    startedAt: now,
    durationMs: nextDuration
  });
}

function animateVehicles() {
  const now = Date.now();

  vehicleAnimations.forEach((animation, vehicleId) => {
    const progress = Math.min(1, (now - animation.startedAt) / animation.durationMs);
    const nextPosition = interpolatePoint(animation.startLatLng, animation.targetLatLng, progress);
    animation.currentPosition = nextPosition;
    animation.marker.setLatLng(nextPosition);
    vehicleAnimations.set(vehicleId, animation);
  });

  if (vehicleAnimations.size) {
    animationFrameId = requestAnimationFrame(animateVehicles);
  } else {
    animationFrameId = null;
  }
}

function renderVehicles(L) {
  vehicleLayer = vehicleLayer || L.layerGroup().addTo(mapInstance);
  const activeIds = new Set(props.vehicles.map((vehicle) => vehicle.id));

  props.vehicles.forEach((vehicle) => {
    const color = statusClass(vehicle.runStatus) === 'delayed'
      ? '#ef4444'
      : statusClass(vehicle.runStatus) === 'rerouting'
        ? '#f59e0b'
        : '#10b981';

    let marker = vehicleMarkers.get(vehicle.id);
    if (!marker) {
      marker = L.circleMarker([vehicle.position.lat, vehicle.position.lng], {
        radius: 10,
        color: '#ffffff',
        weight: 3,
        fillColor: color,
        fillOpacity: 1
      }).addTo(vehicleLayer);
      vehicleMarkers.set(vehicle.id, marker);
    } else {
      marker.setStyle({
        fillColor: color
      });
    }

    marker.bindPopup(getVehiclePopup(vehicle));
    queueVehicleAnimation(vehicle, marker);
  });

  Array.from(vehicleMarkers.keys()).forEach((id) => {
    if (!activeIds.has(id)) {
      const marker = vehicleMarkers.get(id);
      marker?.remove();
      vehicleMarkers.delete(id);
      vehicleAnimations.delete(id);
    }
  });

  if (!animationFrameId && vehicleAnimations.size) {
    animationFrameId = requestAnimationFrame(animateVehicles);
  }
}

async function initMap() {
  await nextTick();
  if (!mapRef.value || leafletReady) return;

  try {
    ensureLeafletCss();
    const L = await loadLeafletScript();
    if (!L) {
      throw new Error('Leaflet SDK 未正确加载');
    }

    mapInstance = L.map(mapRef.value, {
      zoomControl: true,
      attributionControl: true
    }).setView([29.538375, 106.601167], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    leafletReady = true;
    renderMapData();
  } catch (error) {
    loadError.value = error.message || '开放地图资源加载失败';
  }
}

function renderMapData() {
  if (!leafletReady || !window.L || !mapInstance) return;
  const { L } = window;

  renderRoutes(L);
  renderStops(L);
  renderVehicles(L);

  const latLngs = uniqueStops.value.map((stop) => [stop.position.lat, stop.position.lng]);
  if (latLngs.length && !boundsLocked) {
    mapInstance.fitBounds(latLngs, {
      padding: [30, 30],
      maxZoom: 18
    });
    boundsLocked = true;
  }
}

onMounted(initMap);

watch(
  () => [props.routes, props.vehicles],
  () => {
    renderMapData();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  destroyLayers();
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>
