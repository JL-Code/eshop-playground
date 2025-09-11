<template>
  <div>
    <el-space :spacer="spacer">
      <el-link href="/MessageInputDemo">消息输入框</el-link>
    </el-space>
  </div>
</template>

<script setup lang="ts">
import { ElDivider } from "element-plus";
const spacer = h(ElDivider, { direction: "vertical" });
</script>
