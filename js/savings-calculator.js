/* Club Hogga — Calculadora "Se Paga Sola"
   Widget autocontenido, sin dependencias. Se monta en cualquier
   <div class="savings-calculator"></div> de la página.
   Opcional: data-title y data-subtitle para personalizar el encabezado. */
(function () {
  'use strict';

  var PLAN_MONTHLY = 3990; // plan mensual (precio de entrada) = umbral honesto para "se paga sola"
  var PLAN_ANNUAL = 2990;  // plan anual: el precio por mes más bajo

  // Descuento por rubro (banda alta realista: los socios usan los mejores
  // convenios). Reales: gastronomía hasta 20%, salud/óptica hasta 30%,
  // deporte hasta 15%, familia hasta 20%.
  var CATS = [
    { icon: '🍽️', label: 'Restaurantes y cafés',              max: 500000, def: 60000, step: 10000, rate: 0.18 },
    { icon: '💊', label: 'Salud (dentista, óptica, farmacia)', max: 300000, def: 30000, step: 10000, rate: 0.15 },
    { icon: '🏋️', label: 'Deporte y gimnasio',                max: 250000, def: 30000, step: 10000, rate: 0.12 },
    { icon: '🎉', label: 'Familia y entretención',             max: 250000, def: 20000, step: 10000, rate: 0.18 }
  ];

  function clp(n) { return '$' + Math.round(n).toLocaleString('es-CL'); }

  var STYLE_ID = 'hsc-style';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = ''
      + '.hsc{background:var(--bg-surface,#fff);border:1px solid var(--border-light,#E2E8F0);'
      + 'border-radius:var(--radius-lg,20px);padding:1.75rem;max-width:620px;margin:0 auto;'
      + 'box-shadow:0 4px 6px -1px rgba(0,0,0,.08);text-align:left;}'
      + '.hsc-title{margin:0 0 .25rem;font-size:1.35rem;color:var(--text-main,#0F172A);}'
      + '.hsc-sub{margin:0 0 1.25rem;font-size:.92rem;color:var(--text-muted,#64748B);}'
      + '.hsc-row{display:block;margin-bottom:1.1rem;}'
      + '.hsc-row-top{display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;font-size:.95rem;color:var(--text-main,#0F172A);}'
      + '.hsc-ico{font-size:1.1rem;}'
      + '.hsc-label{flex:1;}'
      + '.hsc-val{font-weight:700;color:var(--primary,#0D9488);white-space:nowrap;}'
      + '.hsc-range{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:9999px;'
      + 'background:var(--border-light,#E2E8F0);outline:none;cursor:pointer;}'
      + '.hsc-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;'
      + 'border-radius:50%;background:var(--primary,#0D9488);border:3px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer;}'
      + '.hsc-range::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:var(--primary,#0D9488);'
      + 'border:3px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer;}'
      + '.hsc-result{margin-top:1.5rem;padding-top:1.25rem;border-top:1px dashed var(--border-strong,#CBD5E1);text-align:center;}'
      + '.hsc-save{font-size:1rem;color:var(--text-muted,#64748B);}'
      + '.hsc-save strong{font-size:2rem;color:var(--primary,#0D9488);display:block;line-height:1.2;margin:.15rem 0;}'
      + '.hsc-annual{font-size:.95rem;color:var(--primary,#0D9488);font-weight:600;margin:.1rem 0 .6rem;}'
      + '.hsc-verdict{font-size:.95rem;color:var(--text-main,#0F172A);margin:.5rem 0 .6rem;line-height:1.5;}'
      + '.hsc-verdict strong{color:var(--primary,#0D9488);}'
      + '.hsc-equiv{font-size:.9rem;color:var(--text-muted,#64748B);margin:0 0 1.1rem;line-height:1.5;}'
      + '.hsc-equiv strong{color:var(--primary,#0D9488);}'
      + '.hsc-cta{display:inline-block;width:100%;max-width:340px;font-size:1.05rem;padding:.85rem 1rem;}'
      + '.hsc-example{font-size:.82rem;color:var(--text-main,#0F172A);background:var(--primary-subtle,#F0FDFA);border-radius:8px;padding:.6rem .8rem;margin:1.1rem 0 0;text-align:center;line-height:1.5;}'
      + '.hsc-example strong{color:var(--primary,#0D9488);}'
      + '.hsc-note{font-size:.75rem;color:var(--text-muted,#64748B);margin:.9rem 0 0;}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  function build(mount) {
    var title = mount.getAttribute('data-title') || '¿Cuánto ahorras con Club Hogga?';
    var subtitle = mount.getAttribute('data-subtitle')
      || 'Mueve las barras según lo que gastas al mes en comercios donde Club Hogga tiene descuento.';

    var html = '<div class="hsc"><div class="hsc-head">'
      + '<h3 class="hsc-title">' + title + '</h3>'
      + '<p class="hsc-sub">' + subtitle + '</p></div><div class="hsc-rows">';

    CATS.forEach(function (c, i) {
      html += '<label class="hsc-row">'
        + '<span class="hsc-row-top"><span class="hsc-ico">' + c.icon + '</span>'
        + '<span class="hsc-label">' + c.label + '</span>'
        + '<span class="hsc-val" data-val="' + i + '">' + clp(c.def) + '</span></span>'
        + '<input class="hsc-range" type="range" min="0" max="' + c.max + '" step="' + c.step + '" '
        + 'value="' + c.def + '" data-idx="' + i + '" '
        + 'aria-label="Gasto mensual en ' + c.label + '"></label>';
    });

    html += '</div>'
      + '<p class="hsc-example">💡 Ojo: una sola cena para 4 en un comercio con 20% de descuento '
      + 'ya te ahorra <strong>~$20.000</strong> en una salida. Los buenos convenios rinden más.</p>'
      + '<div class="hsc-result">'
      + '<div class="hsc-save">Tu ahorro estimado<strong data-save>$0</strong>al mes</div>'
      + '<div class="hsc-annual" data-annual></div>'
      + '<div class="hsc-verdict" data-verdict></div>'
      + '<div class="hsc-equiv" data-equiv></div>'
      + '<a class="btn btn-accent hsc-cta" href="/hazte-socio/">Quiero pagar menos</a>'
      + '<p class="hsc-note">Estimación asumiendo que aprovechas los convenios (los descuentos van de 10% a 50% según el comercio). Tu ahorro real depende de tu uso. Plan mensual $3.990/mes; con el plan anual pagas $2.990/mes.</p>'
      + '</div></div>';

    mount.innerHTML = html;

    var ranges = mount.querySelectorAll('.hsc-range');
    var vals = mount.querySelectorAll('[data-val]');
    var saveEl = mount.querySelector('[data-save]');
    var verdictEl = mount.querySelector('[data-verdict]');
    var equivEl = mount.querySelector('[data-equiv]');
    var annualEl = mount.querySelector('[data-annual]');

    function recompute() {
      var total = 0;
      ranges.forEach(function (r) {
        var spend = parseInt(r.value, 10) || 0;
        var idx = parseInt(r.getAttribute('data-idx'), 10);
        vals[idx].textContent = clp(spend);
        total += spend * CATS[idx].rate;
      });
      saveEl.textContent = clp(total);
      annualEl.textContent = total > 0 ? '≈ ' + clp(total * 12) + ' al año' : '';

      var verdict;
      if (total >= PLAN_MONTHLY) {
        var veces = Math.floor(total / PLAN_MONTHLY);
        verdict = '✅ <strong>La membresía se paga sola.</strong> Ahorras ' + clp(total)
          + ' al mes y el plan mensual cuesta ' + clp(PLAN_MONTHLY);
        if (veces >= 2) verdict += ' — lo recuperas ' + veces + ' veces';
        verdict += '.';
      } else if (total > 0) {
        verdict = 'Con este uso ahorrarías ' + clp(total) + ' al mes. '
          + 'Con un poco más de uso, tu membresía (' + clp(PLAN_MONTHLY) + '/mes) ya se paga sola.';
      } else {
        verdict = 'Ajusta las barras según tu consumo para ver cuánto ahorrarías cada mes.';
      }
      verdictEl.innerHTML = verdict;

      // Transformación: qué te alcanza con lo que ahorras (≈ cafés/mes).
      equivEl.innerHTML = total >= 2800
        ? '💡 Con eso te alcanza para unos <strong>' + Math.round(total / 2800)
          + ' cafés</strong> al mes — gratis. ¿Por qué pagar de más?'
        : '';
    }

    ranges.forEach(function (r) { r.addEventListener('input', recompute); });
    recompute();
  }

  function init() {
    var mounts = document.querySelectorAll('.savings-calculator');
    if (!mounts.length) return;
    injectStyle();
    mounts.forEach(build);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
