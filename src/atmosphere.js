import * as THREE from 'three';

/* Ar limpo: sem névoa e sem pó. O que sobra é só o feixe da própria
   lanterna — luz espalhada no ar, não bruma nem partícula. */

export function createAtmosphere(scene, camera, tex, roomSize, lowEnd = false) {
  const len = 20;
  const radius = Math.tan(0.58) * len;
  const geo = new THREE.ConeGeometry(radius, len, lowEnd ? 14 : 28, 1, true);
  geo.translate(0, -len / 2, 0); // ponta na origem
  geo.rotateX(Math.PI / 2);      // aponta para -Z (frente da câmera)

  const mat = new THREE.MeshBasicMaterial({
    map: tex.beam,
    color: 0xffe9c4,
    transparent: true,
    opacity: 0.04,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });

  const beam = new THREE.Mesh(geo, mat);
  beam.position.set(0.1, -0.1, -0.08);
  beam.renderOrder = 3;
  camera.add(beam);

  return {
    beam,
    update(time, flashlightOn, brightness = 1) {
      beam.visible = flashlightOn;
      mat.opacity = (0.04 + Math.sin(time * 7.3) * 0.001 + Math.sin(time * 2.1) * 0.0015) * brightness;
    },
  };
}
