import * as THREE from 'three';

// Uniforms globais compartilhados por todos os materiais do mundo
export const U = {
  uTime: { value: 0 }, uWind: { value: 0.25 }, uCamPos: { value: new THREE.Vector3() },
  uSunDir: { value: new THREE.Vector3(0.5, 0.35, 0.3).normalize() },
  uFogA: { value: new THREE.Color() }, uFogB: { value: new THREE.Color() },
  uFogP: { value: new THREE.Vector4(0.0035, 0.03, 10, 0.6) }, // densidade, queda por altura, altura base, ruído
  uReveal: { value: 0 }, uEmit: { value: 2.5 }, uCloud: { value: 0.5 }, uFogMul: { value: 1 },
};

export const GLSL_COMMON = /* glsl */`
uniform float uTime; uniform float uWind; uniform vec3 uCamPos; uniform vec3 uSunDir;
uniform vec3 uFogA; uniform vec3 uFogB; uniform vec4 uFogP; uniform float uReveal; uniform float uEmit; uniform float uCloud; uniform float uFogMul;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+1.),f.x), f.y); }
float fbm2(vec2 p){ return vn(p)*.55 + vn(p*2.07+3.1)*.3 + vn(p*4.3-7.7)*.15; }
vec3 fogColor(vec3 vd){
  float s = pow(max(dot(vd, uSunDir), 0.), 5.);
  float up = clamp(vd.y*2.5, 0., 1.);
  return mix(mix(uFogB, uFogA, s), uFogB*0.92, up*0.4);
}
vec3 applyFog(vec3 col, vec3 wp){
  vec3 d = wp - uCamPos; float dist = length(d); vec3 vd = d/max(dist,1e-3);
  float k = uFogP.y; float h0 = uCamPos.y - uFogP.z, h1 = wp.y - uFogP.z; float dh = h1 - h0;
  float avg = abs(dh) > 0.05 ? (exp(-k*h0) - exp(-k*h1)) / (k*dh) : exp(-k*h0);
  avg = clamp(avg, 0.0, 6.0);
  float n = fbm2(wp.xz*0.010 + vec2(uTime*0.035, uTime*0.012));
  float dens = uFogP.x * uFogMul * (1.0 + uFogP.w*(n-0.5)*2.0);
  float f = 1.0 - exp(-dens*dist*(avg + 0.06));
  f *= 1.0 - uReveal*0.9*smoothstep(380., 900., dist)*smoothstep(0.1, 0.7, -vd.z);
  return mix(col, fogColor(vd), clamp(f, 0., 1.));
}
`;

export function patchWorld(mat, extra = {}) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, extra.uniforms || {});
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\nattribute vec2 aMisc; varying vec3 vWPos; varying float vEmit;\n${extra.vertHead || ''}`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
        #ifdef USE_INSTANCING
          vec4 wp0 = modelMatrix * instanceMatrix * vec4(position,1.);
        #else
          vec4 wp0 = modelMatrix * vec4(position,1.);
        #endif
        float sw = aMisc.x * uWind;
        if (sw > 0.0) { float ph = wp0.x*0.09 + wp0.z*0.07 + wp0.y*0.05;
          float g = vn(wp0.xz*0.02 + vec2(uTime*0.25, 0.)) ;
          transformed.x += sw * (sin(uTime*1.6 + ph)*0.55 + sin(uTime*3.1 + ph*2.3)*0.2) * (0.6+g);
          transformed.z += sw * sin(uTime*1.25 + ph*1.7) * 0.35 * (0.6+g);
          transformed.y += sw * sin(uTime*2.2 + ph*1.3) * 0.08; }
        vEmit = aMisc.y;
        ${extra.vertBody || ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vWPos = (modelMatrix * instanceMatrix * vec4(transformed,1.)).xyz;
        #else
          vWPos = (modelMatrix * vec4(transformed,1.)).xyz;
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\nvarying vec3 vWPos; varying float vEmit;\n${extra.fragHead || ''}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { float cn = fbm2(vWPos.xz*0.0045 + vec2(uTime*0.010, uTime*0.004));
          reflectedLight.directDiffuse *= mix(1.0, 0.45, uCloud*smoothstep(0.42, 0.68, cn)); }`)
      .replace('#include <opaque_fragment>', `outgoingLight += diffuseColor.rgb * vEmit * uEmit; ${extra.fragBody || ''}\n#include <opaque_fragment>`)
      .replace('#include <fog_fragment>', extra.noFog ? '' : `gl_FragColor.rgb = applyFog(gl_FragColor.rgb, vWPos);`);
  };
  mat.customProgramCacheKey = () => 'world' + (extra.key || '');
  return mat;
}

