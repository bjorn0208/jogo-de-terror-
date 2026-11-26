import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* Pós-processamento leve: Aberração cromática nas bordas, grão de filme,
   vinheta e aquele verde-amarelado doente dos filmes de Silent Hill. */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1280, 720) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

    void main() {
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);
      float ca = 0.0012 + r2 * 0.011;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + d * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - d * ca).b;

      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 sickShadow = vec3(0.84, 1.0, 0.88);
      vec3 sickLight  = vec3(1.06, 1.0, 0.86);
      col *= mix(sickShadow, sickLight, smoothstep(0.03, 0.65, lum));
      col = mix(vec3(lum), col, 0.8);
      col = (col - 0.5) * 1.1 + 0.5;

      col *= 1.0 - smoothstep(0.16, 0.78, r2) * 0.78;

      float g = hash(uv * uResolution + fract(uTime * 0.37) * 913.0) - 0.5;
      col += g * 0.05 * (0.4 + 0.6 * (1.0 - smoothstep(0.0, 0.5, lum)));

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  return {
    composer,
    setSize(w, h) { composer.setSize(w, h); grade.uniforms.uResolution.value.set(w, h); },
    render(time) { grade.uniforms.uTime.value = time; composer.render(); },
  };
}
