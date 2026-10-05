<!-- Daybreak-Icon (Kalenderblatt mit aufgehender Sonne),
     ohne Hintergrund und über Theme-Tokens eingefärbt. public/favicon.svg ist dasselbe Icon als App-Icon (feste Farben). -->
<script setup lang="ts">
// Mask-ID pro Instanz eindeutig, sonst kollidieren mehrere Logos auf einer Seite
const maskId = useId()
</script>

<template>
  <svg viewBox="310 350 1380 1380" aria-hidden="true">
    <defs>
      <mask :id="maskId" maskUnits="userSpaceOnUse" x="-500" y="-500" width="3000" height="3000">
        <rect x="-500" y="-500" width="3000" height="3000" fill="white" />
        <path d="M551.5,1560 A448.5,448.5 0 0 1 1448.5,1560 A178.5,178.5 0 0 1 1270,1738.5 L730,1738.5 A178.5,178.5 0 0 1 551.5,1560 Z" fill="black" />
      </mask>
    </defs>
    <g :mask="`url(#${maskId})`" fill="none" class="stroke-current" stroke-width="162">
      <rect x="400" y="540" width="1200" height="1020" rx="190" />
      <line x1="400" y1="850" x2="1600" y2="850" />
      <line x1="700" y1="380" x2="700" y2="660" />
      <line x1="1300" y1="380" x2="1300" y2="660" />
    </g>
    <path d="M661.1,1560 A338.9,338.9 0 0 1 1338.8,1560 A68.8,68.8 0 0 1 1270,1628.8 L730,1628.8 A68.8,68.8 0 0 1 661.1,1560 Z" fill="none" class="stroke-primary" stroke-width="137.7" opacity="0.57" />
    <path d="M730,1560 A270,270 0 0 1 1270,1560 Z" class="fill-primary" />
  </svg>
</template>
