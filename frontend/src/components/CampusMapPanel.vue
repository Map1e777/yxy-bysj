<template>
  <div class="campus-map">
    <svg viewBox="0 0 960 520" class="campus-map-svg" role="img" aria-label="校园班车实时示意图">
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
</template>

<script setup>
import { computed } from 'vue';

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

const bounds = {
  minLng: 106.568,
  maxLng: 106.586,
  minLat: 29.558,
  maxLat: 29.579
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
</script>
