/* Аня · 40 — движок открытки. Ванильный JS, без зависимостей. */
(function () {
  'use strict';
  var C = window.CONTENT;
  var SLIDES = C.slides;
  var TOTAL = SLIDES.length;
  var PHOTO_MS = 5400, CHAPTER_MS = 3400, VIDEO_MAX_MS = 22000;
  var FX = ['zoom', 'slide', 'iris', 'flip', 'blur', 'split', 'rise'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var intro = $('#intro'), player = $('#player'), finale = $('#finale');
  var stage = $('#stage'), progressBar = $('#progress i'), counter = $('#counter'), chapterName = $('#chapterName');
  var soundBtn = $('#soundBtn'), videoCta = $('#videoCta'), hint = $('#hint');

  /* ───── Интро: золотая пыль ───── */
  (function dust() {
    var cv = $('#dust'); if (!cv || reduce) return;
    var ctx = cv.getContext('2d'), W, H, P = [], raf;
    function size() { W = cv.width = cv.clientWidth * devicePixelRatio; H = cv.height = cv.clientHeight * devicePixelRatio; }
    size(); window.addEventListener('resize', size);
    for (var i = 0; i < 70; i++) P.push(mk(true));
    function mk(init) {
      return { x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: (Math.random() * 1.6 + .6) * devicePixelRatio,
        v: (Math.random() * .25 + .08) * devicePixelRatio, s: Math.random() * Math.PI * 2, a: Math.random() * .6 + .2, w: Math.random() * .8 + .3 };
    }
    function tick(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) {
        var p = P[i]; p.y -= p.v; p.x += Math.sin(t / 1400 + p.s) * .15 * devicePixelRatio;
        var tw = .5 + .5 * Math.sin(t / 600 * p.w + p.s);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(243,218,160,' + (p.a * tw).toFixed(3) + ')'; ctx.fill();
        if (p.y < -10) P[i] = mk(false);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    intro.addEventListener('gone', function () { cancelAnimationFrame(raf); });
  })();

  /* ───── Интро: счётчик до 40 ───── */
  (function odometer() {
    var el = $('#odo'), num = $('.intro__num');
    var start = null, D = reduce ? 1 : 2200, delay = reduce ? 0 : 1000;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min(1, (ts - start) / D);
      el.textContent = Math.round(ease(t) * 40);
      if (t < 1) requestAnimationFrame(step); else num.classList.add('pop');
    }
    setTimeout(function () { requestAnimationFrame(step); }, delay);
  })();

  /* ───── Состояние плеера ───── */
  var idx = -1, cur = null, timerStart = 0, timerDur = 0, elapsed = 0, paused = false, raf = 0;
  var soundOn = false, soundTried = false, curVideo = null, hintShown = false, finished = false;
  var cache = {};

  function words(text, cls) {
    return text.split(' ').map(function (w, i) {
      return '<span class="' + cls + '" style="--i:' + i + '">' + w + '</span>';
    }).join(' ');
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function chapterOf(i) {
    for (var k = i; k >= 0; k--) if (SLIDES[k].type === 'chapter' && SLIDES[k].num) return SLIDES[k];
    return null;
  }
  function photoFx(i) {
    var n = 0; for (var k = 0; k <= i; k++) if (SLIDES[k].type !== 'chapter') n++;
    return FX[(n - 1) % FX.length];
  }

  function mediaFor(s) {
    if (cache[s.src]) { var m = cache[s.src]; delete cache[s.src]; return m; }
    return makeMedia(s);
  }
  function makeMedia(s, light) {
    if (s.type === 'video') {
      var v = document.createElement('video');
      v.className = 'hi'; v.src = s.src; v.poster = s.poster; v.preload = light ? 'metadata' : 'auto';
      v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      v.muted = true; v.load();
      return v;
    }
    var im = new Image(); im.className = 'hi'; im.decoding = 'async'; im.src = s.src; im.alt = '';
    return im;
  }
  function warm(i) {
    for (var k = i + 1; k <= Math.min(TOTAL - 1, i + 3); k++) {
      var s = SLIDES[k]; if (s.type === 'chapter') continue;
      if (cache[s.src]) { if (cache[s.src].tagName === 'VIDEO') cache[s.src].preload = 'auto'; continue; }
      cache[s.src] = makeMedia(s);
    }
  }

  function build(s, i) {
    var el = document.createElement('div');
    if (s.type === 'chapter') {
      el.className = 'slide slide--chapter';
      el.innerHTML = '<div class="chapter"><div class="chapter__rule"></div>' +
        (s.num ? '<div class="chapter__num">' + esc(s.num) + '</div>' : '<div class="chapter__num">Аня · 40</div>') +
        '<h2 class="chapter__title">' + words(esc(s.title), 'w') + '</h2>' +
        '<p class="chapter__text">' + esc(s.text) + '</p></div>';
      return el;
    }
    el.className = 'slide' + (s.w > s.h ? ' slide--wide' : '');
    var media = document.createElement('div'); media.className = 'slide__media';
    media.style.setProperty('--focus', s.focus || '50% 45%');
    var hi = mediaFor(s);
    var lq = new Image(); lq.className = 'lq'; lq.src = s.lqip; lq.alt = '';
    media.appendChild(hi); media.appendChild(lq);
    if (s.type === 'video') { hi.classList.add('ready'); }
    else if (hi.complete && hi.naturalWidth) hi.classList.add('ready');
    else hi.addEventListener('load', function () { hi.classList.add('ready'); }, { once: true });
    el.appendChild(media);
    var shade = document.createElement('div'); shade.className = 'slide__shade'; el.appendChild(shade);
    var num = s.type === 'photo' ? String(s.num).padStart(2, '0') + ' / ' + C.photos : 'видео';
    var cap = document.createElement('div'); cap.className = 'cap';
    cap.innerHTML = '<div class="cap__num">' + num + '</div><div class="cap__line"></div>' +
      '<h2 class="cap__title">' + words(esc(s.title), 'w') + '</h2><p class="cap__text">' + esc(s.text) + '</p>';
    el.appendChild(cap);
    return el;
  }

  function setTop(i) {
    var s = SLIDES[i], ch = chapterOf(i);
    counter.textContent = s.type === 'photo' ? String(s.num).padStart(2, '0') + ' / ' + C.photos : (s.type === 'video' ? 'видео' : '');
    chapterName.textContent = ch ? ch.title : '';
  }

  function goto(i, dir) {
    if (i >= TOTAL) { finish(); return; }
    if (i < 0) i = 0;
    var s = SLIDES[i];
    var fx = s.type === 'chapter' ? 'chapter' : (s.type === 'video' ? (dir < 0 ? 'zoom' : 'iris') : photoFx(i));
    if (dir < 0 && fx !== 'chapter') fx = 'zoom';
    if (reduce) fx = 'chapter';
    var prev = cur, el = build(s, i);
    el.classList.add('in-' + fx);
    el.style.setProperty('--dur', (s.type === 'video' ? VIDEO_MAX_MS : s.type === 'chapter' ? CHAPTER_MS : PHOTO_MS) / 1000 + 's');
    stage.appendChild(el);
    cur = el; idx = i;
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-active'); }); });
    if (prev) {
      prev.classList.remove('is-active');
      prev.className = prev.className.replace(/\bin-\w+/g, '');
      prev.classList.add('out-' + fx);
      stopVideo(prev);
      setTimeout(function () { if (prev.parentNode) prev.parentNode.removeChild(prev); }, 1200);
    }
    setTop(i);
    warm(i);
    startTimer(s, el);
    if (!hintShown && s.type === 'photo') { hintShown = true; hint.classList.add('show'); setTimeout(function () { hint.classList.remove('show'); }, 4200); }
  }

  function stopVideo(el) {
    var v = el.querySelector('video'); if (v) { try { v.pause(); } catch (e) {} if (v === curVideo) curVideo = null; }
  }

  function startTimer(s, el) {
    cancelAnimationFrame(raf); elapsed = 0; paused = false; player.classList.remove('paused');
    curVideo = null; videoCta.hidden = true;
    if (s.type === 'video') {
      var v = el.querySelector('video'); curVideo = v;
      timerDur = VIDEO_MAX_MS;
      v.addEventListener('loadedmetadata', function () { if (v.duration && isFinite(v.duration)) timerDur = Math.min(VIDEO_MAX_MS, v.duration * 1000 + 250); });
      if (v.duration && isFinite(v.duration)) timerDur = Math.min(VIDEO_MAX_MS, v.duration * 1000 + 250);
      v.onended = function () { if (cur === el) goto(idx + 1, 1); };
      v.currentTime = 0;
      playVideo(v);
    } else {
      timerDur = s.type === 'chapter' ? CHAPTER_MS : PHOTO_MS;
    }
    timerStart = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function playVideo(v) {
    v.muted = !soundOn;
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      // автозапуск со звуком запрещён — играем без звука и предлагаем включить
      v.muted = true; soundOn = false; syncSound(); v.play().catch(function () {});
    });
    syncSound();
  }
  function syncSound() {
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    $('.chip__label', soundBtn).textContent = soundOn ? 'Звук вкл.' : 'Звук выкл.';
    videoCta.hidden = !(curVideo && !soundOn);
    if (curVideo && !soundOn && !soundTried) soundBtn.classList.add('attn');
  }
  function toggleSound(on) {
    soundOn = (typeof on === 'boolean') ? on : !soundOn; soundTried = true; soundBtn.classList.remove('attn');
    if (curVideo) { curVideo.muted = !soundOn; if (soundOn) curVideo.play().catch(function () {}); }
    syncSound();
  }
  soundBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleSound(); });
  videoCta.addEventListener('click', function (e) { e.stopPropagation(); toggleSound(true); });

  function tick(now) {
    if (!paused) {
      var t = elapsed + (now - timerStart);
      if (curVideo && curVideo.duration && isFinite(curVideo.duration)) t = curVideo.currentTime * 1000;
      var frac = Math.min(1, t / timerDur);
      progressBar.style.width = (((idx + frac) / TOTAL) * 100).toFixed(2) + '%';
      if (!curVideo && t >= timerDur) { goto(idx + 1, 1); return; }
      if (curVideo && t >= VIDEO_MAX_MS - 100) { goto(idx + 1, 1); return; }
    }
    raf = requestAnimationFrame(tick);
  }
  function pause() {
    if (paused) return; paused = true; elapsed += performance.now() - timerStart;
    player.classList.add('paused'); if (curVideo) curVideo.pause();
  }
  function resume() {
    if (!paused) return; paused = false; timerStart = performance.now();
    player.classList.remove('paused'); if (curVideo) curVideo.play().catch(function () {});
  }

  /* ───── Управление: тап, удержание, свайп, клавиши ───── */
  (function input() {
    var nav = $('.player__nav'), down = null, holdT = 0, held = false;
    nav.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; held = false;
      try { nav.setPointerCapture(e.pointerId); } catch (err) {}
      holdT = setTimeout(function () { held = true; pause(); }, 260);
    });
    nav.addEventListener('pointermove', function (e) {
      if (!down) return;
      if (Math.abs(e.clientX - down.x) > 12 || Math.abs(e.clientY - down.y) > 12) { clearTimeout(holdT); }
    });
    function up(e) {
      if (!down) return; clearTimeout(holdT);
      var dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t; down = null;
      if (held) { resume(); held = false; return; }
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { dx > 0 ? goto(idx - 1, -1) : goto(idx + 1, 1); return; }
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14 && dt < 400) {
        var zone = e.clientX < player.getBoundingClientRect().left + player.clientWidth * .32;
        zone ? goto(idx - 1, -1) : goto(idx + 1, 1);
      }
    }
    nav.addEventListener('pointerup', up);
    nav.addEventListener('pointercancel', function () { clearTimeout(holdT); if (held) resume(); down = null; held = false; });
    document.addEventListener('keydown', function (e) {
      if (player.hidden) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); goto(idx + 1, 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goto(idx - 1, -1); }
      else if (e.key === 'p') { paused ? resume() : pause(); }
      else if (e.key === 'm') { toggleSound(); }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && !player.hidden) pause(); });
  })();

  if (location.search.indexOf('debug') > -1) window.__go = goto;

  /* ───── Старт ───── */
  $('#start').addEventListener('click', function (e) {
    var r = e.currentTarget.getBoundingClientRect();
    intro.style.setProperty('--cx', (r.left + r.width / 2) + 'px');
    intro.style.setProperty('--cy', (r.top + r.height / 2) + 'px');
    soundOn = true; // пробуем со звуком; если браузер запретит — переключимся
    player.hidden = false;
    // разблокируем видео жестом пользователя: короткий play/pause первых роликов
    SLIDES.forEach(function (s) { if (s.type === 'video' && !cache[s.src]) cache[s.src] = makeMedia(s, true); });
    Object.keys(cache).forEach(function (k) { var m = cache[k]; if (m.tagName === 'VIDEO') { var p = m.play(); if (p && p.then) p.then(function () { m.pause(); m.currentTime = 0; }).catch(function () {}); } });
    goto(0, 1);
    intro.classList.add('leaving');
    setTimeout(function () { intro.hidden = true; intro.dispatchEvent(new Event('gone')); }, 1050);
    if (document.documentElement.requestFullscreen && window.innerWidth < 700) { document.documentElement.requestFullscreen().catch(function () {}); }
  });

  /* ───── Финал ───── */
  function finish() {
    if (finished) return; finished = true;
    cancelAnimationFrame(raf); if (curVideo) curVideo.pause();
    buildFinale();
    finale.hidden = false; document.body.classList.add('scroll');
    player.style.transition = 'opacity .9s'; player.style.opacity = '0';
    setTimeout(function () { player.hidden = true; player.style.opacity = ''; stage.innerHTML = ''; cur = null; }, 950);
    window.scrollTo(0, 0);
    confetti();
  }
  var finaleBuilt = false;
  function buildFinale() {
    if (finaleBuilt) { revealLetter(); return; } finaleBuilt = true;
    var L = $('#letter'), html = '';
    C.letter.forEach(function (p) { html += '<p>' + esc(p) + '</p>'; });
    html += '<p class="sign">' + esc(C.sign) + '</p>';
    L.innerHTML = html;
    var photos = SLIDES.filter(function (s) { return s.type === 'photo'; });
    var a = $('.marquee__row--a'), b = $('.marquee__row--b');
    function fill(row, list) { var h = ''; list.concat(list).forEach(function (s) { h += '<img src="' + s.src + '" alt="" loading="lazy">'; }); row.innerHTML = h; }
    fill(a, photos.slice(0, 20)); fill(b, photos.slice(20, 40));
    revealLetter();
    $('#again').addEventListener('click', function () {
      finished = false; finale.hidden = true; document.body.classList.remove('scroll');
      player.hidden = false; window.scrollTo(0, 0); goto(0, 1);
    });
  }
  function revealLetter() {
    var ps = document.querySelectorAll('.letter p');
    if (!('IntersectionObserver' in window)) { ps.forEach(function (p) { p.classList.add('show'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('show'); io.unobserve(en.target); } });
    }, { threshold: .25 });
    ps.forEach(function (p) { p.classList.remove('show'); io.observe(p); });
  }
  function confetti() {
    var cv = $('#confetti'); if (reduce) return;
    var ctx = cv.getContext('2d'), W = cv.width = innerWidth * devicePixelRatio, H = cv.height = innerHeight * devicePixelRatio;
    var cols = ['#e6c88a', '#f3b9c5', '#fff4d6', '#c9a45c', '#ffffff'], P = [], t0 = performance.now();
    for (var i = 0; i < 180; i++) P.push({ x: W * (.2 + Math.random() * .6), y: H * .35, vx: (Math.random() - .5) * 14 * devicePixelRatio, vy: (-Math.random() * 16 - 4) * devicePixelRatio,
      w: (Math.random() * 6 + 4) * devicePixelRatio, h: (Math.random() * 10 + 6) * devicePixelRatio, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, c: cols[i % cols.length] });
    function step(now) {
      var life = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        p.vy += .35 * devicePixelRatio; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, life - 3.2) / 1.6);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (life < 5) requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(step);
  }
})();
