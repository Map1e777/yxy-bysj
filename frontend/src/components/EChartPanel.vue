<template>
  <div ref="chartRef" class="chart-canvas" :style="{ height }"></div>
</template>

<script setup>
import * as echarts from 'echarts';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  option: {
    type: Object,
    required: true
  },
  height: {
    type: String,
    default: '320px'
  }
});

const chartRef = ref(null);
let chartInstance;
let resizeObserver;

async function renderChart() {
  await nextTick();
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }
  chartInstance.setOption(props.option, true);
}

function handleResize() {
  chartInstance?.resize();
}

onMounted(async () => {
  await renderChart();
  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(chartRef.value);
  window.addEventListener('resize', handleResize);
});

watch(
  () => props.option,
  async () => {
    await renderChart();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>
