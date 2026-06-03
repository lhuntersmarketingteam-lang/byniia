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
    const specs = h.specs.map(s => `<div><div class="n">${s.n}</div><div class="l">${s.l}</div></div>`).join('');
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
          <p class="sub">${h.sub}</p>
          <div class="buybox">
            <div class="specs">${specs}</div>
            <div class="priceline">
              <span class="old">${h.priceOld}</span>
              <span class="new">${h.priceNew}</span>
              <span class="cur">${h.priceUnit}</span>
            </div>
            <a href="#price" class="btn lg">${h.cta}</a>
          </div>
        </div>
      </div>
    </section>`;
  }

  function renderWhatis() {
    const w = C.whatis;
    const facts = w.facts.map((f, i) =>
      `<div class="fact reveal" style="--d:${i * 90}ms"><div class="big">${f.big}</div><div class="cap">${f.cap}</div></div>`
    ).join('');
    return `
    <section class="whatis">
      <div class="wrap">
        <div class="eyebrow center reveal">${w.eyebrow}</div>
        <h2 class="reveal" style="--d:80ms">${w.title}</h2>
        <p class="lead reveal" style="--d:160ms">${w.lead}</p>
        <div class="facts">${facts}</div>
      </div>
    </section>`;
  }

  function renderNiia() {
    const n = C.niia;
    const paras = n.paragraphs.map(p => `<p>${p}</p>`).join('');
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
    const dots = q.questions.map(() => '<i></i>').join('');
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
            <div class="diary-prog" id="qProg">${dots}</div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function renderContents() {
    const c = C.contents;
    const months = c.parts.map((p, i) => `
      <div class="month reveal" style="--d:${i * 110}ms">
        <div class="num">${p.num}</div><div class="ph">${p.ph}</div>
        <h3>${p.title}</h3>
        <ul>${li(p.items)}</ul>
      </div>`).join('');
    const blocks = c.daily.blocks.map(b => `<div class="blk"><b>${b.b}</b><span>${b.t}</span></div>`).join('');
    return `
    <section class="contents">
      <div class="wrap">
        <div class="head reveal">
          <div class="eyebrow center">${c.eyebrow}</div>
          <h2>${c.title}</h2>
          <p>${c.lead}</p>
        </div>
        <div class="months">${months}</div>
        <div class="insideblocks reveal">
          <h3>${c.daily.title}</h3>
          <div class="blockrow">${blocks}</div>
        </div>
      </div>
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
        <div class="head reveal"><h2>${g.title}</h2><p>${g.sub}</p></div>
        <div class="pages">${pages}</div>
      </div>
    </section>`;
  }

  function renderReviews() {
    const r = C.reviews;
    // Лише тексти відгуків — без імен/міст/ролей.
    const cards = r.items.map((text, i) => `
      <div class="review reveal" style="--d:${(i % 3) * 110}ms">
        <span class="mark">&ldquo;</span>
        <p>${text}</p>
      </div>`).join('');
    return `
    <section class="reviews" id="reviews">
      <div class="wrap">
        <div class="head reveal">
          <div class="eyebrow center">${r.eyebrow}</div>
          <h2>${r.title}</h2>
          <p>${r.sub}</p>
        </div>
        <div class="review-grid">${cards}</div>
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
            <p class="desc">${p.desc}</p>
            <p class="payhint">${p.payHint}</p>
          </div>
          <div class="pcard reveal" style="--d:140ms">
            <div class="what">${p.productName}</div>
            <div class="whatsub">${p.productSub}</div>
            <div class="tag"><span class="old">${p.old}</span><span class="new">${p.new}</span><span class="cur">${p.cur}</span></div>
            <div class="save">${p.save}</div>
            <ul>${li(p.includes)}</ul>
            <a href="${href}" class="btn lg" id="payBtn">${p.cta}</a>
            <div class="left">${p.leftLabel}</div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function renderFinal() {
    const f = C.final;
    return `
    <section class="final">
      <div class="wrap">
        <div class="medallion reveal">
          <h2>${f.title}</h2>
          <p>${f.text}</p>
          <a href="#price" class="btn">${f.cta}</a>
        </div>
        <p class="charity reveal">${f.charity}</p>
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

  /* --- 11. СКЛАДАННЯ СТОРІНКИ (порядок секцій тут) --- */
  function build() {
    injectThemes();
    document.body.setAttribute('data-theme', C.defaultTheme);
    applyMeta();
    initBackdrop();

    renderThemeSwitch();
    renderHeader();

    document.getElementById('app').innerHTML = [
      renderHero(),
      renderWhatis(),
      renderNiia(),
      renderQuiz(),
      renderContents(),
      renderGallery(),
      renderReviews(),
      renderReframe(),
      renderFit(),
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
  }

  build();
})();
