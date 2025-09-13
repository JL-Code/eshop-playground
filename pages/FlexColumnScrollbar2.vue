<template>
  <div class="h-full flex flex-col">
    <div class="bg-red-500 h-15"></div>
    <div class="flex-1 overflow-auto">
      <el-scrollbar>
        <div class="message-items">
          <div class="message-item" v-for="value in 100">
            {{ value }}
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div class="bg-red-500 h-15"></div>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped></style>
