/* =========================================================
   Prof. Rodrigo Campos — scripts
   1. Ano no rodapé e barra superior
   2. Entrada do nome no hero
   3. Topologia de rede animada (canvas)
   ========================================================= */

(function () {
  "use strict";

  var reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. rodapé e barra superior ---------- */

  document.getElementById("ano").textContent = new Date().getFullYear();

  var topbar = document.querySelector(".topbar");
  function marcarRolagem() {
    topbar.classList.toggle("scrolled", window.scrollY > 10);
  }
  window.addEventListener("scroll", marcarRolagem, { passive: true });
  marcarRolagem();

  // destaca no menu a seção visível
  var linksMenu = document.querySelectorAll(".topbar nav a");
  if ("IntersectionObserver" in window) {
    var obsSecoes = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        linksMenu.forEach(function (a) {
          a.classList.toggle("ativo", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main .section").forEach(function (s) { obsSecoes.observe(s); });
  }

  /* ---------- 2. entrada do nome no hero ---------- */

  var hero = document.querySelector(".hero");
  setTimeout(function () { hero.classList.add("pronto"); }, reduzMovimento ? 0 : 300);

  /* ---------- 3. topologia de rede ---------- */

  var canvas = document.getElementById("topologia");
  var ctx = canvas.getContext("2d");
  var cores = {
    linha: "rgba(92, 225, 230, 0.16)",
    no: "#5CE1E6",
    host: "rgba(142, 166, 190, 0.85)",
    pacote: ["#5CE1E6", "#5CE1E6", "#5CE1E6", "#5BDB95", "#FFB547"]
  };

  var nos = [];      // {x, y, tipo, vizinhos: []}
  var enlaces = [];  // [a, b]
  var pacotes = [];  // {rota: [indices], seg, t, cor, vel}
  var largura = 0, altura = 0, dpr = 1;
  var rodando = false, ultimoQuadro = 0, proximoPacote = 0;

  // gerador pseudoaleatório com semente, para o desenho ser sempre o mesmo
  function aleatorio(semente) {
    return function () {
      semente = (semente * 16807) % 2147483647;
      return (semente - 1) / 2147483646;
    };
  }

  function montarTopologia() {
    nos = []; enlaces = [];
    var rnd = aleatorio(42);
    var estreito = largura < 860;

    // núcleo à direita (no celular, mais ao centro)
    var cx = largura * (estreito ? 0.62 : 0.7);
    var cy = altura * (estreito ? 0.2 : 0.5);
    var escala = Math.min(largura, altura) * (estreito ? 0.42 : 0.38);

    function adicionar(x, y, tipo) {
      nos.push({ x: x, y: y, tipo: tipo, vizinhos: [] });
      return nos.length - 1;
    }
    function ligar(a, b) {
      enlaces.push([a, b]);
      nos[a].vizinhos.push(b);
      nos[b].vizinhos.push(a);
    }

    var nucleo = adicionar(cx, cy, "nucleo");

    // camada de distribuição
    var nDist = 5;
    var dist = [];
    for (var i = 0; i < nDist; i++) {
      var ang = (i / nDist) * Math.PI * 2 - Math.PI / 2 + (rnd() - 0.5) * 0.4;
      var r = escala * (0.5 + rnd() * 0.12);
      var d = adicionar(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, "switch");
      dist.push({ idx: d, ang: ang });
      ligar(nucleo, d);
    }
    // anel entre switches (redundância)
    for (i = 0; i < nDist; i++) ligar(dist[i].idx, dist[(i + 1) % nDist].idx);

    // camada de acesso: hosts em leque
    dist.forEach(function (sw) {
      var n = 3 + Math.floor(rnd() * 3);
      for (var k = 0; k < n; k++) {
        var abertura = 0.9;
        var a2 = sw.ang + (k / (n - 1) - 0.5) * abertura + (rnd() - 0.5) * 0.15;
        var r2 = escala * (1 + rnd() * 0.35);
        var h = adicionar(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2, "host");
        ligar(sw.idx, h);
      }
    });

    // pontos distantes, como enlaces de longa distância
    for (i = 0; i < 4; i++) {
      var a3 = rnd() * Math.PI * 2;
      var r3 = escala * (1.6 + rnd() * 0.5);
      var remoto = adicionar(cx + Math.cos(a3) * r3, cy + Math.sin(a3) * r3, "remoto");
      ligar(nucleo, remoto);
    }
  }

  // caminho mais curto (BFS) entre dois nós
  function rota(origem, destino) {
    var anterior = {}; anterior[origem] = -1;
    var fila = [origem];
    while (fila.length) {
      var atual = fila.shift();
      if (atual === destino) break;
      nos[atual].vizinhos.forEach(function (v) {
        if (!(v in anterior)) { anterior[v] = atual; fila.push(v); }
      });
    }
    var caminho = [];
    for (var n = destino; n !== -1 && n !== undefined; n = anterior[n]) caminho.unshift(n);
    return caminho;
  }

  function novoPacote() {
    var finais = [];
    nos.forEach(function (n, i) { if (n.tipo === "host" || n.tipo === "remoto") finais.push(i); });
    var a = finais[Math.floor(Math.random() * finais.length)];
    var b = finais[Math.floor(Math.random() * finais.length)];
    if (a === b) return;
    pacotes.push({
      rota: rota(a, b),
      seg: 0,
      t: 0,
      cor: cores.pacote[Math.floor(Math.random() * cores.pacote.length)],
      vel: 160 + Math.random() * 90 // pixels por segundo
    });
  }

  function desenharRede() {
    ctx.lineWidth = 1;
    ctx.strokeStyle = cores.linha;
    ctx.beginPath();
    enlaces.forEach(function (e) {
      ctx.moveTo(nos[e[0]].x, nos[e[0]].y);
      ctx.lineTo(nos[e[1]].x, nos[e[1]].y);
    });
    ctx.stroke();

    nos.forEach(function (n) {
      if (n.tipo === "nucleo") {
        ctx.strokeStyle = cores.no;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, 11, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = cores.no;
        ctx.beginPath(); ctx.arc(n.x, n.y, 4, 0, Math.PI * 2); ctx.fill();
      } else if (n.tipo === "switch") {
        ctx.fillStyle = "#0A1A2B";
        ctx.strokeStyle = cores.no;
        ctx.lineWidth = 1.5;
        ctx.fillRect(n.x - 6, n.y - 6, 12, 12);
        ctx.strokeRect(n.x - 6, n.y - 6, 12, 12);
      } else {
        ctx.fillStyle = cores.host;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.tipo === "remoto" ? 2 : 3, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  function desenharPacotes(dt) {
    for (var i = pacotes.length - 1; i >= 0; i--) {
      var p = pacotes[i];
      var a = nos[p.rota[p.seg]], b = nos[p.rota[p.seg + 1]];
      if (!b) { pacotes.splice(i, 1); continue; }
      var comp = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      p.t += (p.vel * dt) / comp;
      if (p.t >= 1) {
        p.seg++; p.t = 0;
        if (p.seg >= p.rota.length - 1) { pacotes.splice(i, 1); continue; }
        a = nos[p.rota[p.seg]]; b = nos[p.rota[p.seg + 1]];
      }
      var x = a.x + (b.x - a.x) * p.t;
      var y = a.y + (b.y - a.y) * p.t;
      ctx.fillStyle = p.cor;
      ctx.shadowColor = p.cor;
      ctx.shadowBlur = 10;
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      ctx.shadowBlur = 0;
    }
  }

  function quadro(agora) {
    if (!rodando) return;
    var dt = Math.min((agora - ultimoQuadro) / 1000, 0.05);
    ultimoQuadro = agora;
    if (agora > proximoPacote && pacotes.length < 28) {
      novoPacote();
      proximoPacote = agora + 180 + Math.random() * 260;
    }
    ctx.clearRect(0, 0, largura, altura);
    desenharRede();
    desenharPacotes(dt);
    requestAnimationFrame(quadro);
  }

  function iniciar() {
    if (rodando || reduzMovimento) return;
    rodando = true;
    ultimoQuadro = performance.now();
    requestAnimationFrame(quadro);
  }
  function parar() { rodando = false; }

  function redimensionar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    largura = canvas.clientWidth;
    altura = canvas.clientHeight;
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    montarTopologia();
    pacotes = [];
    ctx.clearRect(0, 0, largura, altura);
    desenharRede(); // desenho estático (usado também com movimento reduzido)
  }

  var espera;
  window.addEventListener("resize", function () {
    clearTimeout(espera);
    espera = setTimeout(redimensionar, 150);
  });
  redimensionar();

  // só anima quando o hero está visível e a aba está aberta
  var heroVisivel = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      heroVisivel = e[0].isIntersecting;
      heroVisivel && !document.hidden ? iniciar() : parar();
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () {
    document.hidden || !heroVisivel ? parar() : iniciar();
  });
  iniciar();
})();
