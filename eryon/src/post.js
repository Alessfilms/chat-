// Pós-processamento cinematográfico: DOF físico (CoC por profundidade, gather em meia resolução),
// bloom sutil, tonemapping filmico, color grade, vinheta, grão de filme e fades.
import * as THREE from 'three';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
function pass(frag, uniforms) {
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); return { m, s, u: uniforms };
}
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

export class Post {
  constructor(renderer, w, h, samples = 4) {
    this.r = renderer; this.w = w; this.h = h;
    const hf = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.scene = new THREE.WebGLRenderTarget(w, h, { ...hf, samples, depthTexture: new THREE.DepthTexture(w, h, THREE.FloatType) });
    this.half = new THREE.WebGLRenderTarget(w >> 1, h >> 1, hf);
    this.dof = new THREE.WebGLRenderTarget(w >> 1, h >> 1, hf);
    this.q1 = new THREE.WebGLRenderTarget(w >> 2, h >> 2, hf); this.q2 = this.q1.clone();
    this.e1 = new THREE.WebGLRenderTarget(w >> 3, h >> 3, hf); this.e2 = this.e1.clone();
    this.P = {
      focus: 50, aperture: 10, maxCoc: 14, near: 0.5, far: 8000, exposure: 1, bloom: 0.18, fade: 0, white: 0,
      vignette: 0.18, grain: 0.035, sat: 1, warm: 0, tilt: 0, tiltY: 0.5, lift: new THREE.Vector3(0, 0, 0),
    };
    this.coc = pass(/* glsl */`
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 texel; uniform float uFocus, uAperture, uNear, uFar, uMaxCoc, uTilt, uTiltY;
      varying vec2 vUv;
      float lin(float z){ return uNear*uFar / (uFar - z*(uFar-uNear)); }
      void main(){
        vec3 c = vec3(0.); float coc = 0.; float ws = 0.;
        for (int i=0;i<4;i++){ vec2 o = vec2(i==1||i==3?0.5:-0.5, i>1?0.5:-0.5)*texel;
          c += texture2D(tColor, vUv+o).rgb; float d = lin(texture2D(tDepth, vUv+o).r);
          float k = uAperture * (d - uFocus) / d; // CoC assinado (px meia-res); negativo = primeiro plano
          k += sign(k + 1e-4) * uTilt * pow(abs(vUv.y - uTiltY), 2.0) * 40.0; // reforço tilt-shift
          coc += k; }
        c *= 0.25; coc = clamp(coc*0.25, -uMaxCoc, uMaxCoc);
        gl_FragColor = vec4(c, coc);
      }`, { tColor: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() }, uFocus: { value: 0 }, uAperture: { value: 0 }, uNear: { value: 0 }, uFar: { value: 0 }, uMaxCoc: { value: 0 }, uTilt: { value: 0 }, uTiltY: { value: 0.5 } });
    this.gather = pass(/* glsl */`
      uniform sampler2D tHalf; uniform vec2 texel; uniform float uMaxCoc; varying vec2 vUv;
      const int N = 48;
      void main(){
        vec4 c0 = texture2D(tHalf, vUv); float cc = c0.a;
        vec3 acc = c0.rgb; float wsum = 1.0; float nearW = 0.0;
        float ang0 = fract(sin(dot(vUv, vec2(12.9898,78.233)))*43758.5453)*6.2831;
        for (int i=1;i<N;i++){
          float fi = float(i); float r = sqrt(fi/float(N)) * uMaxCoc; float a = fi*2.39996 + ang0;
          vec4 s = texture2D(tHalf, vUv + vec2(cos(a), sin(a))*r*texel);
          float sc = s.a;
          float cov = (sc > cc) ? min(abs(sc), abs(cc)) : abs(sc); // fundo não vaza sobre primeiro plano nítido
          float w = smoothstep(r - 1.0, r + 0.5, cov);
          acc += s.rgb * w; wsum += w;
          if (sc < -1.0 && sc < cc) nearW += w;
        }
        vec3 col = acc / wsum;
        float a = clamp((abs(cc) - 0.4) / 1.4, 0., 1.);
        a = max(a, clamp(nearW / float(N) * 4.0, 0., 1.));
        gl_FragColor = vec4(col, a);
      }`, { tHalf: { value: null }, texel: { value: new THREE.Vector2() }, uMaxCoc: { value: 0 } });
    this.bright = pass(`uniform sampler2D t; uniform vec2 texel; varying vec2 vUv; void main(){ vec3 c=vec3(0.);
      for(int i=0;i<4;i++){ vec2 o=vec2(i==1||i==3?1.:-1., i>1?1.:-1.)*texel; c+=texture2D(t,vUv+o).rgb; } c*=0.25;
      float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.9, 2.5, l), 1.); }`, { t: { value: null }, texel: { value: new THREE.Vector2() } });
    this.blur = pass(`uniform sampler2D t; uniform vec2 dir; varying vec2 vUv; void main(){
      vec3 c = texture2D(t,vUv).rgb*0.227; c += (texture2D(t,vUv+dir*1.384).rgb + texture2D(t,vUv-dir*1.384).rgb)*0.316;
      c += (texture2D(t,vUv+dir*3.230).rgb + texture2D(t,vUv-dir*3.230).rgb)*0.070; gl_FragColor = vec4(c,1.); }`, { t: { value: null }, dir: { value: new THREE.Vector2() } });
    this.comp = pass(/* glsl */`
      uniform sampler2D tSharp, tDof, tB1, tB2; uniform float uExposure, uBloom, uFade, uWhite, uVig, uGrain, uSat, uWarm, uTime; uniform vec3 uLift; uniform vec2 uRes;
      varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec3 s = texture2D(tSharp, vUv).rgb;
        vec4 d = texture2D(tDof, vUv);
        vec3 c = mix(s, d.rgb, d.a);
        c += (texture2D(tB1, vUv).rgb*0.6 + texture2D(tB2, vUv).rgb*0.8) * uBloom;
        c *= uExposure;
        c = aces(c);
        c = pow(c, vec3(1.0/2.2));
        float l = dot(c, vec3(0.2126,0.7152,0.0722));
        c = mix(vec3(l), c, uSat);
        // split-tone: sombras frias, luzes levemente quentes
        c += (1.0-l) * vec3(-0.012, 0.0, 0.025) + l * vec3(0.02, 0.008, -0.018) * (1.0 + uWarm);
        c = c * (1.0 - uLift) + uLift;
        vec2 q = vUv - 0.5; q.x *= uRes.x/uRes.y;
        c *= 1.0 - uVig * smoothstep(0.35, 0.95, length(q*vec2(1.0, 0.9)));
        float g = h(vUv*uRes + fract(uTime*7.13)*100.) - 0.5;
        c += g * uGrain * (1.1 - l*0.6);
        c = mix(c, vec3(0.93,0.95,0.98), uWhite);
        c *= 1.0 - uFade;
        gl_FragColor = vec4(c, 1.);
      }`, { tSharp: { value: null }, tDof: { value: null }, tB1: { value: null }, tB2: { value: null }, uExposure: { value: 1 }, uBloom: { value: 0 }, uFade: { value: 0 }, uWhite: { value: 0 }, uVig: { value: 0 }, uGrain: { value: 0 }, uSat: { value: 1 }, uWarm: { value: 0 }, uTime: { value: 0 }, uLift: { value: new THREE.Vector3() }, uRes: { value: new THREE.Vector2(w, h) } });
  }
  run(r, p) {
    const P = this.P;
    r.setRenderTarget(this.half);
    Object.assign(this.coc.u, {});
    this.coc.u.tColor.value = this.scene.texture; this.coc.u.tDepth.value = this.scene.depthTexture;
    this.coc.u.texel.value.set(1 / this.w, 1 / this.h);
    this.coc.u.uFocus.value = P.focus; this.coc.u.uAperture.value = P.aperture; this.coc.u.uNear.value = P.near; this.coc.u.uFar.value = P.far;
    this.coc.u.uMaxCoc.value = P.maxCoc; this.coc.u.uTilt.value = P.tilt; this.coc.u.uTiltY.value = P.tiltY;
    r.render(this.coc.s, cam);
    r.setRenderTarget(this.dof);
    this.gather.u.tHalf.value = this.half.texture; this.gather.u.texel.value.set(2 / this.w, 2 / this.h); this.gather.u.uMaxCoc.value = P.maxCoc;
    r.render(this.gather.s, cam);
    // bloom
    r.setRenderTarget(this.q1); this.bright.u.t.value = this.half.texture; this.bright.u.texel.value.set(2 / this.w, 2 / this.h); r.render(this.bright.s, cam);
    const B = (src, dst, dx, dy) => { r.setRenderTarget(dst); this.blur.u.t.value = src.texture; this.blur.u.dir.value.set(dx, dy); r.render(this.blur.s, cam); };
    B(this.q1, this.q2, 4 / this.w, 0); B(this.q2, this.q1, 0, 4 / this.h);
    B(this.q1, this.e1, 8 / this.w, 0); B(this.e1, this.e2, 0, 8 / this.h); B(this.e2, this.e1, 16 / this.w, 0); B(this.e1, this.e2, 0, 16 / this.h);
    r.setRenderTarget(null);
    const cu = this.comp.u;
    cu.tSharp.value = this.scene.texture; cu.tDof.value = this.dof.texture; cu.tB1.value = this.q1.texture; cu.tB2.value = this.e2.texture;
    cu.uExposure.value = P.exposure; cu.uBloom.value = P.bloom; cu.uFade.value = P.fade; cu.uWhite.value = P.white; cu.uVig.value = P.vignette;
    cu.uGrain.value = P.grain; cu.uSat.value = P.sat; cu.uWarm.value = P.warm; cu.uTime.value = p.time; cu.uLift.value.copy(P.lift);
    r.render(this.comp.s, cam);
  }
}
