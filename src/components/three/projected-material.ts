import * as THREE from "three";

/**
 * Fabric material that PROJECTS a jersey design canvas onto the garment:
 * object-space x/y map onto the front half of the canvas for front-facing
 * surfaces and onto the back half (mirrored) for back-facing ones, blended
 * across the sides. Works on the generated jersey mesh, whose UVs are unusable.
 */
export function createProjectedMaterial(canvas: HTMLCanvasElement, min: THREE.Vector3, max: THREE.Vector3) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const uniforms = { uTex: { value: tex }, uMin: { value: min.clone() }, uMax: { value: max.clone() } };
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color(0.3, 0.3, 0.32),
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjPos;\nvarying vec3 vObjNormal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;\nvObjNormal = normal;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vObjPos;
        varying vec3 vObjNormal;
        uniform sampler2D uTex;
        uniform vec3 uMin;
        uniform vec3 uMax;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 span = max(uMax - uMin, vec3(1e-4));
        float u = clamp((vObjPos.x - uMin.x) / span.x, 0.0, 1.0);
        float v = clamp((vObjPos.y - uMin.y) / span.y, 0.0, 1.0);
        float fb = smoothstep(-0.18, 0.18, vObjNormal.z);
        vec4 c = mix(texture2D(uTex, vec2(0.5 + 0.5 * (1.0 - u), v)), texture2D(uTex, vec2(0.5 * u, v)), fb);
        diffuseColor.rgb *= c.rgb;`,
      );
  };
  return { material, texture: tex };
}

/**
 * Bake the GLB's node transforms into its geometry and recentre it, so the
 * projection works in true model space (x across the chest, y up, z forward).
 */
export function bakeJersey(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true);
  const geometries: THREE.BufferGeometry[] = [];
  const box = new THREE.Box3();
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    g.computeBoundingBox();
    box.union(g.boundingBox!);
    geometries.push(g);
  });
  const centre = box.getCenter(new THREE.Vector3());
  geometries.forEach((g) => g.translate(-centre.x, -centre.y, -centre.z));
  box.translate(centre.negate());
  return { geometries, min: box.min.clone(), max: box.max.clone() };
}