export function worldMaterial(extra) {
  return patchWorld(new THREE.MeshLambertMaterial({ vertexColors: true }), extra);
}

export function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uZenith: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `${GLSL_COMMON}\nuniform vec3 uZenith; uniform vec3 uSunCol; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir);
        vec3 c = mix(fogColor(d), uZenith, smoothstep(0.02, 0.6, d.y));
        float s = max(dot(d, uSunDir), 0.);
        c += uSunCol * (pow(s, 300.)*0.35 + pow(s, 24.)*0.22);
        float cl = fbm2(d.xz/(d.y+0.15)*1.6 + vec2(uTime*0.01, 0.)); c = mix(c, c*1.04 + 0.02, smoothstep(0.5,0.8,cl)*smoothstep(0.0,0.3,d.y));
        gl_FragColor = vec4(c, 1.); }`,
    side: THREE.BackSide, depthWrite: false,
  });
}

export function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uDeep: { value: new THREE.Color(0x1d3346) }, uShallow: { value: new THREE.Color(0x5d8199) }, uSky: { value: new THREE.Color(0xdde6f0) } },
    vertexShader: `varying vec3 vWPos; void main(){ vec4 w = modelMatrix*vec4(position,1.); vWPos = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${GLSL_COMMON}\nuniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; varying vec3 vWPos;
      void main(){
        vec2 p = vWPos.xz;
        float e = 0.6;
        float hC = vn(p*0.35 + vec2(uTime*0.5, uTime*0.2)) + vn(p*0.9 - vec2(uTime*0.4, -uTime*0.6))*0.5;
        float hX = vn((p+vec2(e,0.))*0.35 + vec2(uTime*0.5, uTime*0.2)) + vn((p+vec2(e,0.))*0.9 - vec2(uTime*0.4, -uTime*0.6))*0.5;
        float hZ = vn((p+vec2(0.,e))*0.35 + vec2(uTime*0.5, uTime*0.2)) + vn((p+vec2(0.,e))*0.9 - vec2(uTime*0.4, -uTime*0.6))*0.5;
        vec3 n = normalize(vec3((hC-hX)*0.9, 1.0, (hC-hZ)*0.9));
        vec3 v = normalize(uCamPos - vWPos);
        float fr = 0.04 + 0.96*pow(1.0 - max(dot(n, v), 0.), 5.);
        vec3 r = reflect(-v, n);
        vec3 refl = mix(fogColor(normalize(vec3(r.x, max(r.y,0.02), r.z))), uSky, 0.3);
        vec3 c = mix(mix(uDeep, uShallow, 0.35), refl, clamp(fr*1.3, 0., 1.));
        float sp = pow(max(dot(r, uSunDir), 0.), 220.);
        c += vec3(1.0, 0.85, 0.65) * sp * 6.0;
        float ice = smoothstep(0.62, 0.7, fbm2(p*0.05)) ;
        c = mix(c, vec3(0.80, 0.86, 0.93), ice*0.85);
        gl_FragColor = vec4(applyFog(c, vWPos), 1.);
      }`,
  });
}
