<template>
  <div>
    <el-segmented
      v-model="size"
      :options="sizeOptions"
      style="margin-bottom: 1rem"
    />
    <br />
    <el-segmented
      v-model="direction"
      :options="directionOptions"
      style="margin-bottom: 1rem"
    />
    <br />
    <el-segmented
      v-model="value"
      :options="options"
      :direction="direction"
      :size="size"
    >
      <template #default="scope">
        <div
          :class="[
            'flex',
            'items-center',
            'gap-2',
            'flex-col',
            direction === 'horizontal' && 'p-2',
          ]"
        >
          <el-icon size="20">
            <component :is="scope.item.icon" />
          </el-icon>
          <div>{{ scope.item.label }}</div>
        </div>
      </template>
    </el-segmented>
    <div><NuxtPage /></div>
    {{ activeTab }}
    <!-- <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.name"
        :label="tab.label"
        :name="tab.name"
      >
        <keep-alive>
          <NuxtPage />
        </keep-alive>
      </el-tab-pane>
    </el-tabs> -->

    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane
        v-for="tab in tabs"
        lazy
        :key="tab.name"
        :label="tab.label"
        :name="tab.name"
      >
        <keep-alive>
          <component :is="tab.component" :key="tab.name" />
        </keep-alive>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import type { TabsPaneContext } from "element-plus";
import type { SegmentedProps } from "element-plus";
import { defineAsyncComponent } from "vue";

const value = ref("Apple");
const direction = ref<SegmentedProps["direction"]>("horizontal");
const size = ref<SegmentedProps["size"]>("default");

const directionOptions = [
  { label: "Horizontal", value: "horizontal" },
  { label: "Vertical", value: "vertical" },
];

const sizeOptions = ["large", "default", "small"];

const options = [
  {
    label: "home",
    value: "/parent",
  },
  {
    label: "about",
    value: "/parent/about",
  },
  {
    label: "profile",
    value: "/parent/profile",
  },
];

const router = useRouter();
const route = useRoute();

// Tab 配置
const tabs = shallowRef([
  {
    name: "home",
    label: "首页",
    path: "/parent",
    component: defineAsyncComponent(() => import("./parent/Home.vue")),
  },
  {
    name: "about",
    label: "关于",
    path: "/parent/about",
    component: defineAsyncComponent(() => import("./parent/About.vue")),
  },
  {
    name: "profile",
    label: "个人中心",
    path: "/parent/profile",
    component: defineAsyncComponent(() => import("./parent/Profile.vue")),
  },
  {
    name: "settings",
    label: "设置",
    path: "/parent/settings",
    component: defineAsyncComponent(() => import("./parent/Settings.vue")),
  },
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
    console.log("route.path", route.path);
    setActiveTabFromRoute();
  }
);

// 组件挂载时初始化
onMounted(() => {
  console.log("parent mounted");
  setActiveTabFromRoute();
});
</script>
