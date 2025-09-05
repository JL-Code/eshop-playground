<template>
  <div>
    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.name"
        :label="tab.label"
        :name="tab.name"
      >
        <!-- 路由视图 -->
        <NuxtPage />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import type { TabsPaneContext } from "element-plus";

const router = useRouter();
const route = useRoute();

// Tab 配置
const tabs = ref([
  { name: "home", label: "首页", path: "/parent" },
  { name: "about", label: "关于", path: "/parent/about" },
  { name: "profile", label: "个人中心", path: "/parent/profile" },
  { name: "settings", label: "设置", path: "/parent/settings" },
]);

// 当前激活的 Tab
const activeTab = ref("home");

// 根据当前路由设置激活的 Tab
const setActiveTabFromRoute = () => {
  const currentTab = tabs.value.find((tab) => tab.path === route.path);
  if (currentTab) {
    activeTab.value = currentTab.name;
  }
};

// Tab 点击处理
const handleTabClick = (pane: TabsPaneContext) => {
  const targetTab = tabs.value.find((tab) => tab.name === pane.paneName);
  if (targetTab && targetTab.path !== route.path) {
    router.push(targetTab.path);
  }
};

// 监听路由变化
watch(
  () => route.path,
  () => {
    setActiveTabFromRoute();
  },
  { immediate: true }
);

// 组件挂载时初始化
onMounted(() => {
  setActiveTabFromRoute();
});
</script>
