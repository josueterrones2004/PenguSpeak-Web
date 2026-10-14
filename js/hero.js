
(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const canvas = $('particles');
  const track = $('track');
  const scene = $('scene');
  const brand = $('brand');
  const landscape = $('landscape');
  const aurora = $('aurora');
  const hint = $('hint');
  const rest = $('rest');

  if (!canvas || !track || !scene) {
    console.error('PenguSpeak: faltan elementos del hero.');
    return;
  }

  const reduced = matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const mobile = matchMedia(
    '(max-width: 700px)'
  ).matches;

  const clamp = (v, a = 0, b = 1) =>
    Math.min(b, Math.max(a, v));

  const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  const mix = (a, b, t) => a + (b - a) * t;

  const rand = (n, s = 0) => {
    const v = Math.sin(
      n * 127.1 + s * 311.7
    ) * 43758.5453;

    return v - Math.floor(v);
  };

  const colors = [
    '#00ffe0',
    '#03baff',
    '#aa5bff',
    '#ff3ecb',
    '#ffc247',
    '#f3e9ff',
    '#45faff'
  ];

  const symbols = [
    '+', '*', '·', ':', '@',
    '#', '%', '/', '=', 'x', '◇'
  ];

  const iceWhite = [245, 249, 255];

  function rgbFromHex(hex) {
    return [1, 3, 5].map(i =>
      parseInt(hex.slice(i, i + 2), 16)
    );
  }

  function blendRgb(a, b, t) {
    const v = clamp(t);

    return `rgb(${
      Math.round(mix(a[0], b[0], v))
    } ${
      Math.round(mix(a[1], b[1], v))
    } ${
      Math.round(mix(a[2], b[2], v))
    })`;
  }

  // ============================================================
  // WEBGL2
  // ============================================================

  function createGpuRenderer(targetCanvas) {
    const gl = targetCanvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });

    if (!gl) return null;

    const vertexSource = `#version 300 es
    precision highp float;

    uniform vec2 uSize;
    uniform float uProgress;
    uniform float uIntro;
    uniform float uTime;
    uniform float uFont;

    in vec4 aStart;
    in vec4 aMiddle;
    in vec4 aExtra;
    in vec4 aStyle;

    out vec2 vUv;
    out vec4 vInfo;

    float ease(float a, float b, float x) {
      float t = clamp(
        (x - a) / (b - a),
        0.0,
        1.0
      );

      return t * t * (3.0 - 2.0 * t);
    }

    void main() {
      vec2 corners[6] = vec2[6](
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(0.0, 1.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0)
      );

      vec2 corner = corners[gl_VertexID];

      float glyph = aStyle.x;

      vec2 cell = vec2(
        mod(glyph, 16.0),
        floor(glyph / 16.0)
      );

      vUv = vec2(
        (cell.x + corner.x) / 16.0,
        1.0 - (cell.y + corner.y) / 8.0
      );

      float alpha = 1.0;
      float size = 10.0;
      float tint = 0.0;

      vec2 pos;

      if (aStyle.z > 0.5) {
        pos = aStart.xy + vec2(
          sin(uTime * 0.19 + aExtra.x),
          cos(uTime * 0.16 + aExtra.x)
        ) * 3.0;

        size = aExtra.y;

        float dx = (
          aStart.x - uSize.x * 0.5
        ) / min(uSize.x * 0.30, 430.0);

        float dy = (
          aStart.y - uSize.y * 0.29
        ) / (uSize.y * 0.29);

        float clear = ease(
          0.45,
          1.2,
          length(vec2(dx, dy))
        );

        float rebuild = ease(
          0.41,
          0.82,
          uProgress
        );

        alpha = aStyle.w
          * (1.0 - rebuild
          * (1.0 - clear) * 0.84)
          * (0.86 + 0.14
          * sin(uTime * 0.8 + aExtra.x));

        tint = 1.0;
      } else {
        float a = ease(
          0.06 + aExtra.z,
          0.44 + aExtra.z,
          uProgress
        );

        float b = ease(
          0.41 + aExtra.z,
          0.82 + aExtra.z,
          uProgress
        );

        float zoom = 1.0
          + sin(3.14159265 * a)
          * (0.55 + aExtra.y * 0.8);

        vec2 mid = uSize * 0.5
          + (aMiddle.xy - uSize * 0.5)
          * zoom;

        vec2 xy = mix(
          mix(aStart.xy, mid, a),
          aMiddle.zw,
          b
        );

        float motion = (1.0 - b)
          * sin(3.14159265 * a);

        pos = mix(
          aStart.zw,
          xy,
          uIntro
        ) + vec2(
          sin(uTime * 0.4 + aExtra.x),
          cos(uTime * 0.35 + aExtra.x)
        ) * 4.0 * motion;

        size = mix(
          (7.0 + aExtra.y * 2.3) * zoom,
          uFont,
          b
        ) * mix(1.65, 1.0, uIntro);

        alpha = mix(
          0.12,
          1.0,
          uIntro
        ) * mix(0.8, 1.0, b);

        tint = ease(0.035, 0.46, a)
          * (1.0 - ease(0.05, 0.98, b));
      }

      float scale = size / 48.0;

      vec2 vertex = pos
        + corner * (64.0 * scale)
        - vec2(4.0 * scale);

      gl_Position = vec4(
        vertex / uSize * vec2(2.0, -2.0)
          + vec2(-1.0, 1.0),
        0.0,
        1.0
      );

      vInfo = vec4(
        aStyle.y,
        tint,
        alpha,
        aExtra.w
      );
    }`;

    const fragmentSource = `#version 300 es
    precision highp float;

    uniform sampler2D uAtlas;
    uniform vec3 uColors[7];

    in vec2 vUv;
    in vec4 vInfo;

    out vec4 outColor;

    void main() {
      float mask = texture(
        uAtlas,
        vUv
      ).a;

      vec3 white = vec3(
        245.0,
        249.0,
        255.0
      ) / 255.0 * vInfo.w;

      vec3 rgb = mix(
        white,
        uColors[int(vInfo.x)],
        vInfo.y
      );

      outColor = vec4(
        rgb,
        mask * vInfo.z
      );
    }`;

    function compile(type, source) {
      const shader = gl.createShader(type);

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(
        shader,
        gl.COMPILE_STATUS
      )) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
      }

      return shader;
    }

    let program;

    try {
      const vertex = compile(
        gl.VERTEX_SHADER,
        vertexSource
      );

      const fragment = compile(
        gl.FRAGMENT_SHADER,
        fragmentSource
      );

      program = gl.createProgram();

      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);

      gl.linkProgram(program);

      gl.deleteShader(vertex);
      gl.deleteShader(fragment);

      if (!gl.getProgramParameter(
        program,
        gl.LINK_STATUS
      )) {
        throw new Error(
          gl.getProgramInfoLog(program)
        );
      }
    } catch (error) {
      console.error(
        'PenguSpeak: error al iniciar WebGL2',
        error
      );

      return null;
    }

    gl.useProgram(program);

    const uniforms = {};

    for (const name of [
      'uSize',
      'uProgress',
      'uIntro',
      'uTime',
      'uFont',
      'uColors',
      'uAtlas'
    ]) {
      uniforms[name] = gl.getUniformLocation(
        program,
        name === 'uColors'
          ? 'uColors[0]'
          : name
      );
    }

    const colorData = new Float32Array(
      colors.flatMap(hex =>
        rgbFromHex(hex).map(v => v / 255)
      )
    );

    gl.uniform3fv(
      uniforms.uColors,
      colorData
    );

    gl.uniform1i(uniforms.uAtlas, 0);

    const vao = gl.createVertexArray();

    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();

    gl.bindBuffer(
      gl.ARRAY_BUFFER,
      buffer
    );

    const stride = 16 * 4;

    for (const [name, offset] of [
      ['aStart', 0],
      ['aMiddle', 4],
      ['aExtra', 8],
      ['aStyle', 12]
    ]) {
      const location = gl.getAttribLocation(
        program,
        name
      );

      if (location < 0) continue;

      gl.enableVertexAttribArray(location);

      gl.vertexAttribPointer(
        location,
        4,
        gl.FLOAT,
        false,
        stride,
        offset * 4
      );

      gl.vertexAttribDivisor(
        location,
        1
      );
    }

    const texture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(
      gl.TEXTURE_2D,
      texture
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      gl.LINEAR
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      gl.CLAMP_TO_EDGE
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      gl.CLAMP_TO_EDGE
    );

    gl.enable(gl.BLEND);

    gl.blendFunc(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA
    );

    let total = 0;
    let active = true;

    function uploadAtlas(glyphs) {
      const atlas = document.createElement(
        'canvas'
      );

      atlas.width = 16 * 64;
      atlas.height = 8 * 64;

      const context = atlas.getContext('2d');

      context.clearRect(
        0,
        0,
        atlas.width,
        atlas.height
      );

      context.font = '48px monospace';
      context.textBaseline = 'top';
      context.fillStyle = '#ffffff';

      glyphs.forEach((glyph, i) => {
        context.fillText(
          glyph,
          (i % 16) * 64 + 4,
          Math.floor(i / 16) * 64 + 4
        );
      });

      gl.activeTexture(gl.TEXTURE0);

      gl.bindTexture(
        gl.TEXTURE_2D,
        texture
      );

      gl.pixelStorei(
        gl.UNPACK_FLIP_Y_WEBGL,
        true
      );

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        atlas
      );
    }

    return {
      get active() {
        return active;
      },

      suspend() {
        active = false;
      },

      resize(width, height) {
        if (!active) return;

        gl.viewport(
          0,
          0,
          width,
          height
        );
      },

      build(
        particles,
        ambient,
        fontSize
      ) {
        if (!active) return;

        const glyphs = [
          ...new Set([
            ...particles.map(p => p.glyph),
            ...ambient.map(p => p.glyph)
          ])
        ];

        if (glyphs.length > 128) {
          console.error(
            'PenguSpeak: demasiados caracteres ASCII'
          );
          return;
        }

        const glyphMap = new Map(
          glyphs.map((glyph, i) => [
            glyph,
            i
          ])
        );

        uploadAtlas(glyphs);

        const data = new Float32Array(
          (particles.length + ambient.length) * 16
        );

        let offset = 0;

        for (const p of particles) {
          data.set([
            p.ix,
            p.iy,
            p.sx,
            p.sy,

            p.mx,
            p.my,
            p.fx,
            p.fy,

            p.phase,
            p.depth,
            p.delay,
            p.iceBrightness,

            glyphMap.get(p.glyph),
            colors.indexOf(p.color),
            0,
            1
          ], offset);

          offset += 16;
        }

        for (const p of ambient) {
          data.set([
            p.x,
            p.y,
            0,
            0,

            0,
            0,
            0,
            0,

            p.phase,
            p.size,
            0,
            1,

            glyphMap.get(p.glyph),
            colors.indexOf(p.color),
            1,
            p.alpha
          ], offset);

          offset += 16;
        }

        total = offset / 16;

        gl.bindBuffer(
          gl.ARRAY_BUFFER,
          buffer
        );

        gl.bufferData(
          gl.ARRAY_BUFFER,
          data,
          gl.STATIC_DRAW
        );

        gl.useProgram(program);

        gl.uniform1f(
          uniforms.uFont,
          fontSize
        );
      },

      draw(
        progress,
        intro,
        time,
        width,
        height
      ) {
        if (!active) return;

        gl.useProgram(program);
        gl.bindVertexArray(vao);

        gl.uniform2f(
          uniforms.uSize,
          width,
          height
        );

        gl.uniform1f(
          uniforms.uProgress,
          progress
        );

        gl.uniform1f(
          uniforms.uIntro,
          intro
        );

        gl.uniform1f(
          uniforms.uTime,
          time
        );

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.drawArraysInstanced(
          gl.TRIANGLES,
          0,
          6,
          total
        );
      }
    };
  }

  // ============================================================
  // ESTADO
  // ============================================================

  let W = 0;
  let H = 0;
  let dpr = 1;

  let raw = '';
  let particles = [];
  let ambient = [];

  let fontSize = 5;

  let progress = 0;
  let target = 0;

  let last = 0;
  let lastFrame = 0;

  let introStart = 0;
  let intro = 0;

  let ready = false;
  let introFinished = false;
  let heroVisible = true;

  let raf = 0;
  let initialized = false;

  // El renderizador de escritorio permanece en Canvas 2D.
  // WebGL2 se utiliza en móviles compatibles.
  let gpu = mobile
    ? createGpuRenderer(canvas)
    : null;

  const ctx = gpu
    ? null
    : canvas.getContext('2d');

  const measureCtx = document
    .createElement('canvas')
    .getContext('2d');

  const frameInterval = gpu && !reduced
    ? 0
    : 1000 / (
      reduced
        ? 24
        : mobile
          ? 24
          : 48
    );

  // ============================================================
  // ANIMACIÓN
  // ============================================================

  function scheduleFrame() {
    if (
      !ready ||
      !heroVisible ||
      document.hidden ||
      raf
    ) {
      return;
    }

    raf = requestAnimationFrame(draw);
  }

  function range() {
    return Math.max(
      1,
      track.offsetHeight - scene.clientHeight
    );
  }

  function updateTarget() {
    target = clamp(
      -track.getBoundingClientRect().top
      / range()
    );
  }

  function layout(force = false) {
    const nextW = Math.round(
      scene.clientWidth
    );

    const nextH = Math.round(
      scene.clientHeight
    );

    if (!nextW || !nextH) return;

    // Chrome Android cambia la altura del viewport
    // cuando aparecen o desaparecen sus barras.
    // No reconstruimos el ASCII por ese motivo.
    if (
      !force &&
      W === nextW &&
      H !== 0
    ) {
      updateTarget();
      return;
    }

    if (
      !force &&
      W === nextW &&
      H === nextH
    ) {
      updateTarget();
      return;
    }

    W = nextW;
    H = nextH;

    dpr = Math.min(
      devicePixelRatio || 1,
      gpu
        ? 2.5
        : mobile
          ? 1.25
          : 1.75
    );

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    canvas.style.width = '100%';
    canvas.style.height = '100%';

    if (gpu) {
      gpu.resize(
        canvas.width,
        canvas.height
      );
    } else if (ctx) {
      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );
    }

    if (raw) build();

    updateTarget();
    scheduleFrame();
  }

  function build() {
    const lines = raw
      .replace(/\r/g, '')
      .replace(/\n+$/, '')
      .split('\n');

    const cols = Math.max(
      ...lines.map(line => line.length)
    );

    if (!cols) {
      throw new Error(
        'PenguSpeak: el archivo ASCII está vacío.'
      );
    }

    const isMobile = W < 700;

    fontSize = Math.max(
      0.7,
      Math.min(
        10,
        Math.min(
          W * (isMobile ? 0.84 : 0.54),
          isMobile ? 370 : 560
        ) / (cols * 0.603),
        H * (isMobile ? 0.27 : 0.36)
          / (lines.length * 1.08)
      )
    );

    measureCtx.font =
      `${fontSize}px monospace`;

    const cw = measureCtx.measureText('M').width;
    const lh = fontSize * 1.08;

    const left = W / 2
      - cols * cw / 2;

    const top = H * 0.29
      - lines.length * lh / 2;

    const cells = [];

    for (let y = 0; y < lines.length; y++) {
      for (let x = 0; x < lines[y].length; x++) {
        const glyph = lines[y][x];

        if (
          glyph !== ' ' &&
          glyph !== '\t'
        ) {
          cells.push({
            glyph,
            x,
            y
          });
        }
      }
    }

    // WebGL mantiene todas las partículas.
    const maxGlyphs = gpu
      ? Infinity
      : mobile
        ? 1900
        : 8500;

    if (cells.length > maxGlyphs) {
      const stride = Math.ceil(
        cells.length / maxGlyphs
      );

      const selected = cells.filter(
        (_, i) => i % stride === 0
      );

      cells.length = 0;
      cells.push(...selected);
    }

    const N = cells.length;

    const cx = W / 2;
    const cy = H * (
      isMobile ? 0.485 : 0.49
    );

    const R = Math.min(
      W * (isMobile ? 0.475 : 0.33),
      H * (isMobile ? 0.32 : 0.37),
      isMobile ? 270 : 355
    );

    const segments = [];

    function line(
      x1,
      y1,
      x2,
      y2,
      weight = 1
    ) {
      segments.push({
        x1,
        y1,
        x2,
        y2,
        w: weight,
        len: Math.hypot(
          x2 - x1,
          y2 - y1
        )
      });
    }

    for (let arm = 0; arm < 6; arm++) {
      const angle =
        arm * Math.PI / 3
        - Math.PI / 2;

      const ux = Math.cos(angle);
      const uy = Math.sin(angle);

      const pt = (r, side = 0) => [
        cx + ux * r - uy * side,
        cy + uy * r + ux * side
      ];

      line(
        ...pt(0),
        ...pt(R),
        2.6
      );

      for (let j = 1; j <= 5; j++) {
        const r = R * (
          0.18 + j * 0.135
        );

        const branch = R * (
          0.15 + j * 0.007
        );

        for (const side of [-1, 1]) {
          line(
            ...pt(r),
            ...pt(
              r + branch * 0.65,
              side * branch * 0.83
            ),
            1.7
          );

          if (j > 1) {
            line(
              ...pt(
                r + branch * 0.28,
                side * branch * 0.35
              ),
              ...pt(
                r + branch * 0.53,
                side * branch * 0.72
              ),
              0.85
            );
          }
        }
      }

      for (const r of [
        R * 0.19,
        R * 0.36
      ]) {
        const a1 = angle - Math.PI / 6;
        const a2 = angle + Math.PI / 6;

        line(
          cx + Math.cos(a1) * r,
          cy + Math.sin(a1) * r,
          cx + Math.cos(a2) * r,
          cy + Math.sin(a2) * r,
          0.8
        );
      }
    }

    const total = segments.reduce(
      (sum, s) => sum + s.len * s.w,
      0
    );

    let cumulative = 0;

    for (const seg of segments) {
      seg.start = cumulative;

      seg.share =
        seg.len * seg.w / total;

      cumulative += seg.share;
    }

    particles = [];

    for (let i = 0; i < N; i++) {
      const cell = cells[i];
      const u = (i + 0.5) / N;

      let seg = segments[
        segments.length - 1
      ];

      for (const candidate of segments) {
        if (
          u >= candidate.start &&
          u < candidate.start + candidate.share
        ) {
          seg = candidate;
          break;
        }
      }

      const t = rand(i, 1);

      const angle = Math.atan2(
        seg.y2 - seg.y1,
        seg.x2 - seg.x1
      );

      const jitter =
        (rand(i, 2) - 0.5)
        * (isMobile ? 6 : 9);

      const ix =
        mix(seg.x1, seg.x2, t)
        - Math.sin(angle) * jitter;

      const iy =
        mix(seg.y1, seg.y2, t)
        + Math.cos(angle) * jitter;

      const scatterAngle =
        i * 2.399963229728653
        + rand(i, 3) * 0.48;

      const radius = Math.sqrt(
        (i + 0.5) / N
      );

      const mx =
        W * 0.5
        + Math.cos(scatterAngle)
        * radius * W * 0.73;

      const my =
        H * 0.49
        + Math.sin(scatterAngle)
        * radius * H * 0.69;

      particles.push({
        glyph: cell.glyph,

        ix,
        iy,

        sx: cx
          + (rand(i, 31) - 0.5)
          * W * 1.65,

        sy: cy
          + (rand(i, 32) - 0.5)
          * H * 1.5,

        mx,
        my,

        fx: left + cell.x * cw,
        fy: top + cell.y * lh,

        phase: rand(i, 5) * 6.283,

        depth:
          0.65 + rand(i, 6) * 1.4,

        color: colors[
          Math.floor(
            rand(i, 7) * colors.length
          )
        ],

        iceBrightness:
          0.84 + rand(i, 11) * 0.16,

        delay: rand(i, 8) * 0.04
      });
    }

    ambient = [];

    const count = gpu
      ? 1100
      : mobile
        ? 160
        : 1100;

    for (let i = 0; i < count; i++) {
      ambient.push({
        x: rand(i, 20) * W,
        y: rand(i, 21) * H,

        glyph: symbols[
          Math.floor(
            rand(i, 22) * symbols.length
          )
        ],

        size: 4 + rand(i, 23) * 6,

        alpha:
          0.28 + rand(i, 24) * 0.52,

        phase:
          rand(i, 25) * 6.283,

        color: colors[
          Math.floor(
            rand(i, 26) * colors.length
          )
        ]
      });
    }

    if (gpu) {
      gpu.build(
        particles,
        ambient,
        fontSize
      );
    }
  }

  // ============================================================
  // CANVAS 2D - ESCRITORIO
  // ============================================================

  function drawCanvas2D(p, time) {
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'top';

    const rebuild = smooth(
      0.41,
      0.82,
      p
    );

    const exclusionX = Math.min(
      W * 0.30,
      430
    );

    const exclusionY = H * 0.29;
    const logoY = H * 0.29;

    for (const star of ambient) {
      const dx =
        (star.x - W / 2) / exclusionX;

      const dy =
        (star.y - logoY) / exclusionY;

      const clear = smooth(
        0.45,
        1.2,
        Math.hypot(dx, dy)
      );

      const dim =
        1 - rebuild
        * (1 - clear) * 0.84;

      const driftX = Math.sin(
        time * 0.19 + star.phase
      ) * 3;

      const driftY = Math.cos(
        time * 0.16 + star.phase
      ) * 3;

      ctx.globalAlpha =
        star.alpha
        * dim
        * (
          0.86
          + 0.14 * Math.sin(
            time * 0.8 + star.phase
          )
        );

      ctx.fillStyle = star.color;

      ctx.font =
        `${star.size}px monospace`;

      ctx.fillText(
        star.glyph,
        star.x + driftX,
        star.y + driftY
      );
    }

    for (const c of particles) {
      const a = smooth(
        0.06 + c.delay,
        0.44 + c.delay,
        p
      );

      const b = smooth(
        0.41 + c.delay,
        0.82 + c.delay,
        p
      );

      const zoom =
        1 + Math.sin(Math.PI * a)
        * (0.55 + c.depth * 0.8);

      const middleX =
        W / 2
        + (c.mx - W / 2) * zoom;

      const middleY =
        H / 2
        + (c.my - H / 2) * zoom;

      const x = mix(
        mix(c.ix, middleX, a),
        c.fx,
        b
      );

      const y = mix(
        mix(c.iy, middleY, a),
        c.fy,
        b
      );

      const motion =
        (1 - b) * Math.sin(Math.PI * a);

      const px =
        mix(c.sx, x, intro)
        + Math.sin(
          time * 0.4 + c.phase
        ) * 4 * motion;

      const py =
        mix(c.sy, y, intro)
        + Math.cos(
          time * 0.35 + c.phase
        ) * 4 * motion;

      const size = mix(
        (7 + c.depth * 2.3) * zoom,
        fontSize,
        b
      ) * mix(1.65, 1, intro);

      ctx.globalAlpha =
        mix(0.12, 1, intro)
        * mix(0.8, 1, b);

      const colored =
        smooth(0.035, 0.46, a)
        * (
          1 - smooth(0.05, 0.98, b)
        );

      const white = iceWhite.map(
        v => Math.round(
          v * c.iceBrightness
        )
      );

      ctx.fillStyle = blendRgb(
        white,
        rgbFromHex(c.color),
        colored
      );

      ctx.font =
        `${size}px monospace`;

      ctx.fillText(
        c.glyph,
        px,
        py
      );
    }

    ctx.globalAlpha = 1;
  }

  // ============================================================
  // ELEMENTOS VISUALES
  // ============================================================

  function updateOverlays(p) {
    const reveal = smooth(
      0.68,
      0.91,
      p
    );

    if (landscape) {
      landscape.style.opacity =
        reveal.toFixed(3);
    }

    if (aurora) {
      aurora.style.opacity =
        (0.08 + 0.92 * reveal).toFixed(3);
    }

    if (brand) {
      brand.style.opacity =
        reveal.toFixed(3);

      brand.style.transform =
        `translate(-50%,${(1 - reveal) * 20}px)`;

      brand.style.pointerEvents =
        reveal > 0.95
          ? 'auto'
          : 'none';
    }

    if (hint) {
      hint.textContent = !introFinished
        ? ''
        : p < 0.42
          ? 'DESLIZA PARA DERRETIR EL HIELO ↓'
          : 'DESCUBRE PENGUSPEAK ↓';

      hint.style.opacity = (
        1 - smooth(0.83, 0.98, p)
      ).toFixed(3);
    }
  }

  // ============================================================
  // BUCLE PRINCIPAL
  // ============================================================

  function draw(now) {
    raf = 0;

    if (
      !ready ||
      !heroVisible ||
      document.hidden
    ) {
      return;
    }

    // En WebGL no descartamos frames.
    // requestAnimationFrame se sincroniza
    // con la frecuencia de la pantalla.
    if (
      frameInterval > 0 &&
      now - lastFrame < frameInterval
    ) {
      scheduleFrame();
      return;
    }

    lastFrame = now;

    const dt = last
      ? Math.min(
        (now - last) / 1000,
        0.05
      )
      : 0.016;

    last = now;

    const smoothing = reduced
      ? 1
      : 1 - Math.exp(-13 * dt);

    progress += (
      target - progress
    ) * smoothing;

    const p = progress;

    const time = reduced
      ? 0
      : now * 0.001;

    intro = reduced
      ? 1
      : smooth(
        0,
        1550,
        now - introStart
      );

    if (
      intro >= 1 &&
      !introFinished
    ) {
      unlockIntro();
    }

    if (gpu && gpu.active) {
      gpu.draw(
        p,
        intro,
        time,
        W,
        H
      );
    } else {
      drawCanvas2D(p, time);
    }

    updateOverlays(p);
    scheduleFrame();
  }

  // ============================================================
  // INTRO
  // ============================================================

  const scrollKeys = new Set([
    'ArrowUp',
    'ArrowDown',
    'PageUp',
    'PageDown',
    'Home',
    'End',
    ' '
  ]);

  function preventIntroScroll(event) {
    if (
      !introFinished &&
      event.cancelable
    ) {
      event.preventDefault();
    }
  }

  function preventIntroKeys(event) {
    if (
      !introFinished &&
      scrollKeys.has(event.key) &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
    }
  }

  function lockIntro() {
    // Nunca bloqueamos el scroll de Android.
    if (mobile) {
      introFinished = true;
      return;
    }

    window.addEventListener(
      'wheel',
      preventIntroScroll,
      { passive: false }
    );

    window.addEventListener(
      'touchmove',
      preventIntroScroll,
      { passive: false }
    );

    window.addEventListener(
      'keydown',
      preventIntroKeys,
      { passive: false }
    );
  }

  function unlockIntro() {
    if (introFinished) return;

    introFinished = true;

    window.removeEventListener(
      'wheel',
      preventIntroScroll
    );

    window.removeEventListener(
      'touchmove',
      preventIntroScroll
    );

    window.removeEventListener(
      'keydown',
      preventIntroKeys
    );

    if (hint) {
      hint.textContent =
        'DESLIZA PARA DERRETIR EL HIELO ↓';
    }
  }

  // ============================================================
  // WEBGL: PÉRDIDA Y RESTAURACIÓN DEL CONTEXTO
  // ============================================================

  canvas.addEventListener(
    'webglcontextlost',
    event => {
      event.preventDefault();

      if (gpu) {
        gpu.suspend();
      }

      cancelAnimationFrame(raf);
      raf = 0;
    }
  );

  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      if (!mobile) return;

      try {
        gpu = createGpuRenderer(canvas);

        if (!gpu) {
          console.error(
            'PenguSpeak: no se pudo restaurar WebGL2.'
          );
          return;
        }

        gpu.resize(
          canvas.width,
          canvas.height
        );

        if (raw && particles.length) {
          gpu.build(
            particles,
            ambient,
            fontSize
          );
        }

        last = 0;
        lastFrame = 0;

        heroVisible = true;
        scheduleFrame();
      } catch (error) {
        console.error(
          'PenguSpeak: fallo al restaurar WebGL2',
          error
        );
      }
    }
  );

  // ============================================================
  // VISIBILIDAD
  // ============================================================

  if (rest) {
    const restObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            rest.classList.add('visible');
          }
        }
      },
      { threshold: 0.08 }
    );

    restObserver.observe(rest);
  }

  const heroObserver = new IntersectionObserver(
    entries => {
      const visible =
        entries[0]?.isIntersecting ?? true;

      heroVisible = visible;

      scene.classList.toggle(
        'is-active',
        visible
      );

      if (visible) {
        last = 0;
        lastFrame = 0;
        scheduleFrame();
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    {
      threshold: 0,
      rootMargin: '100px 0px 100px 0px'
    }
  );

  heroObserver.observe(track);

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else {
        last = 0;
        lastFrame = 0;

        updateTarget();
        scheduleFrame();
      }
    }
  );

  // ============================================================
  // SCROLL Y RESIZE
  // ============================================================

  window.addEventListener(
    'scroll',
    updateTarget,
    { passive: true }
  );

  let resizeTimer = 0;
  
  window.addEventListener(
    'resize',
    () => {
      const nextW = Math.round(scene.clientWidth);
      // The mobile browser toolbar changes only visible height.
      // Keep the existing WebGL buffer and particle positions stable.
      if (nextW === W) {
        updateTarget();
        return;
      }
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => layout(true), 100);
    },
    { passive: true }
  );

  // Al volver desde la caché de navegación
  // recuperamos el estado del dibujo.
  window.addEventListener(
    'pageshow',
    () => {
      if (!ready) return;

      updateTarget();

      last = 0;
      lastFrame = 0;

      const rect = track.getBoundingClientRect();

      heroVisible =
        rect.bottom > 0 &&
        rect.top < innerHeight;

      if (heroVisible) {
        scheduleFrame();
      }
    }
  );

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================

  async function init() {
    if (initialized) return;

    initialized = true;

    try {
      const response = await fetch(
        './assets/penguin.txt',
        { cache: 'no-cache' }
      );

      if (!response.ok) {
        throw new Error(
          'No se encontró assets/penguin.txt'
        );
      }

      raw = await response.text();

      // Evita iniciar con dimensiones cero.
      if (
        !scene.clientWidth ||
        !scene.clientHeight
      ) {
        await new Promise(resolve =>
          requestAnimationFrame(resolve)
        );
      }

      layout(true);

      if (!W || !H) {
        throw new Error(
          'El hero no tiene dimensiones válidas.'
        );
      }

      ready = true;
      introStart = performance.now();

      updateTarget();

      const rect = track.getBoundingClientRect();

      heroVisible =
        rect.bottom > 0 &&
        rect.top < innerHeight;

      // Forzamos un primer dibujo inmediato.
      // No esperamos a que IntersectionObserver
      // notifique el estado inicial.
      if (heroVisible) {
        draw(performance.now());
      }
    } catch (error) {
      console.error(
        'PenguSpeak: error al inicializar el hero',
        error
      );

      const message = document.createElement('p');

      message.className = 'error';

      message.textContent =
        'No se pudo cargar la animación. ' +
        'Comprueba que assets/penguin.txt exista ' +
        'y que la página esté abierta desde el servidor.';

      scene.appendChild(message);

      unlockIntro();
    }
  }

  if (window.scrollY > 0) {
    introFinished = true;
  } else {
    lockIntro();
  }

  init();
})();