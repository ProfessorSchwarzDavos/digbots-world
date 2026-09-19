import * as THREE from "three";
import type { CelestialCatalogSnapshot } from "./celestial-catalog";
import { bodySkyPolicy, type BodyEnvironment } from "./celestial-environment";
import type { CelestialSkySample } from "./celestial-ephemeris";

const vertexShader = `varying vec3 surface; varying vec3 normalWorld;
void main(){ surface=position; normalWorld=normalize(mat3(modelMatrix)*normal);
gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const fragmentShader = `precision highp float;
varying vec3 surface; varying vec3 normalWorld;
uniform vec3 color; uniform vec3 accent; uniform vec3 starDirection;
uniform vec3 starLocalDirection;
uniform float opacity; uniform float banded; uniform float shadow; uniform float rings;
void main(){
  float band=sin(surface.y*28.0+sin(surface.x*7.0)*0.9)*0.5+0.5;
  float continents=sin(surface.x*12.0+sin(surface.z*7.0))*sin(surface.y*9.0+surface.z*4.0);
  vec3 albedo=mix(color,accent,mix(smoothstep(0.15,0.55,continents)*0.6,band*0.55,banded));
  float light=max(0.0,dot(normalize(normalWorld),normalize(starDirection)));
  // Ring-plane shadow on the body. The authored ring normal is local +Y.
  float t=-surface.y/(abs(starLocalDirection.y)<0.0001?0.0001:starLocalDirection.y);
  vec3 hit=surface+starLocalDirection*t;
  float ringShadow=rings*step(0.0,t)*step(1.3,length(hit.xz))*step(length(hit.xz),2.2);
  light*=1.0-ringShadow*0.55;
  gl_FragColor=vec4(albedo*(0.035+light*(1.0-shadow)*0.965),opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const ringFragment = `precision highp float; varying vec3 surface;
uniform vec3 color; uniform vec3 starDirection; uniform float opacity;
void main(){ float r=length(surface.xz); vec3 ray=normalize(starDirection);
  float closest=max(0.0,-dot(surface,ray)); float shadow=step(length(surface+ray*closest),1.0)*step(0.001,closest);
  float bands=0.65+0.25*sin(r*95.0); float gap=1.0-smoothstep(1.72,1.75,r)*(1.0-smoothstep(1.79,1.81,r));
  gl_FragColor=vec4(color*(0.35+0.65*abs(ray.y))*(1.0-shadow*0.88),opacity*bands*gap);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Camera-centred, depth-tested sky geometry: world blocks still occlude it. */
export class CelestialSkyRenderer {
  readonly group = new THREE.Group();
  private bodies = new Map<string, THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>>();
  private rings = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>();
  private aurora: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private identity: CelestialCatalogSnapshot | null = null;
  private starDirection = new THREE.Vector3();
  private axis = new THREE.Vector3();
  private localStar = new THREE.Vector3();
  private inverseRotation = new THREE.Quaternion();
  private spin = new THREE.Quaternion();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(scene: THREE.Scene) {
    this.group.name = "celestial-frontiers-sky";
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide,
      uniforms: { time: { value: 0 }, opacity: { value: 0 }, color: { value: new THREE.Color("#6bd2b0") } },
      vertexShader: `varying vec3 p; void main(){p=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec3 p; uniform float time; uniform float opacity; uniform vec3 color;
      void main(){ float arc=0.42+0.10*sin(atan(p.z,p.x)*3.0+time*0.008);
      float ribbon=exp(-pow((p.y-arc)*18.0,2.0)); float curtain=0.45+0.55*pow(sin(atan(p.z,p.x)*25.0+time*0.015)*0.5+0.5,3.0);
      gl_FragColor=vec4(mix(color,vec3(0.42,0.25,0.65),smoothstep(arc,arc+0.1,p.y)),ribbon*curtain*opacity); }`,
    });
    this.aurora = new THREE.Mesh(new THREE.SphereGeometry(77, 48, 24), material);
    this.aurora.name = "authored-aurora"; this.group.add(this.aurora); scene.add(this.group);
  }

  get visibleBodyIds(): readonly string[] { return [...this.bodies.entries()].filter(([, mesh]) => mesh.visible).map(([id]) => id); }

  private sync(catalog: CelestialCatalogSnapshot) {
    if (this.identity === catalog) return;
    for (const mesh of [...this.bodies.values(), ...this.rings.values()]) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }
    this.bodies.clear(); this.rings.clear(); this.identity = catalog;
    for (const body of catalog.bodies) {
      if (body.kind === "star") continue;
      const policy = bodySkyPolicy(body);
      const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, transparent: true, depthWrite: true,
        uniforms: { color: { value: new THREE.Color(policy.body) }, accent: { value: new THREE.Color(policy.accent) },
          starDirection: { value: new THREE.Vector3() }, starLocalDirection: { value: new THREE.Vector3() }, opacity: { value: 1 }, banded: { value: Number(policy.bands) },
          shadow: { value: 0 }, rings: { value: Number(policy.rings) } } });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
      mesh.name = `celestial-${body.id}`; mesh.visible = false; this.bodies.set(body.id, mesh); this.group.add(mesh);
      if (policy.rings) {
        const geometry = new THREE.RingGeometry(1.3, 2.2, 96); geometry.rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ vertexShader, fragmentShader: ringFragment,
          transparent: true, depthWrite: false, side: THREE.DoubleSide,
          uniforms: { color: { value: new THREE.Color(policy.accent) }, starDirection: { value: new THREE.Vector3() }, opacity: { value: 1 } } }));
        ring.name = `celestial-rings-${body.id}`; ring.visible = false; this.rings.set(body.id, ring); this.group.add(ring);
      }
    }
  }

  update(catalog: CelestialCatalogSnapshot, sample: CelestialSkySample, environment: BodyEnvironment,
    camera: THREE.Vector3, visibility: number, daylight: number, home: boolean,
    rayVisible: (direction: THREE.Vector3) => boolean) {
    this.sync(catalog); this.group.position.copy(camera);
    for (const mesh of this.bodies.values()) mesh.visible = false;
    for (const mesh of this.rings.values()) mesh.visible = false;
    for (const body of sample.bodies) {
      // Ordinary Home keeps its familiar Moon and stars. Other planets become
      // an observatory unlock in CF3; off-world skies already show the system.
      if (home && body.id !== "blockwild/morrow") continue;
      const mesh = this.bodies.get(body.id); if (!mesh) continue;
      const direction = this.starDirection.fromArray(body.direction);
      const visible = visibility > .01 && (environment.pressureKPa === 0 || direction.y > -.12) && rayVisible(direction);
      mesh.visible = visible; if (!visible) continue;
      mesh.position.copy(direction).multiplyScalar(80);
      mesh.scale.setScalar(Math.tan(Math.min(.65, body.displayRadius)) * 80);
      mesh.quaternion.setFromUnitVectors(this.up, this.axis.fromArray(body.axisDirection));
      mesh.quaternion.multiply(this.spin.setFromAxisAngle(this.up, body.rotationRadians));
      this.localStar.fromArray(body.starDirection).applyQuaternion(this.inverseRotation.copy(mesh.quaternion).invert());
      mesh.material.uniforms.starDirection.value.fromArray(body.starDirection);
      mesh.material.uniforms.starLocalDirection.value.copy(this.localStar);
      mesh.material.uniforms.opacity.value = visibility * (body.parent || environment.pressureKPa === 0 ? 1 : 1 - daylight * .45);
      mesh.material.uniforms.shadow.value = body.shadow;
      const ring = this.rings.get(body.id);
      if (ring) { ring.visible = true; ring.position.copy(mesh.position); ring.scale.copy(mesh.scale); ring.quaternion.copy(mesh.quaternion);
        ring.material.uniforms.starDirection.value.copy(this.localStar); ring.material.uniforms.opacity.value = visibility * .8; }
    }
    this.aurora.material.uniforms.time.value = sample.universeSeconds;
    this.aurora.material.uniforms.opacity.value = home ? 0 : environment.sky.aurora * visibility * (1 - daylight * .85) * .65;
    this.aurora.material.uniforms.color.value.set(environment.sky.accent);
    this.aurora.visible = this.aurora.material.uniforms.opacity.value > .01;
  }

  dispose() {
    this.group.removeFromParent();
    for (const mesh of [...this.bodies.values(), ...this.rings.values(), this.aurora]) { mesh.geometry.dispose(); mesh.material.dispose(); }
    this.bodies.clear(); this.rings.clear();
  }
}
