<template>
  <div>
    <div class="container">
      <div id="bar">
        <h1>Vue Email Editor (Demo)</h1>

        <button v-on:click="saveDesign">Save Design</button>
        <button v-on:click="exportHtml">Export HTML</button>
      </div>

      <EmailEditor
        ref="emailEditor"
        v-on:load="editorLoaded"
        v-on:ready="editorReady"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// https://vue-email-editor-demo.netlify.app/
// https://unlayer.com/?utm_medium=web-editor&utm_campaign=editor-referral
import { EmailEditor } from "vue-email-editor";
const emailEditorRef = useTemplateRef("emailEditor");

// called when the editor is created
const editorLoaded = () => {
  console.log("editorLoaded");
  // Pass the template JSON here
  // this.$refs.emailEditor.editor.loadDesign({});
};
const editorReady = () => {
  console.log("editorReady");
};
const saveDesign = () => {
  emailEditorRef.value.editor.saveDesign((design: string) => {
    console.log("saveDesign", design);
  });
};
const exportHtml = () => {
  emailEditorRef.value.editor.exportHtml((data) => {
    console.log("exportHtml", data);
  });
};
</script>
