<template>
  <el-container class="h-full">
    <el-header class="bg-red-500"></el-header>
    <el-main class="flex-1 p-0!">
      <el-scrollbar>
        <div class="message-items">
          <div class="message-item" v-for="value in 100">
            {{ value }}
          </div>
        </div>
      </el-scrollbar>
    </el-main>
    <el-footer class="bg-red-500"></el-footer>
  </el-container>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped></style>
