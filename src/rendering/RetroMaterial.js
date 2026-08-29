import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

// Centraliza a "retro-ificação" de materiais built-in do Three.js através de
// onBeforeCompile (sem monkey-patch global / sem mexer em ShaderChunk).
// Provê:
//   - flatShading (via material.flatShading nativo)
//   - vertex snapping (quantização da posição NDC)
//   - affine texture mapping sutil (warp de UV proporcional à profundidade)
//
// A resolução interna de referência é injetada por uniforms atualizadas pelo
// RetroRenderer a cada frame.

// Chunk funciona tanto para MeshLambert quanto MeshStandard etc. Injetado no
// início do código do vertex shader (após #version e defines do Three r185, que
// vêm no prefixo). Como onBeforeCompile recebe `shader.vertexShader` já com o
// prefixo, somos capazes de inserir código antes do main.
const VERTEX_SNAP_FN = /* glsl */ `
uniform float uRetroSnapStrength;
uniform vec2 uRetroRes;
uniform float uRetroSnapJitter;

vec4 retroSnapPosition(vec4 clipPos) {
    if (uRetroSnapStrength <= 0.001) return clipPos;
    vec3 ndc = clipPos.xyz / clipPos.w;
    float grid = 0.5 * min(uRetroRes.x, uRetroRes.y);
    vec3 snapped = (floor(ndc * grid + uRetroSnapJitter) / grid)
        * uRetroSnapStrength
        + ndc * (1.0 - uRetroSnapStrength);
    return vec4(snapped * clipPos.w, clipPos.w);
}
`;

// Statement inserido dentro do main(): preserva a atribuição padrão
// "gl_Position = projectionMatrix * mvPosition;" e, logo em seguida, aplica o
// vertex snapping sobre o clip position JÁ computado. NÃO substitui/descarta a
// linha original — ler gl_Position antes de atribuí-lo resultaria em posições
// indefinidas (geometria colapsada / tela sem cena).
// Isso preserva todo o pipeline padrão do Three (instancing, batching, etc.),
// que acontece antes de project_vertex.
const SNAP_CALL =
    `gl_Position = projectionMatrix * mvPosition;\n` +
    `gl_Position = retroSnapPosition(gl_Position);`;

const affineKey = '__retroAffine';
const snapKey = '__retroSnap';

// Registro global opcional de handles instalados, para que o RetroRenderer
// possa atualizar uniforms de materiais criados em qualquer arquivo (Level0,
// PickupItem, etc.) sem precisar conhecer cada um.
const retroHandles = new Set();
export function registerRetroHandle(handle) {
    if (handle) retroHandles.add(handle);
}
export function clearRetroHandles() {
    retroHandles.clear();
}
export function getAllRetroHandles() {
    return Array.from(retroHandles);
}

function getAllUniforms(shader) {
    shader.uniforms = shader.uniforms || {};
    return shader.uniforms;
}

function installVertexSnap(shader, handle) {
    const uniforms = getAllUniforms(shader);
    if (!uniforms.uRetroSnapStrength) {
        Object.assign(uniforms, {
            uRetroSnapStrength: handle.snapUniforms.uRetroSnapStrength,
            uRetroRes: handle.snapUniforms.uRetroRes,
            uRetroSnapJitter: handle.snapUniforms.uRetroSnapJitter
        });
    }

    // Declara a função de utilidade no topo (após prefixo).
    let src = shader.vertexShader;
    if (src.indexOf('retroSnapPosition') === -1) {
        src = VERTEX_SNAP_FN + '\n' + src;
    }

    // Se ainda não há o call, injeta ANTES da última linha '}' (final do main),
    // substituindo a atribuição padrão de gl_Position quando possível.
    if (src.indexOf(SNAP_CALL) === -1) {
        // Tenta substituir a atribuição padrão first
        const patt = /gl_Position\s*=\s*projectionMatrix\s*\*\s*mvPosition\s*;/;
        if (patt.test(src)) {
            src = src.replace(patt, SNAP_CALL);
        } else {
            // fallback: injeta antes do último '}' (final do main)
            const idx = src.lastIndexOf('}');
            if (idx !== -1) {
                src =
                    src.slice(0, idx) +
                    SNAP_CALL +
                    '\n}' +
                    src.slice(idx + 1);
            }
        }
    }

    shader.vertexShader = src;
}

