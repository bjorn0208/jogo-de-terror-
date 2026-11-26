import * as THREE from 'three';
import { rng } from './textures.js';

/* Poeira suspensa que so aparece dentro do feixe da lanterna,
   e um cone de luz bem fraco para dar volume ao ar parado. */

export function createAtmosphere(scene, camera, tex, roomSize, lowEnd = false) {
  const { w, d, h } = roomSize;
  const count = lowEnd ? 220 : 520;
  const pos = new Float32Array(count * 3);
  const scale = new Float32Array(count);
  const r = rng(7781);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * (w - 0.4);
    pos[i * 3 + 1] = 0.1 + r() * (h - 0.25);
    pos[i * 3 + 2] = (r() - 0.5) * (d - 0.4);
    scale[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));

  const uniforms = {
    uTime: { value: 0 },
    uLightPos: { value: new THREE.Vector3() },
    uLightDir: { value: new THREE.Vector3(0, 0, -1) },
    uMap: { value: tex.dust },
    uOn: { value: 1 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aScale;
      uniform float uTime;
      uniform vec3 uLightPos;
      uniform vec3 uLightDir;
      uniform float uOn;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime * 0.24 + aScale * 31.4;
        p.x += sin(t * 0.7) * 0.16 + sin(t * 0.23) * 0.08;
        p.y += sin(t * 0.53 + aScale * 8.0) * 0.11;
        p.z += cos(t * 0.61) * 0.14;
        vec3 toP = p - uLightPos;
        float dist = length(toP);
        float ang = dot(normalize(toP), normalize(uLightDir));
        float inBeam = smoothstep(0.80, 0.98, ang) * (1.0 - smoothstep(2.0, 13.0, dist));
        vAlpha = inBeam * uOn * (0.04 + aScale * 0.13) * smoothstep(0.15, 0.8, dist);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + aScale * 5.0) * (90.0 / max(0.1, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(t.rgb * vec3(1.0, 1.0, 0.88), t.a * vAlpha);
      }
    `,
  });

  const dust = new THREE.Points(geo, mat);
  dust.frustumCulled = false;
  scene.add(dust);

  // cone de feixe — anexado a camera, segue a lanterna automaticamente
  const len = 11, radius = Math.tan(0.42) * len;
  const coneGeo = new THREE.ConeGeometry(radius, len, lowEnd ? 14 : 28, 1, true);
  coneGeo.translate(0, -len / 2, 0);
  coneGeo.rotateX(Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    map: tex.beam,
    color: 0xd8e0b8,
    transparent: true,
    opacity: 0.028,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const beam = new THREE.Mesh(coneGeo, beamMat);
  beam.position.set(0.12, -0.12, -0.08);
  beam.renderOrder = 3;
  camera.add(beam);

  const lightPos = new THREE.Vector3();
  const lightDir = new THREE.Vector3();

  return {
    update(time, flashlightOn) {
      uniforms.uTime.value = time;
      uniforms.uOn.value = flashlightOn ? 1 : 0;
      beam.visible = flashlightOn;
      beamMat.opacity = 0.028 + Math.sin(time * 7.3) * 0.0015 + Math.sin(time * 2.1) * 0.002;
      beam.getWorldPosition(lightPos);
      camera.getWorldDirection(lightDir);
      uniforms.uLightPos.value.copy(lightPos);
      uniforms.uLightDir.value.copy(lightDir);
    },
    beam,
  };
}
