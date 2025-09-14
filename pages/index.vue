<template>
  <div>
    <el-space :spacer="spacer">
      <el-link href="/MessageInputDemo">消息输入框</el-link>
      <el-link href="/FlexColumnScrollbar">flex col 布局</el-link>
      <el-link href="/FlexColumnScrollbar2">flex col 布局2</el-link>
      <el-link href="/MessageEditorDemo">消息编辑器</el-link>
    </el-space>
  </div>
</template>

<script setup lang="ts">
import { ElDivider } from "element-plus";
const spacer = h(ElDivider, { direction: "vertical" });
</script>
