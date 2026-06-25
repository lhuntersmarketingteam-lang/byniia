/* =============================================================================
   BY NIIA — РЕНДЕР + ІНТЕРАКТИВ
   -----------------------------------------------------------------------------
   Читає глобальну CONTENT (з content.js) і будує всю сторінку.
   Логіка універсальна: під новий щоденник правиться лише content.js.

   Примітка про безпеку: тексти з content.js вставляються через innerHTML як
   розмітка (там навмисні <em>, <b>). content.js — довірений файл власника,
   стороннього вводу в нього не потрапляє, тож це безпечно. Якщо колись
   знадобиться рендерити недовірений ввід — додай екранування.
   ========================================================================== */
(function () {
  const C = window.CONTENT;
  if (!C) { console.error('content.js не завантажився: CONTENT не визначено'); return; }

  /* --- 1. ТЕМИ: генеруємо CSS-змінні з content.js → themes -----------------
     Кольорові ключі теми → CSS-змінні (camelCase → --kebab-case).
     cover/cloud — це шляхи до картинок, не кольори, тож їх пропускаємо. */
  const NON_VAR_KEYS = new Set(['cover', 'cloud']);
  function camelToKebab(s) { return s.replace(/[A-Z]/g, m => '-' + m.toLowerCase()); }

  function injectThemes() {
    let css = '';
    for (const [key, t] of Object.entries(C.themes)) {
      const vars = Object.entries(t)
        .filter(([k]) => !NON_VAR_KEYS.has(k))
        .map(([k, v]) => `--${camelToKebab(k)}:${v}`)
        .join(';');
      css += `[data-theme="${key}"]{${vars}}\n`;
    }
    const style = document.createElement('style');
    style.id = 'theme-vars';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* --- 2. META --- */
  function applyMeta() {
    document.title = C.meta.title;
    setMeta('name', 'description', C.meta.description);
    setMeta('property', 'og:title', C.meta.title);
    setMeta('property', 'og:description', C.meta.description);
    if (C.meta.ogImage) setMeta('property', 'og:image', C.meta.ogImage);
  }
  function setMeta(attr, name, value) {
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
    el.setAttribute('content', value);
  }

  /* --- невеликі хелпери розмітки --- */
  const li = (items) => items.map(i => `<li>${i}</li>`).join('');

  // Кожне нове речення — з нового рядка (вставляємо <br> після . ! ? …,
  // якщо далі пробіл і велика літера/лапки). Для коротких маркетингових текстів.
  const lines = (t) => String(t).replace(/([.!?…])\s+(?=[«"“А-ЯЇІЄҐA-Z])/g, '$1<br>');

  // Куди ведуть кнопки «Замовити набір»: сторінка оплати WayForPay (content.js).
  const payHref = () => (C.paymentUrl && C.paymentUrl !== '#') ? C.paymentUrl : '#';

  /* --- 3. РЕНДЕР СЕКЦІЙ ----------------------------------------------------- */

  // Перемикач тем лишився в розмітці на майбутнє, але прихований (одна тема).
  function renderThemeSwitch() {
    const mount = document.getElementById('theme-switch');
    if (!mount) return;
    if (!C.showThemeSwitch) { mount.hidden = true; return; }
    const dots = Object.entries(C.themes).map(([key, t]) =>
      `<button class="dot" style="background:${t.bg}" data-theme-key="${key}" aria-label="Тема ${key}"></button>`
    ).join('');
    mount.className = 'theme-switch';
    mount.innerHTML = `<span>Тема</span>${dots}`;
    mount.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-key]');
      if (btn) setTheme(btn.dataset.themeKey);
    });
  }

  function renderHeader() {
    document.getElementById('site-header').innerHTML = `
      <div class="logo">${C.brand.name}</div>
      <a href="#price" class="nav-cta">${C.brand.navCta}</a>`;
  }

  function renderHero() {
    const h = C.hero;
    const poster = h.videoPoster ? ` poster="${h.videoPoster}"` : '';
    return `
    <section class="hero" id="hero">
      <div class="hero-video">
        <video id="heroVid" autoplay muted loop playsinline preload="auto"${poster}>
          <source src="${h.video}" type="video/mp4">
        </video>
      </div>
      <div class="hero-fade"></div>
      <div class="hero-clouds" id="heroClouds"></div>
      <div class="wrap">
        <div class="hero-content">
          <div class="eyebrow">${h.eyebrow}</div>
          <h1>${h.title}</h1>
          <p class="sub">${lines(h.sub)}</p>
          <div class="buybox">
            <div class="hero-meta">${h.metaLine}</div>
            <div class="priceline">
              <span class="old">${h.priceOld}</span>
              <span class="new">${h.priceNew}</span>
              <span class="cur">${h.priceUnit}</span>
            </div>
            <a href="${payHref()}" target="_blank" rel="noopener" class="btn lg">${h.cta}</a>
          </div>
        </div>
      </div>
    </section>`;
  }

  function renderWhatis() {
    const w = C.whatis;
    // Закриті щоденники у 3D: показуємо праву (лицьову) частину розгортки.
    const covers = (w.covers || []).map((src, i) =>
      `<div class="wc-book wc-${i}" style="background-image:url('${src}')" role="img" aria-label="Щоденник BY NIIA"><span class="wc-pages"></span></div>`
    ).join('');
    return `
    <section class="whatis">
      <div class="wrap">
        <div class="whatis-split">
          <div class="whatis-text">
            <div class="eyebrow reveal">${w.eyebrow}</div>
            <h2 class="reveal" style="--d:80ms">${w.title}</h2>
            <p class="lead reveal" style="--d:160ms">${lines(w.lead)}</p>
            <p class="statement reveal" style="--d:240ms">${w.statement}</p>
          </div>
          ${covers ? `<div class="whatis-visual reveal" style="--d:200ms">${covers}</div>` : ''}
        </div>
      </div>
    </section>`;
  }

  function renderNiia() {
    const n = C.niia;
    const paras = n.paragraphs.map(p => `<p>${lines(p)}</p>`).join('');
    const creds = (n.credentials || []).map(c => `<span class="cred">${c}</span>`).join('');
    return `
    <section class="niia cloudbg">
      <div class="wrap">
        <div class="inner reveal">
          <div class="grid">
            <div class="portrait" style="background-image:url('${n.photo}')"></div>
            <div>
              <div class="eyebrow">${n.eyebrow}</div>
              <h2>${n.title}</h2>
              ${paras}
              ${creds ? `<div class="creds">${creds}</div>` : ''}
              <p class="pull">${n.pull}</p>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  /* ОПИТУВАЛЬНИК у форматі щоденника.
     Розмітка тут — лише «обкладинка» + порожній відкритий щоденник.
     Сторінки з питаннями/результатом малює initQuiz() динамічно у #qPage,
     щоб робити «перегортання аркуша» (клон сторінки → анімація leafTurn). */
  function renderQuiz() {
    const q = C.quiz;
    return `
    <section class="quizsection" id="quiz">
      <div class="wrap">
        <div class="quizbook reveal">
          <button type="button" class="diary-cover" id="qOpenBtn">
            <div class="dc-card">
              <span class="dc-corner tl"></span>
              <span class="dc-corner br"></span>
              <div class="dc-eyebrow">${q.coverEyebrow}</div>
              <div class="dc-title">${q.coverTitle}</div>
              <div class="dc-sub">${q.coverSub}</div>
              <span class="dc-btn">${q.openBtn}</span>
            </div>
          </button>
          <div class="diary" id="quizOpen">
            <div class="diary-book" id="qBook">
              <div class="diary-page" id="qPage"></div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function renderContents() {
    const c = C.contents;
    // кожна частина — у своєму кольорі (кольори щоденників): --part / --part-bg
    const months = c.parts.map((p, i) => {
      const vars = [
        p.color ? `--part:${p.color}` : '',
        p.tint ? `--part-bg:${p.tint}` : '',
        `--d:${i * 110}ms`,
      ].filter(Boolean).join(';');
      return `
      <div class="month reveal" style="${vars}">
        <div class="num">${p.num}</div><div class="ph">${p.ph}</div>
        <h3>${p.title}</h3>
        <ul>${li(p.items)}</ul>
      </div>`;
    }).join('');
    return `
    <section class="contents">
      <div class="wrap">
        <div class="head reveal">
          <div class="eyebrow center">${c.eyebrow}</div>
          <h2>${c.title}</h2>
          <p>${lines(c.lead)}</p>
        </div>
        <div class="months">${months}</div>
      </div>
      <img class="deco-leaf r" src="assets/pages/page-weekstart.jpg" alt="" aria-hidden="true" loading="lazy">
      <img class="deco-leaf bl" src="assets/pages/page-checkup.jpg" alt="" aria-hidden="true" loading="lazy">
    </section>`;
  }

  function renderGallery() {
    const g = C.gallery;
    const pages = g.pages.map((p, i) => `
      <div class="pg reveal" style="--d:${i * 110}ms">
        <img src="${p.src}" alt="${p.b}" loading="lazy">
        <div class="cap"><b>${p.b}</b>${p.c}</div>
      </div>`).join('');
    return `
    <section class="gallery cloudbg">
      <div class="wrap">
        <div class="head reveal"><h2>${g.title}</h2><p>${lines(g.sub)}</p></div>
        <div class="pages">${pages}</div>
      </div>
    </section>`;
  }

  function renderReviews() {
    const r = C.reviews;
    // На десктопі спершу видно перші 3; решта (.extra) розкриваються кнопкою.
    // На мобільному всі відгуки доступні в горизонтальному скролі.
    // м'які кольори щоденників, що чергуються по картках
    const rc = ['#46686a', '#a36670', '#7b6e9c'];
    const cards = r.items.map((it, i) => `
      <div class="review reveal${i >= 3 ? ' extra' : ''}" style="--d:${(i % 3) * 110}ms;--rc:${rc[i % 3]}">
        <span class="mark">&ldquo;</span>
        <p>${it.text}</p>
        <div class="who"><b>${it.name}, ${it.age}</b><span>${it.issue}</span></div>
      </div>`).join('');
    const hasMore = r.items.length > 3;
    const moreBtn = hasMore
      ? `<button type="button" class="reviews-more btn ghost" id="reviewsMore">${r.moreBtn || 'Показати ще'}</button>`
      : '';
    return `
    <section class="reviews" id="reviews">
      <div class="wrap">
        <div class="head reveal">
          <div class="eyebrow center">${r.eyebrow}</div>
          <h2>${r.title}</h2>
          <p>${r.sub}</p>
        </div>
        <div class="review-grid">${cards}</div>
        ${moreBtn}
      </div>
    </section>`;
  }

  function renderReframe() {
    const first = C.reframe.quotes[0] || '';
    return `
    <section class="reframe cloudbg">
      <div class="wrap"><div class="inner"><p class="rf-quote" id="rfQuote">${first}</p></div></div>
    </section>`;
  }

  function renderFit() {
    const f = C.fit;
    return `
    <section class="fit">
      <div class="wrap">
        <h2 class="reveal">${f.title}</h2>
        <div class="cols">
          <div class="fitcol yes reveal"><h3>${f.yes.title}</h3><ul>${li(f.yes.items)}</ul></div>
          <div class="fitcol no reveal" style="--d:120ms"><h3>${f.no.title}</h3><ul>${li(f.no.items)}</ul></div>
        </div>
      </div>
    </section>`;
  }

  function renderPrice() {
    const p = C.price;
    // Кнопка оплати веде на WayForPay (content.js → paymentUrl).
    // Поки там заглушка '#' — кнопка нікуди не веде; підстав реальний URL у content.js.
    const href = (C.paymentUrl && C.paymentUrl !== '#') ? C.paymentUrl : '#';
    return `
    <section class="price cloudbg" id="price">
      <div class="wrap">
        <div class="price-split">
          <div class="price-intro reveal">
            <div class="badge">${p.badge}</div>
            <h2>${p.title}</h2>
            <p class="desc">${lines(p.desc)}</p>
            ${p.charityNote ? `<p class="charity-mini">${p.charityNote}</p>` : ''}
            <p class="payhint">${p.payHint}</p>
          </div>
          <div class="pcard reveal" style="--d:140ms">
            <div class="what">${p.productName}</div>
            <div class="whatsub">${p.productSub}</div>
            <div class="tag"><span class="old">${p.old}</span><span class="new">${p.new}</span><span class="cur">${p.cur}</span></div>
            <div class="save">${p.save}</div>
            <ul>${li(p.includes)}</ul>
            <a href="${href}" target="_blank" rel="noopener" class="btn lg" id="payBtn">${p.cta}</a>
            <div class="left">${p.leftLabel}</div>
          </div>
        </div>
      </div>
    </section>`;
  }

  // Фінал: лише коротка нота про підтримку жінок (медальйон прибрано).
  function renderFinal() {
    const f = C.final;
    if (!f || !f.charity) return '';
    return `
    <section class="final">
      <div class="wrap">
        <p class="charity reveal">${f.charity}</p>
      </div>
    </section>`;
  }

  // Окрема смуга з кнопкою «Замовити набір» — щоб точок замовлення було більше.
  function renderCtaBand() {
    return `
    <section class="ctaband">
      <div class="wrap">
        <a href="${payHref()}" target="_blank" rel="noopener" class="btn lg">${C.hero.cta}</a>
      </div>
    </section>`;
  }

  function renderFooter() {
    const f = C.footer;
    const ig = C.brand.instagram
      ? `<a class="f-ig" href="${C.brand.instagram}" target="_blank" rel="noopener noreferrer">${C.brand.instagramHandle || 'Instagram'}</a>`
      : '';
    document.getElementById('site-footer').innerHTML =
      `<div class="fl">${f.line1}</div><div class="f-sub">${f.line2}</div>${ig}`;
  }

  /* --- 4. БЕЗПЕРЕРВНИЙ ФОН + хмарні секції за поточною темою --- */
  function initBackdrop() {
    // Фіксований градієнтний фон, по якому «течуть» світлі секції.
    if (!document.querySelector('.bg-mist')) {
      const mist = document.createElement('div');
      mist.className = 'bg-mist';
      document.body.insertBefore(mist, document.body.firstChild);
    }
    // Хмарну текстуру для .bg-mist::after не можна задати інлайном (псевдоелемент),
    // тому інжектимо правило.
    const cloud = C.themes[C.defaultTheme].cloud;
    let st = document.getElementById('mist-cloud');
    if (!st) { st = document.createElement('style'); st.id = 'mist-cloud'; document.head.appendChild(st); }
    st.textContent = `.bg-mist::after{background-image:url('${cloud}')}`;
  }

  function applyClouds(themeKey) {
    const cloud = C.themes[themeKey].cloud;
    document.querySelectorAll('.cloudbg').forEach(s => { s.style.backgroundImage = `url('${cloud}')`; });
    const heroClouds = document.getElementById('heroClouds');
    if (heroClouds) heroClouds.style.backgroundImage = `url('${cloud}')`;
  }

  /* --- 5. ПЕРЕМИКАННЯ ТЕМИ (лишилось на майбутнє; зараз тема одна) --- */
  function setTheme(themeKey) {
    if (!C.themes[themeKey]) return;
    document.body.setAttribute('data-theme', themeKey);
    applyClouds(themeKey);
  }

  /* --- 6. ВІДЕО: явний play() (деякі браузери блокують autoplay) --- */
  function initVideo() {
    const vid = document.getElementById('heroVid');
    if (!vid) return;
    const tryPlay = () => { const p = vid.play(); if (p) p.catch(() => {}); };
    vid.addEventListener('loadeddata', tryPlay);
    setTimeout(tryPlay, 500); // нудж для iOS Safari

    // ПРОДУКТИВНІСТЬ: відео декодується навіть коли його не видно — це головна
    // причина лагів при скролі на мобільному. Паузимо, щойно герой іде з екрана.
    const hero = document.getElementById('hero');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver((ents) => {
        if (ents[0].isIntersecting) tryPlay(); else vid.pause();
      }, { threshold: 0.01 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) vid.pause(); else tryPlay();
    });
  }

  /* --- 7. ШАПКА на скролі --- */
  function initHeaderScroll() {
    const header = document.getElementById('site-header');
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 60);
    });
  }

  /* --- 8. ОПИТУВАЛЬНИК-ЩОДЕННИК -------------------------------------------
     Одна видима сторінка (#qPage). При переході — клонуємо її як «аркуш»
     (.diary-leaf), він перегортається (CSS-анімація leafTurn), а під ним
     уже новий зміст із плавним проявленням. Після 3-го питання гортаємо
     на сторінку з персональною відповіддю. */
  function initQuiz() {
    const q = C.quiz;
    const openBtn = document.getElementById('qOpenBtn');
    const diary = document.getElementById('quizOpen');
    const book = document.getElementById('qBook');
    const page = document.getElementById('qPage');
    const dots = Array.from(document.querySelectorAll('#qProg i'));
    if (!openBtn || !diary || !book || !page) return;

    const answers = {};
    const last = q.questions.length - 1;

    function questionHTML(i) {
      const item = q.questions[i];
      const opts = item.opts.map(o =>
        `<button type="button" class="q-opt" data-step="${i}" data-choice="${o.id}">${o.text}</button>`
      ).join('');
      return `
        <div class="q-label">${q.questionLabel} ${item.num}</div>
        <div class="q-q">${item.q}</div>
        <div class="q-opts">${opts}</div>`;
    }

    function resultHTML(winner) {
      const r = q.results[winner];
      return `
        <div class="q-result">
          <span class="q-badge">${q.resultBadge}</span>
          <h3>${r.title}</h3>
          <p class="q-rtext">${r.why}</p>
          <p class="q-rtext">${r.how}</p>
          <div class="q-actions">
            <a href="#price" class="btn">${q.cta}</a>
            <button type="button" class="btn ghost" id="qRestart">${q.restart}</button>
          </div>
        </div>`;
    }

    function updateProg(idx) {
      dots.forEach((d, i) => {
        d.classList.remove('active', 'done');
        if (idx === 'result' || i < idx) d.classList.add('done');
        else if (i === idx) d.classList.add('active');
      });
    }

    // Перегортання: клон поточної сторінки лягає згори й анімується,
    // новий зміст з'являється під ним. animate=false — для першого відкриття.
    function setPage(html, progIdx, animate) {
      if (animate) {
        const leaf = document.createElement('div');
        leaf.className = 'diary-leaf';
        leaf.innerHTML = page.innerHTML;
        book.appendChild(leaf);
        const removeLeaf = () => leaf.remove();
        leaf.addEventListener('animationend', removeLeaf);
        setTimeout(removeLeaf, 950); // фолбек, якщо анімації вимкнені
      }
      page.classList.remove('q-enter');
      void page.offsetWidth; // рестарт CSS-анімації появи
      page.innerHTML = html;
      page.classList.add('q-enter');
      updateProg(progIdx);
    }

    openBtn.addEventListener('click', () => {
      openBtn.style.display = 'none';
      diary.classList.add('show');
      setPage(questionHTML(0), 0, false);
      diary.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // делегування: вибір варіанта й рестарт (результат малюється динамічно)
    book.addEventListener('click', (e) => {
      const opt = e.target.closest('.q-opt');
      if (opt) {
        const step = Number(opt.dataset.step);
        answers[step] = opt.dataset.choice;
        page.querySelectorAll('.q-opt').forEach(b => b.classList.remove('selected'));
        opt.classList.add('selected');
        setTimeout(() => {
          if (step < last) {
            setPage(questionHTML(step + 1), step + 1, true);
          } else {
            const counts = {};
            Object.values(answers).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
            const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
            setPage(resultHTML(winner), 'result', true);
          }
        }, 430);
        return;
      }
      if (e.target.closest('#qRestart')) {
        for (const k in answers) delete answers[k];
        setPage(questionHTML(0), 0, true);
      }
    });
  }

  /* --- 9. ПЕРЕВЕРТАННЯ: цитати чергуються з плавним проявленням --- */
  function initReframe() {
    const el = document.getElementById('rfQuote');
    const quotes = (C.reframe && C.reframe.quotes) || [];
    if (!el || quotes.length < 2) return;
    let i = 0;
    setInterval(() => {
      el.style.opacity = '0';
      setTimeout(() => {
        i = (i + 1) % quotes.length;
        el.textContent = quotes[i];
        el.style.opacity = '1';
      }, 700); // збігається з transition opacity .7s у CSS
    }, C.reframe.rotateMs || 5500);
  }

  /* --- 10. ПРОЯВЛЕННЯ ПРИ СКРОЛІ --- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
  }

  /* --- 11. М'ЯКИЙ АВТО-СКРОЛ ГОРИЗОНТАЛЬНИХ СТРІЧОК (тільки мобільний) ---
     Стрічки повільно рухаються самі; коли людина тапає/тягне — рух
     зупиняється й відновлюється через паузу. Без snap, щоб не «дьоргалося». */
  function initHScroll() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rails = document.querySelectorAll('.months, .pages, .review-grid, .fit .cols');
    rails.forEach((rail) => {
      let paused = false;
      let visible = true;          // стрічка у вʼюпорті?
      let resumeTimer = null;
      let rafId = null;
      const SPEED = 0.45;          // px за кадр — повільний, спокійний рух в один бік

      // рухаємо лише коли стрічка реально горизонтальна (тобто на мобільному).
      // Без прив'язки до брейкпойнта — самоадаптується при ресайзі/повороті.
      const scrollable = () => (rail.scrollWidth - rail.clientWidth) > 4;
      // активний рух лише коли видно, не на паузі, вкладка активна й є куди їхати
      const active = () => visible && !paused && !document.hidden && scrollable();

      function step() {
        rafId = null;
        if (active()) {
          const max = rail.scrollWidth - rail.clientWidth;
          // повзе вправо й зупиняється на останній картці (без відкату назад)
          if (rail.scrollLeft < max - 0.5) {
            rail.scrollLeft = Math.min(rail.scrollLeft + SPEED, max);
            schedule();          // продовжуємо лише поки реально рухаємось
            return;
          }
        }
        // інакше цикл засинає; прокинеться через kick() (скрол у вʼюпорт/повернення вкладки)
      }
      // запускаємо кадр лише якщо ще не запланований — без дубльованих циклів
      function schedule() { if (rafId == null) rafId = requestAnimationFrame(step); }
      const kick = () => { if (active()) schedule(); };

      // призупиняємо, коли людина торкається картки (читає), і відновлюємо згодом
      function pause() {
        paused = true;
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => { paused = false; kick(); }, 3200);
      }
      ['pointerdown', 'touchstart', 'wheel'].forEach((ev) =>
        rail.addEventListener(ev, pause, { passive: true })
      );
      // рухаємо тільки те, що на екрані — поза екраном цикл повністю спить
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((ents) => {
          visible = ents[0].isIntersecting;
          kick();
        }, { threshold: 0 }).observe(rail);
      }
      document.addEventListener('visibilitychange', kick);
      kick();
    });
  }

  /* --- 12. ВІДГУКИ: «показати ще» (десктоп) — розкриває решту карток --- */
  function initReviewsMore() {
    const btn = document.getElementById('reviewsMore');
    const grid = document.querySelector('.review-grid');
    if (!btn || !grid) return;
    btn.addEventListener('click', () => {
      grid.classList.add('show-all');
      btn.classList.add('hidden');
    });
  }

  /* --- 13. СКЛАДАННЯ СТОРІНКИ (порядок секцій тут) --- */
  function build() {
    injectThemes();
    document.body.setAttribute('data-theme', C.defaultTheme);
    applyMeta();
    initBackdrop();

    renderThemeSwitch();
    renderHeader();

    // Порядок секцій: хіро → що це → інтерактив → що всередині → подивись →
    // це не для всіх → що кажуть дівчата → про Нію → замовити.
    document.getElementById('app').innerHTML = [
      renderHero(),
      renderWhatis(),
      renderQuiz(),
      renderContents(),
      renderGallery(),
      renderCtaBand(),
      renderReframe(),
      renderFit(),
      renderReviews(),
      renderNiia(),
      renderPrice(),
      renderFinal(),
    ].join('');

    renderFooter();

    applyClouds(C.defaultTheme);
    initVideo();
    initHeaderScroll();
    initQuiz();
    initReframe();
    initReveal();
    initHScroll();
    initReviewsMore();
  }

  build();
})();