function installAffine(shader, handle) {
    const uniforms = getAllUniforms(shader);
    if (!uniforms.uRetroAffineStrength) {
        Object.assign(uniforms, {
            uRetroAffineStrength: handle.affineUniforms.uRetroAffineStrength,
            uRetroAffineW: handle.affineUniforms.uRetroAffineW
        });
    }

    let src = shader.vertexShader;
    if (src.indexOf('retroAffineUV') === -1) {
        // Declara uniformes + função de warp. A função computa sua própria
        // profundidade de view space (modelViewMatrix * position) para não
        // depender da ordem dos chunks (#include) do material built-in — mais
        // robusto para instância e paredes/floors/sólidos.
        const header =
            'uniform float uRetroAffineStrength;\n' +
            'uniform float uRetroAffineW;\n' +
            'vec2 retroAffineUV(vec2 uv) {\n' +
            '  vec4 mv = modelViewMatrix * vec4( position, 1.0 );\n' +
            '  float w = max(1.0, -mv.z);\n' +
            '  return uv * (1.0 + (w - 1.0) * uRetroAffineStrength) * uRetroAffineW;\n' +
            '}\n';
        src = header + src;
    }

    // Aplica o warp onde a UV é atribuída (texturização afim aproximada).
    // Padrões reais do Three r185 (chunks uv_vertex / map_vertex). Substituições
    // guardadas: se o padrão não for encontrado, não faz nada (no-op seguro).
    src = src.replace(
        /vMapUv\s*=\s*\(\s*mapTransform\s*\*\s*vec3\s*\(\s*MAP_UV\s*,\s*1\s*\)\s*\)\s*\.xy\s*;/,
        'vMapUv = retroAffineUV(( mapTransform * vec3( MAP_UV, 1 ) ).xy);'
    );
    src = src.replace(
        /vUv\s*=\s*vec3\s*\(\s*uv\s*,\s*1\s*\)\s*\.xy\s*;/,
        'vUv = retroAffineUV(vec3( uv, 1 ).xy);'
    );

    shader.vertexShader = src;
}

function needsRetro(material) {
    // ShaderMaterial próprio (portal) é tratado pelo seu shader; não forçamos hook.
    return !(material.isShaderMaterial || material.isRawShaderMaterial);
}

export function installRetroVertexHooks(material, { snapping = true, affine = true } = {}) {
    if (!needsRetro(material)) return null;

    const key = material;
    if (key[snapKey] !== undefined && key[affineKey] !== undefined) {
        return { snapUniforms: key[snapKey], affineUniforms: key[affineKey] };
    }

    const snapUniforms = snapping
        ? {
              uRetroSnapStrength: { value: CONFIG.retro.vertexSnapStrength },
              uRetroRes: { value: new THREE.Vector2(1, 1) },
              uRetroSnapJitter: { value: 0 }
          }
        : null;

    const affineUniforms = affine
        ? { uRetroAffineStrength: { value: CONFIG.retro.affineStrength }, uRetroAffineW: { value: 1 } }
        : null;

    const handle = { snapUniforms, affineUniforms };
    registerRetroHandle(handle);
    if (snapping) key[snapKey] = snapUniforms;
    if (affine) key[affineKey] = affineUniforms;

    // Preserve o callback anterior de onBeforeCompile mantendo corretamente o
    // contexto `this` do material (função declarada normal, com .call(this)).
    const previousOnBeforeCompile = material.onBeforeCompile;
    material.onBeforeCompile = function (shader, renderer) {
        if (snapUniforms) {
            installVertexSnap(shader, handle);
        }
        if (affineUniforms) {
            installAffine(shader, handle);
        }
        if (previousOnBeforeCompile) {
            previousOnBeforeCompile.call(this, shader, renderer);
        }
    };

    // O default do Three é `customProgramCacheKey()` que lê `this.onBeforeCompile`.
    // Wrapper normal preserva o contexto ao encadear o callback anterior,
    // evitando "Cannot read properties of undefined (reading 'onBeforeCompile')".
    const previousCacheKey = material.customProgramCacheKey;
    material.customProgramCacheKey = function () {
        const base = previousCacheKey.call(this);
        return `${base}|retro${snapping ? 's' : ''}${affine ? 'a' : ''}`;
    };

    return handle;
}

export function applyFlatShading(material) {
    if (material && 'flatShading' in material) {
        material.flatShading = CONFIG.retro.flatShading;
    }
    return material;
}

// API única: aplica ajustes retro a um material (e opcionalmente a um mesh).
export function configureRetroMaterial(material, mesh, options = {}) {
    const opts = {
        snapping: CONFIG.retro.vertexSnapping,
        affine: CONFIG.retro.affineMapping,
        flat: CONFIG.retro.flatShading,
        ...options
    };
    if (!CONFIG.retro.enabled) {
        return { material, hooks: null };
    }

    if (opts.flat) {
        applyFlatShading(material);
    }

    const hooks = installRetroVertexHooks(material, {
        snapping: opts.snapping && CONFIG.retro.vertexSnapping,
        affine: opts.affine && CONFIG.retro.affineMapping
    });

    return { material, hooks };
}

// Lista de uniforms (com tipo espelhado) para o RetroRenderer atualizar.
// Cada item: { uniform, kind } onde kind é 'res' (Vector2 da resolução) ou
// 'snapJitter' (float que oscila entre frames). Isso evita guess por nome.
export function collectRetroUniforms(handle) {
    const out = [];
    if (handle && handle.snapUniforms) {
        out.push(
            { uniform: handle.snapUniforms.uRetroSnapStrength, kind: 'snapStrength' },
            { uniform: handle.snapUniforms.uRetroRes, kind: 'res' },
            { uniform: handle.snapUniforms.uRetroSnapJitter, kind: 'snapJitter' }
        );
    }
    if (handle && handle.affineUniforms) {
        out.push(
            { uniform: handle.affineUniforms.uRetroAffineStrength, kind: 'affineStrength' },
            { uniform: handle.affineUniforms.uRetroAffineW, kind: 'affineW' }
        );
    }
    return out;
}
