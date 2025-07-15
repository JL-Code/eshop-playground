<script setup lang="ts">
import {
  Button,
  Hr,
  Html,
  Text,
  Row,
  Column,
  Section,
} from "@vue-email/components";

defineProps({
  title: String,
});
</script>

<template>
  <Html lang="en">
    <Text>{{ title }}</Text>
    <Hr />
    <Button href="https://example.com">Click me</Button>
    <Section>
      <Row>
        <Column>A1</Column>
        <Column>A2</Column>
      </Row>
      <Row>
        <Column>B</Column>
      </Row>
      <Row>
        <Column>C</Column>
      </Row>
    </Section>
  </Html>
</template>
