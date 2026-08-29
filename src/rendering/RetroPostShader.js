// Shader fullscreen usado para exibir o RenderTarget de baixa resolução na
// tela. O upscale nearest-neighbor é garantido pelo magFilter NearestFilter do
// RT texture; este fragment shader aplica, em ordem:
//   sampling low-res -> ordered dither (Bayer 4x4) -> color quantization
export const RetroPostVertexShader = `
varying vec2 vUv;
void main() {
    // O triângulo fullscreen NÃO possui atributo uv; derivamos a UV da tela
    // diretamente de position.xy (cobertura do viewport em [-1,1]).
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const RetroPostFragmentShader = `
precision highp float;

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2 uResolution;   // resolução interna do render target
uniform float uDither;
uniform bool uEnableDither;
uniform float uQuantLevels; // 2^bits - 1 por canal
uniform bool uEnableQuant;
uniform float uGamma;       // expoente de gama gentil (uGamma < 1 recupera tons médios)

// Bayer 4x4 fixo (ordenado, espacialmente estável) repetido pela tela.
float bayer4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int idx = y * 4 + x;
    float m = float(idx);
    // 4x4 Bayer threshold matrix (0..15) normalizado
    float t = 0.0;
    if (idx == 0) t = 0.0;
    else if (idx == 1) t = 8.0;
    else if (idx == 2) t = 2.0;
    else if (idx == 3) t = 10.0;
    else if (idx == 4) t = 12.0;
    else if (idx == 5) t = 4.0;
    else if (idx == 6) t = 14.0;
    else if (idx == 7) t = 6.0;
    else if (idx == 8) t = 3.0;
    else if (idx == 9) t = 11.0;
    else if (idx == 10) t = 1.0;
    else if (idx == 11) t = 9.0;
    else if (idx == 12) t = 15.0;
    else if (idx == 13) t = 7.0;
    else if (idx == 14) t = 13.0;
    else if (idx == 15) t = 5.0;
    return t / 15.0;
}

vec3 quantize(vec3 color, float levels) {
    return floor(color * levels) / levels;
}

void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;

    // Gama gentil: recupera tons médios sem lavar a imagem (uGamma < 1 clareia).
    if (uGamma > 0.0 && abs(uGamma - 1.0) > 0.001) {
        color = pow(max(color, vec3(0.0)), vec3(uGamma));
    }

    // Ordered dithering Bayer 4x4, estável espacialmente (usando px da res
    // interna via fragmento). O threshold é deslocado e subtraído para não
    // virar grain aleatório.
    if (uEnableDither) {
        float threshold = bayer4(gl_FragCoord.xy);
        float ditherOffset = (threshold - 0.5) / uQuantLevels * uDither;
        color += ditherOffset;
    }

    if (uEnableQuant) {
        color = quantize(color, uQuantLevels);
    }

    gl_FragColor = vec4(color, 1.0);
}
`;
